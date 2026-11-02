const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,63}$/;
const FILE_PATTERN = /^[a-z0-9][a-z0-9._-]{2,120}$/i;
const MAX_PROJECT_BYTES = 2 * 1024 * 1024;
const IMAGE_LIMIT = 8 * 1024 * 1024;
const AUDIO_LIMIT = 25 * 1024 * 1024;

function corsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim()).filter(Boolean);
  const headers = {
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "Content-Type,Authorization,X-Studio-Token,X-Filename",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
  if (allowed.includes(origin)) headers["access-control-allow-origin"] = origin;
  return headers;
}

function response(request, env, body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders(request, env), ...extra },
  });
}

function error(request, env, message, status = 400) {
  return response(request, env, { error: message }, status);
}

function safeId(value) {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function equalSecret(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function digest(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function adminAuthorized(request, env) {
  const expected = env.ADMIN_TOKEN;
  const supplied = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return Boolean(expected && supplied && equalSecret(supplied, expected));
}

async function studioAuthorized(request, env, id) {
  const supplied = request.headers.get("x-studio-token") || "";
  if (!supplied) return false;
  const expected = await env.CRUSH_NOTE_KV.get("studio-token:" + id);
  if (!expected) return false;
  return equalSecret(await digest(supplied), expected);
}

async function readJson(request, maxBytes = MAX_PROJECT_BYTES) {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error("Request body is too large.");
  return JSON.parse(text);
}

function validateProject(project) {
  if (!project || typeof project !== "object" || Array.isArray(project)) return false;
  if (!["id", "en"].includes(project.locale)) return false;
  if (!["classic", "strawberry", "matcha", "blue"].includes(project.theme)) return false;
  for (const key of ["recipient", "sender"]) if (typeof project[key] !== "string") return false;
  for (const key of ["puzzle", "cover", "memory", "reasons", "letter", "question", "music"]) {
    if (!project[key] || typeof project[key] !== "object") return false;
  }
  return true;
}

async function projectMeta(env, id) {
  return env.CRUSH_NOTE_KV.get("project-meta:" + id, "json");
}

function adminIdFromPath(pathname, suffix) {
  const match = pathname.match(new RegExp("^/api/admin/projects/([^/]+)/" + suffix + "$"));
  return match && match[1] || "";
}

function studioIdFromPath(pathname) {
  const match = pathname.match(/^\/api\/studio\/projects\/([^/]+)$/);
  return match && match[1] || "";
}

function mediaStudioIdFromPath(pathname) {
  const match = pathname.match(/^\/api\/studio\/projects\/([^/]+)\/media$/);
  return match && match[1] || "";
}

async function handle(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  if (method === "GET" && pathname === "/health") {
    return response(request, env, {
      ok: true,
      service: "crush-note-api",
      kv: Boolean(env.CRUSH_NOTE_KV),
      r2: Boolean(env.MEDIA),
      mode: env.ENVIRONMENT || "local-or-production",
    });
  }

  if (method === "GET" && pathname === "/api/admin/projects") {
    if (!adminAuthorized(request, env)) return error(request, env, "Admin token tidak valid.", 401);
    const listed = await env.CRUSH_NOTE_KV.list({ prefix: "project-meta:", limit: 1000 });
    const projects = await Promise.all(listed.keys.map((key) => env.CRUSH_NOTE_KV.get(key.name, "json")));
    projects.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    return response(request, env, { projects: projects.filter(Boolean) });
  }

  const deleteProjectId = pathname.match(/^\/api\/admin\/projects\/([^/]+)$/);
  if (method === "DELETE" && deleteProjectId) {
    if (!adminAuthorized(request, env)) return error(request, env, "Admin token tidak valid.", 401);
    const id = deleteProjectId[1];
    if (!safeId(id)) return error(request, env, "Project tidak ditemukan.", 404);
    const meta = await projectMeta(env, id);
    if (!meta) return error(request, env, "Project tidak ditemukan.", 404);

    if (env.MEDIA) {
      let cursor;
      do {
        const page = await env.MEDIA.list({ prefix: "crush-note/" + id + "/", limit: 1000, cursor });
        if (page.objects.length) await env.MEDIA.delete(page.objects.map((object) => object.key));
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
    }

    await Promise.all([
      env.CRUSH_NOTE_KV.delete("project-meta:" + id),
      env.CRUSH_NOTE_KV.delete("project-draft:" + id),
      env.CRUSH_NOTE_KV.delete("project-published:" + id),
      env.CRUSH_NOTE_KV.delete("studio-token:" + id),
    ]);
    return response(request, env, { ok: true, deletedId: id });
  }

  if (method === "POST" && pathname === "/api/admin/projects") {
    if (!adminAuthorized(request, env)) return error(request, env, "Admin token tidak valid.", 401);
    let body;
    try { body = await readJson(request); } catch (cause) { return error(request, env, cause.message || "JSON tidak valid."); }
    if (!validateProject(body.project)) return error(request, env, "Data gift belum lengkap atau formatnya tidak valid.");
    const id = "crush-note-" + crypto.randomUUID().slice(0, 8);
    const token = randomToken();
    const now = new Date().toISOString();
    const meta = { id, status: "draft", createdAt: now, updatedAt: now, publishedAt: null };
    const project = { ...body.project, id };
    await Promise.all([
      env.CRUSH_NOTE_KV.put("project-meta:" + id, JSON.stringify(meta)),
      env.CRUSH_NOTE_KV.put("project-draft:" + id, JSON.stringify(project)),
      digest(token).then((hash) => env.CRUSH_NOTE_KV.put("studio-token:" + id, hash)),
    ]);
    return response(request, env, { project: meta, studioToken: token });
  }

  const accessId = adminIdFromPath(pathname, "access");
  if (method === "POST" && accessId) {
    if (!adminAuthorized(request, env)) return error(request, env, "Admin token tidak valid.", 401);
    if (!safeId(accessId) || !(await projectMeta(env, accessId))) return error(request, env, "Project tidak ditemukan.", 404);
    const token = randomToken();
    await env.CRUSH_NOTE_KV.put("studio-token:" + accessId, await digest(token));
    return response(request, env, { studioToken: token });
  }

  const mediaId = mediaStudioIdFromPath(pathname);
  if (method === "POST" && mediaId) {
    if (!safeId(mediaId) || !(await studioAuthorized(request, env, mediaId))) return error(request, env, "Akses Studio tidak valid.", 401);
    if (!env.MEDIA) return error(request, env, "R2 media binding belum tersedia.", 503);
    const contentType = (request.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const extensionByType = {
      "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png",
      "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a",
    };
    const extension = extensionByType[contentType];
    if (!extension) return error(request, env, "Format media belum didukung.");
    const max = contentType.startsWith("image/") ? IMAGE_LIMIT : AUDIO_LIMIT;
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > max) return error(request, env, "Ukuran file melewati batas yang diizinkan.");
    const filename = Date.now() + "-" + crypto.randomUUID().slice(0, 8) + "." + extension;
    const key = "crush-note/" + mediaId + "/" + filename;
    await env.MEDIA.put(key, bytes, {
      httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { projectId: mediaId, product: "crush-note" },
    });
    const publicOrigin = (env.MEDIA_PUBLIC_ORIGIN || url.origin).replace(/\/$/, "");
    return response(request, env, { url: publicOrigin + "/media/" + key, key }, 201);
  }

  const mediaMatch = pathname.match(/^\/media\/crush-note\/([^/]+)\/([^/]+)$/);
  if (method === "GET" && mediaMatch) {
    const id = mediaMatch[1];
    const filename = mediaMatch[2];
    if (!safeId(id) || !FILE_PATTERN.test(filename) || !env.MEDIA) return error(request, env, "Media tidak ditemukan.", 404);
    const object = await env.MEDIA.get("crush-note/" + id + "/" + filename);
    if (!object) return error(request, env, "Media tidak ditemukan.", 404);
    const headers = new Headers(corsHeaders(request, env));
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    return new Response(object.body, { headers });
  }

  const studioId = studioIdFromPath(pathname);
  if (studioId && ["GET", "PUT"].includes(method)) {
    if (!safeId(studioId) || !(await studioAuthorized(request, env, studioId))) return error(request, env, "Akses Studio tidak valid.", 401);
    const meta = await projectMeta(env, studioId);
    if (!meta) return error(request, env, "Project tidak ditemukan.", 404);
    if (method === "GET") {
      const project = await env.CRUSH_NOTE_KV.get("project-draft:" + studioId, "json");
      return project ? response(request, env, { project, status: meta.status }) : error(request, env, "Draft gift tidak ditemukan.", 404);
    }
    let body;
    try { body = await readJson(request); } catch (cause) { return error(request, env, cause.message || "JSON tidak valid."); }
    if (!validateProject(body.project)) return error(request, env, "Data gift belum lengkap atau formatnya tidak valid.");
    const project = { ...body.project, id: studioId };
    meta.updatedAt = new Date().toISOString();
    await Promise.all([
      env.CRUSH_NOTE_KV.put("project-draft:" + studioId, JSON.stringify(project)),
      env.CRUSH_NOTE_KV.put("project-meta:" + studioId, JSON.stringify(meta)),
    ]);
    return response(request, env, { ok: true, updatedAt: meta.updatedAt });
  }

  const publishMatch = pathname.match(/^\/api\/studio\/projects\/([^/]+)\/publish$/);
  if (method === "POST" && publishMatch) {
    const id = publishMatch[1];
    if (!safeId(id) || !(await studioAuthorized(request, env, id))) return error(request, env, "Akses Studio tidak valid.", 401);
    const meta = await projectMeta(env, id);
    const project = await env.CRUSH_NOTE_KV.get("project-draft:" + id, "json");
    if (!meta || !project) return error(request, env, "Project tidak ditemukan.", 404);
    const now = new Date().toISOString();
    meta.status = "published";
    meta.updatedAt = now;
    meta.publishedAt = now;
    await Promise.all([
      env.CRUSH_NOTE_KV.put("project-published:" + id, JSON.stringify(project)),
      env.CRUSH_NOTE_KV.put("project-meta:" + id, JSON.stringify(meta)),
    ]);
    const appUrl = (env.PUBLIC_APP_URL || request.headers.get("origin") || url.origin).replace(/\/$/, "");
    return response(request, env, { ok: true, project: meta, giftUrl: appUrl + "/share/" + encodeURIComponent(id) });
  }

  const publicMatch = pathname.match(/^\/api\/public\/gifts\/([^/]+)$/);
  if (method === "GET" && publicMatch) {
    const id = publicMatch[1];
    if (!safeId(id)) return error(request, env, "Gift tidak ditemukan.", 404);
    const result = await Promise.all([
      env.CRUSH_NOTE_KV.get("project-published:" + id, "json"),
      projectMeta(env, id),
    ]);
    const project = result[0];
    const meta = result[1];
    if (!project || !meta || meta.status !== "published") return error(request, env, "Gift belum dipublikasikan.", 404);
    return response(request, env, { project, publishedAt: meta.publishedAt }, 200, { "cache-control": "public, max-age=60, s-maxage=60" });
  }

  return error(request, env, "Endpoint tidak ditemukan.", 404);
}

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (cause) {
      return response(request, env, { error: cause && cause.message || "Terjadi kesalahan internal." }, 500);
    }
  },
};
