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
  infrastructure/  adapters: seed content today, Firestore next
  lib/             composition root, SEO helpers, middleware helpers
  i18n/            UI strings and locale helpers
  components/      small Astro components
  views/           one view per page, shared by both languages
  pages/           thin routes, plus robots, sitemap and llms.txt
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

Every `/admin` URL answers with the same 404 as any missing page unless the request carries a verified admin session. Login arrives in a later change.
