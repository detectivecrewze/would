# Crush Note

Mobile-first comic confession gift with a self-edit Studio.

Gift preview: http://127.0.0.1:5180/
Studio: http://127.0.0.1:5180/studio/
Admin dashboard: http://127.0.0.1:5180/admin/
Local Worker API: http://127.0.0.1:8787/health

## Local development

1. Run $env:PORT=5180; npm run dev:site in one terminal (5179 is already occupied on this machine).
2. Run npm run dev:worker in another terminal.
3. Open /admin/ and enter the local admin token stored in the ignored .dev.vars file.
4. Create a gift, edit it in Studio, then publish it. Admin-created projects use Worker KV. Their images and uploaded audio are stored under crush-note/<project-id>/ in R2.

Wrangler runs in local mode. Local KV and R2 are emulator data, not Cloudflare production storage. The config binds R2 to the shared bucket name valentine-upload; the local emulator does not write to the live bucket. Never run wrangler dev --remote against the shared bucket for routine testing.

## Data and API

- project-meta:<id> stores status and timestamps.
- project-draft:<id> stores editable project JSON.
- project-published:<id> stores the public snapshot.
- studio-token:<id> stores only a SHA-256 hash of the Studio token.
- Public gifts resolve from /?gift=<id> and only return a published snapshot.
- Admin token and Studio tokens are not exposed by public gift/status endpoints.

Existing local-only demo editing remains in localStorage. Admin-created Studio projects autosave to the Worker. Images are resized to WebP in the browser before upload; uploaded MP3/M4A files go directly to R2.

## Before first deployment

- Crush Note already has a dedicated KV namespace configured in wrangler.toml. Do not replace it with another product's namespace.
- Set a production ADMIN_TOKEN with wrangler secret put ADMIN_TOKEN.
- The production app domain is https://would.for-you-always.my.id. ALLOWED_ORIGINS and PUBLIC_APP_URL in wrangler.toml use this canonical domain. The deployed API is https://crush-note-api.aldoramadhan16.workers.dev.
- Deploy the Worker and frontend separately. Production API URL is configured in src/config.js. ADMIN_TOKEN is stored only in the ignored local file .prod-admin-token and as a Cloudflare Worker secret.
- The R2 bucket binding points to the existing shared valentine-upload bucket. All new media keys are namespaced under crush-note/.

Phase 3 now provides local admin project creation, Studio access, draft autosave, publish, public gift loading, and scoped R2 media uploads. Payment integration and storefront checkout remain a later phase.

