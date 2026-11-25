import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import sharePageHandler from "../api/share/[id].js";
import shareImageHandler from "../api/share-image.js";

const PROJECT_ID = "crush-note-customer-1";
const PHOTO_URL = "https://crush-note-api.aldoramadhan16.workers.dev/media/crush-note/customer/photo.webp";

function responseRecorder() {
  const result = { headers: {} };
  const response = {
    status(code) { result.status = code; return this; },
    setHeader(name, value) { result.headers[String(name).toLowerCase()] = value; return this; },
    send(body) { result.body = body; return this; },
    json(body) { result.body = body; return this; },
  };
  return { response, result };
}

test("share page advertises a versioned JPEG preview endpoint", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    project: { recipient: "Nadia", puzzle: { photo: PHOTO_URL } },
    publishedAt: "2026-11-25T07:00:00.000Z",
  }), { status: 200 });
  const { response, result } = responseRecorder();
  try {
    await sharePageHandler({ query: { id: PROJECT_ID } }, response);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(result.status, 200);
  assert.match(result.body, /og:image:type" content="image\/jpeg"/);
  assert.match(result.body, /og:image:width" content="1200"/);
  assert.match(result.body, /api\/share-image\?id=crush-note-customer-1&amp;v=/);
  assert.doesNotMatch(result.body, /photo\.webp/);
});

test("preview endpoint converts mismatched PNG bytes served as WebP into a compact JPEG", async () => {
  const mislabeledPng = await sharp({
    create: { width: 1125, height: 1500, channels: 4, background: { r: 180, g: 80, b: 100, alpha: 1 } },
  }).png().toBuffer();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/api/public/gifts/")) {
      return new Response(JSON.stringify({ project: { puzzle: { photo: PHOTO_URL } } }), { status: 200 });
    }
    return new Response(mislabeledPng, {
      status: 200,
      headers: { "content-type": "image/webp", "content-length": String(mislabeledPng.length) },
    });
  };
  const { response, result } = responseRecorder();
  try {
    await shareImageHandler({ method: "GET", query: { id: PROJECT_ID } }, response);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(result.status, 200);
  assert.equal(result.headers["content-type"], "image/jpeg");
  assert.equal(result.body[0], 0xff);
  assert.equal(result.body[1], 0xd8);
  assert.ok(result.body.length < mislabeledPng.length);
  const metadata = await sharp(result.body).metadata();
  assert.deepEqual({ format: metadata.format, width: metadata.width, height: metadata.height }, {
    format: "jpeg", width: 1200, height: 630,
  });
});
