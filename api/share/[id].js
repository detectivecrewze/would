const API_BASE = "https://crush-note-api.aldoramadhan16.workers.dev";
const APP_ORIGIN = "https://would.for-you-always.my.id";
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,63}$/;

function escapeHtml(value) {
  return String(value || "").replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[character]);
}

function page({ title, description, image, giftUrl, redirectUrl }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeGiftUrl = escapeHtml(giftUrl);
  const safeRedirectUrl = JSON.stringify(redirectUrl);
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><meta name="description" content="${safeDescription}"><meta property="og:type" content="website"><meta property="og:site_name" content="Crush Note"><meta property="og:title" content="${safeTitle}"><meta property="og:description" content="${safeDescription}"><meta property="og:url" content="${safeGiftUrl}"><meta property="og:image" content="${safeImage}"><meta property="og:image:alt" content="Foto pembuka untuk kejutan kecil"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${safeTitle}"><meta name="twitter:description" content="${safeDescription}"><meta name="twitter:image" content="${safeImage}"><script>window.location.replace(${safeRedirectUrl})</script></head><body><p>Menyiapkan cerita kecil untukmu… <a href="${escapeHtml(redirectUrl)}">Buka gift</a></p></body></html>`;
}

export default async function handler(request, response) {
  const id = request.query?.id || "";
  const sendHtml = (status, html) => response.status(status).setHeader("content-type", "text/html; charset=utf-8").setHeader("cache-control", "public, max-age=0, s-maxage=300, stale-while-revalidate=3600").setHeader("x-content-type-options", "nosniff").send(html);
  if (!ID_PATTERN.test(id)) return sendHtml(404, page({
    title: "Crush Note — ada kejutan kecil untukmu",
    description: "Ada cerita kecil yang disiapkan khusus untukmu. Buka saat kamu siap menemukan kejutan di dalamnya.",
    image: APP_ORIGIN + "/assets/our-moment.jpg", giftUrl: APP_ORIGIN + "/", redirectUrl: APP_ORIGIN + "/",
  }));

  const giftUrl = APP_ORIGIN + "/share/" + encodeURIComponent(id);
  const redirectUrl = APP_ORIGIN + "/?gift=" + encodeURIComponent(id);
  try {
    const result = await fetch(API_BASE + "/api/public/gifts/" + encodeURIComponent(id), { headers: { accept: "application/json" } });
    if (!result.ok) throw new Error("Gift is unavailable");
    const payload = await result.json();
    const project = payload.project;
    if (!project) throw new Error("Gift is unavailable");
    const recipient = String(project.recipient || "").trim();
    const english = project.locale === "en";
    const title = recipient
      ? (english ? `A little surprise for ${recipient} — Crush Note` : `Ada kejutan kecil untuk ${recipient} — Crush Note`)
      : (english ? "A little surprise for you — Crush Note" : "Ada kejutan kecil untukmu — Crush Note");
    const description = english
      ? "Someone made a little story just for you. Open it when you are ready to discover the surprise."
      : "Ada cerita kecil yang disiapkan khusus untukmu. Buka saat kamu siap menemukan kejutan di dalamnya.";
    let image = project.puzzle?.photo || APP_ORIGIN + "/assets/our-moment.jpg";
    try {
      const imageUrl = new URL(image, APP_ORIGIN);
      if (!["https:", "http:"].includes(imageUrl.protocol)) image = APP_ORIGIN + "/assets/our-moment.jpg";
      else image = imageUrl.href;
    } catch { image = APP_ORIGIN + "/assets/our-moment.jpg"; }
    return sendHtml(200, page({ title, description, image, giftUrl, redirectUrl }));
  } catch {
    return sendHtml(503, page({
      title: "Crush Note — ada kejutan kecil untukmu",
      description: "Ada cerita kecil yang disiapkan khusus untukmu. Buka saat kamu siap menemukan kejutan di dalamnya.",
      image: APP_ORIGIN + "/assets/our-moment.jpg", giftUrl, redirectUrl,
    }));
  }
}
