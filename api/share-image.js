import sharp from "sharp";

const API_BASE = "https://crush-note-api.aldoramadhan16.workers.dev";
const APP_ORIGIN = "https://would.for-you-always.my.id";
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,63}$/;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_HOSTS = new Set([
  "crush-note-api.aldoramadhan16.workers.dev",
  "would.for-you-always.my.id",
]);

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function safeImageUrl(value) {
  try {
    const url = new URL(String(value || ""), APP_ORIGIN);
    return url.protocol === "https:" && ALLOWED_IMAGE_HOSTS.has(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}

export default async function handler(request, response) {
  if (request.method && !["GET", "HEAD"].includes(request.method)) {
    response.setHeader("allow", "GET, HEAD");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const id = String(first(request.query?.id) || "");
  if (!ID_PATTERN.test(id)) return response.status(404).json({ error: "Gift not found" });

  try {
    const projectResponse = await fetch(API_BASE + "/api/public/gifts/" + encodeURIComponent(id), {
      headers: { accept: "application/json" },
    });
    if (!projectResponse.ok) throw new Error("Gift is unavailable");
    const payload = await projectResponse.json();
    const project = payload.project;
    if (!project) throw new Error("Gift is unavailable");

    const source = safeImageUrl(
      project.puzzle?.photo || project.cover?.photo || project.memory?.photo || project.reasons?.photo,
    ) || APP_ORIGIN + "/assets/gift-preview-default.png";
    const sourceResponse = await fetch(source, { headers: { accept: "image/*" } });
    if (!sourceResponse.ok) throw new Error("Image is unavailable");
    const declaredSize = Number(sourceResponse.headers.get("content-length") || 0);
    if (declaredSize > MAX_SOURCE_BYTES) throw new Error("Image is too large");
    const sourceBytes = Buffer.from(await sourceResponse.arrayBuffer());
    if (!sourceBytes.length || sourceBytes.length > MAX_SOURCE_BYTES) throw new Error("Image is too large");

    const output = await sharp(sourceBytes, { limitInputPixels: 25_000_000 })
      .rotate()
      .resize(1200, 630, { fit: "cover", position: "attention" })
      .jpeg({ quality: 78, progressive: true, mozjpeg: true })
      .toBuffer();

    response.setHeader("content-type", "image/jpeg");
    response.setHeader("content-length", String(output.length));
    response.setHeader("cache-control", "public, max-age=300, s-maxage=31536000, immutable");
    response.setHeader("x-content-type-options", "nosniff");
    if (request.method === "HEAD") return response.status(200).end();
    return response.status(200).send(output);
  } catch {
    return response.status(404).json({ error: "Preview image not found" });
  }
}
