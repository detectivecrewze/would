import test from "node:test";
import assert from "node:assert/strict";
import worker from "./index.js";

function makeEnv() {
  const data = new Map();
  return {
    PUBLIC_APP_URL: "https://would.for-you-always.my.id",
    CRUSH_NOTE_INGEST_SECRET: "test-only-secret",
    CRUSH_NOTE_KV: {
      async get(key, type) {
        const value = data.get(key);
        if (value == null) return null;
        return type === "json" ? JSON.parse(value) : value;
      },
      async put(key, value) { data.set(key, value); },
      async delete(key) { data.delete(key); },
      async list() { return { keys: [] }; },
    },
    MEDIA: null,
  };
}

async function createOrder(env, orderId, token = "test-only-secret") {
  return worker.fetch(new Request("https://crush-note-api.test/api/integrations/orders", {
    method: "POST",
    headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify({ orderId, customerName: "Buyer", customerEmail: "buyer@example.test", locale: "id" }),
  }), env);
}

test("order ingestion rejects unauthorized callers", async () => {
  const response = await createOrder(makeEnv(), "sandbox-order-1", "wrong");
  assert.equal(response.status, 401);
});

test("order ingestion creates a blank draft and same Studio access on retries", async () => {
  const env = makeEnv();
  const first = await createOrder(env, "sandbox-order-123");
  assert.equal(first.status, 201);
  const created = await first.json();
  assert.match(created.projectId, /^crush-note-[a-f0-9]{24}$/);
  assert.match(created.studioUrl, /\/studio\/\?project=crush-note-/);

  const second = await createOrder(env, "sandbox-order-123");
  assert.equal(second.status, 200);
  const retry = await second.json();
  assert.equal(retry.projectId, created.projectId);
  assert.equal(retry.studioUrl, created.studioUrl);
  assert.equal(retry.idempotent, true);

  const url = new URL(created.studioUrl);
  const studio = await worker.fetch(new Request("https://crush-note-api.test/api/studio/projects/" + created.projectId, {
    headers: { "X-Studio-Token": url.searchParams.get("token") },
  }), env);
  assert.equal(studio.status, 200);
  const draft = (await studio.json()).project;
  assert.equal(draft.sender, "");
  assert.equal(draft.recipient, "");
  assert.equal(draft.puzzle.photo, "");
  assert.equal(draft.music.url, "");
  assert.deepEqual(draft.reasons.items, ["", "", ""]);
});
