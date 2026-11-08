export const API_BASE = (() => {
  if (window.CRUSH_NOTE_API_BASE) return window.CRUSH_NOTE_API_BASE.replace(/\/$/, "");
  return "https://crush-note-api.aldoramadhan16.workers.dev";
})();

export const PUBLIC_APP_URL = (() => {
  if (window.CRUSH_NOTE_PUBLIC_APP_URL) return window.CRUSH_NOTE_PUBLIC_APP_URL.replace(/\/$/, "");
  return location.origin;
})();

export async function apiRequest(path, options = {}) {
  const response = await fetch(API_BASE + path, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || ("Request failed (" + response.status + ")"));
  return payload;
}
