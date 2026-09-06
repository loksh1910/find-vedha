# Find Vedha

A browser multiplayer social-deduction game — Scotland Yard–style hidden movement on an original 199-node Chennai-themed board, wrapped in a chess.com-style social shell (private rooms, invite codes, live lobby, text chat, profiles, stats).

Original IP: original character names, original board, no licensed content.

## Working on this

Read **[CLAUDE.md](CLAUDE.md)** first — it has the current build status (per-phase), where everything lives, the exact ruleset (keep every number), and the gotchas. [SITEMAP.md](SITEMAP.md) is the original screen spec (now behind the code). [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) has the dark-only tokens.

```bash
npm run dev      # dev server (Turbopack) → http://localhost:3000
npm run build    # production build — runs the TS check (does NOT run ESLint)
npm run lint     # ESLint — run separately before calling a change done
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth + Realtime + RLS).

Backend config lives in `.env.local` (gitignored). DB schema is in `supabase/migrations/*.sql` — run each by hand in the Supabase SQL Editor (all idempotent).

**Do not deploy this anywhere.** It runs on `localhost` only; Supabase's hosted free tier for data is fine.
