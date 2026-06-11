# Opus Elevate — website

Marketing/waitlist site for Opus Elevate, a three-phase nootropic performance drink. Next.js (App Router) + GSAP ScrollTrigger + Tailwind 4.

## Develop

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # production build
npm run lint
```

Waitlist submissions need a `.env.local` with `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (server-only; never exposed to the client).

## Layout

- `app/components/Elevate.tsx` — the whole homepage: a pinned, scroll-scrubbed hero (can rotation painted to a single `<canvas>`), three ingredient "beats", then the waitlist form.
- `app/stack.ts` — single source of truth for phases/ingredients/dosages (rendered in the hero and published via `/llms.txt`).
- `app/can-frames.ts` — manifest for the 100 rotation frames in `public/can/transparent-spin/`.
- `app/actions/waitlist.ts` — server action; upserts into the Supabase `waitlist` table.
- `app/logo/` — experimental 3D-glass wordmark (stakeholder review; see comments).
- `assets/can/` — source material (greenscreen masters, opaque frames, label art). Version-controlled, **not** deployed — only `public/` ships.

## Hard-won constraints (do not regress)

- The can rotation must stay on **one canvas** — mounting frames as stacked `<img>` layers crashed iOS Safari (per-tab memory ceiling).
- iOS safe-area/toolbar bleed is deliberate and fragile: see comments in `globals.css`, `Starfield.tsx`, and `Elevate.tsx` before touching viewport sizing.
- See `AGENTS.md`: this Next.js version may differ from what you expect — check `node_modules/next/dist/docs/` before writing code.
