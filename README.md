# resulcay.com

Resul Çay's portfolio. A fast, server-rendered "Journal" that recruiters, search engines and AI assistants can read, with an opt-in game-like "Story mode" coming on top of it.

## Stack

- [Astro](https://astro.build) 7, server-rendered on Cloudflare Workers
- TypeScript (strictest), Zod for validation shared by browser and server
- Self-hosted fonts: Fraunces, Atkinson Hyperlegible, Caveat
- English and Turkish (`/` and `/tr`)

## Layout

```
src/
  domain/          types, Zod schemas, tag vocabulary (no framework code)
  application/     use cases and the ContentRepository port
  infrastructure/  adapters: Firestore, in-memory/seed fallback, Turnstile, Firebase Auth
  lib/             composition root, SEO helpers, middleware helpers
  i18n/            UI strings and locale helpers
  components/      small Astro components
  views/           one view per page, shared by both languages
  pages/           thin routes, admin pages, JSON API, robots, sitemap and llms.txt
  scripts/         browser code: forms, Turnstile loader, admin editors
tests/             Vitest unit tests
```

## Commands

Node 24 (see `.nvmrc`).

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm install`     | Install dependencies                          |
| `npm run dev`     | Local dev server on the Workers runtime       |
| `npm test`        | Unit tests                                    |
| `npm run build`   | Type check and production build               |
| `npm run preview` | Serve the production build locally            |
| `npm run deploy`  | Build and deploy to Cloudflare Workers        |

## Admin

Every `/admin` and `/api/admin` URL answers with the same 404 as any missing page unless the request carries a verified admin session. To sign in, open any missing page and click the butterfly five times quickly. The sign-in checks Turnstile, then the email and password with Firebase Authentication, and only accepts the one user id in `ADMIN_UID`. The session is an HMAC-signed, HttpOnly, `SameSite=Strict` cookie that lasts 8 hours.

Content lives in Firestore (`projects/{slug}`, `site/profile`, `site/experience`, `site/testimonials`, `messages/{id}`). The Worker talks to Firestore with a service account, so `firestore.rules` refuses every browser request. Until content is saved, the site shows the starter content in `src/infrastructure/content/seed.ts`; the admin overview has a button that copies it into Firestore.

Uploads go to the R2 bucket `resulcay-media` and are served from `/media/...`. Rules (`src/domain/media.ts`), checked in the browser and again on the server from the file's bytes: 10 MB at most; project and site images must be PNG, JPEG, WebP or AVIF, 64 to 4096 px; the CV must be a PDF. The admin resizes photos to 2400 px and converts them to WebP before upload.

### Music

Story mode's record player plays the tracks listed under **Admin → Music**, in order, looping. Upload MP3, Ogg or M4A files (10 MB at most; the type is checked from the file's bytes), then fill in the title, artist, licence and source link for each, and save. The licence and source are required because they're shown in the credits (on the Story mode title screen, in the record player, and linked from the footer).

Only use music you have the right to use. Good places for CC0 and CC BY tracks: the [Free Music Archive](https://freemusicarchive.org), [ccMixter](https://ccmixter.org) and [Pixabay Music](https://pixabay.com/music/). CC BY needs the artist credited, which the credits do; avoid NC (non-commercial) and ND licences unless you've checked they fit. Keep a note of the page you downloaded each track from and paste it as the source.

With no tracks, Story mode simply has no music; its sound effects and room ambience are made in the browser and need no files.

### Local development

Copy `.dev.vars.example` to `.dev.vars`. Without the `FIREBASE_*` lines, content is edited in memory and you sign in with any email and `DEV_ADMIN_PASSWORD`. Turnstile test keys work offline in dev.

### Production setup

1. **Firebase Authentication:** enable Email/Password, add your user, and copy its User UID.
2. **Firestore:** create the database (production mode) and publish `firestore.rules`.
3. **Service account:** Project settings → Service accounts → Generate new private key. Use `client_email` and `private_key` from the JSON file. Don't commit the file.
4. **Web API key:** Project settings → General. If you restrict it, don't use an HTTP referrer restriction (the Worker calls it from the server).
5. **Turnstile:** add a widget for `resulcay.com` in the Cloudflare dashboard (Managed mode).
6. **R2:** `npx wrangler r2 bucket create resulcay-media`.
7. **Secrets:** run each of these. Each command asks for the value. Use a new long random string for `SESSION_SECRET` (not the one in `.dev.vars`), and paste `private_key` exactly as it appears in the JSON file, `\n` sequences included.

   ```
   npx wrangler secret put FIREBASE_PROJECT_ID
   npx wrangler secret put FIREBASE_API_KEY
   npx wrangler secret put FIREBASE_CLIENT_EMAIL
   npx wrangler secret put FIREBASE_PRIVATE_KEY
   npx wrangler secret put ADMIN_UID
   npx wrangler secret put SESSION_SECRET
   npx wrangler secret put TURNSTILE_SITE_KEY
   npx wrangler secret put TURNSTILE_SECRET_KEY
   ```

8. `npm run deploy`, then add `resulcay.com` as a custom domain of the Worker.
