# CLAUDE.md

resulcay.com is Resul Çay's portfolio. It has a server-rendered Journal (English at `/`, Turkish at `/tr`), a 3D Story mode at `/story` where his character types at a desk, and a hidden admin. See the README for the full layout and deployment.

## Stack

- Astro 7 (server output) on Cloudflare Workers, Node 24, TypeScript (strictest), Zod 4
- Story mode: React 19, @react-three/fiber, three 0.182.0 and GSAP, loaded only after Start (no `@astrojs/react`)
- Firebase Auth and Firestore over REST, the R2 bucket `MEDIA`, Cloudflare Turnstile

## Commands

- `npm run dev`: dev server on port 4321. If one is already running, stop it with `npx astro dev stop`, or replace it with `npm run dev -- --force`.
- `npm test`: unit tests (Vitest)
- `npm run build`: type check and production build
- `npm run test:e2e`: Playwright with the installed Edge. It's slow, and the story tests are timing-sensitive on the software renderer.
- `npm run deploy`: Resul runs this himself.

## Rules

- **CSP:** it's strict, with no eval and no inline scripts. Pages that add to it do so before any `await`, and must re-add `'self'` when they add a script source (see `src/lib/csp.ts`).
- **Secrets:** never put them in git or in output. Local secrets go in `.dev.vars`; production secrets via `npx wrangler secret put`.
- **Education:** Resul did not finish his degree (Yalova University, Computer Engineering, 2019–2025). Never say "graduated".
- **Character:** shows Resul with glasses and no moustache. Never publish raw photos of him.
- **Music:** only free, licensed tracks (CC0 or CC BY), always credited with the licence and source.
- **Git:** work on `main` and push to `main`. Stage files by name.
- **Checks:** for visual tweaks, run only `npm test` and `npm run build`, then push; Resul checks in his browser. Run e2e for bigger changes.
- **Servers:** stop any dev or preview servers you start.
- **The character:** `src/story/scene/character/resul.glb` is posed in code (`src/story/scene/Character.tsx`). `tests/character.test.ts` fails if he clips into the desk or the laptop. `/story?debug=character` shows him on his own.
