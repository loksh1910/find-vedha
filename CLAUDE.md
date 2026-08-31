# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository. These instructions override default behavior — follow them exactly.

---

## Project

**Find Vedha** (working title) — a browser-based multiplayer social-deduction game: Scotland Yard–style hidden-movement mechanics on an original **Chennai-themed board**, wrapped in a chess.com-style social platform (private rooms, invite codes, lobby, live video + text chat, profiles, stats). No real IP — original character names, original board, no licensed content.

**Master reference:** [SITEMAP.md](SITEMAP.md) is the authoritative list of every screen and state. **If something is not in SITEMAP.md, do not build it without adding it there first.** If the user approves a change mid-build, update SITEMAP.md to match in the same session.

**Current status:** Scaffolded (Next.js 16 + React 19 + Tailwind v4). **Phase 1 front-of-house is built on mock state** — the full flow Landing → Auth → Dashboard → Create Room → Join → Lobby (5 phases: roster → 10s role claim → auto-fill → ready-up → 5s countdown) → transition → `/room/[code]/play` placeholder. `npm run build` + `npm run lint` clean; walked end-to-end in the browser with no console errors. Next up: design polish per screen with the user, then Phase 2 (Supabase). The in-game engine is not built.

---

## How to work on this project — process rules

1. **Phase discipline (see "Build order" below).** We are at Phase −1 → Phase 0. Do not jump ahead.
2. **Phase 0 = per-screen layout, user-driven.** Before designing or coding **any** screen, ask the user to describe the layout they want for that screen. Present it back as a plan or rough static mockup. Build it only after they confirm. **Never invent a layout on the user's behalf.** One screen at a time.
   - Run every visual/UI decision through [`.claude/skills/frontend-design/SKILL.md`](.claude/skills/frontend-design/SKILL.md) — see "Frontend design approach" below.
3. **Incremental checkpoints.** Build one feature, confirm it works (`npm run dev` + the user reviews on localhost), commit, then move on. No giant untested piles of code.
4. **Always run `npm run build` before calling a change done** — it runs the TypeScript check that `dev` doesn't surface until you touch the page.
5. **Secrets go in env vars, never hardcoded.** Supabase keys, Daily.co keys → `.env.local` (gitignored). Prompt the user to paste keys when a phase needs them.
6. **Deployment is forbidden without explicit instruction** (see "Deployment rule").
7. Keep this file and SITEMAP.md current as decisions land.

---

## Frontend design approach

All UI work on this project follows **[`.claude/skills/frontend-design/SKILL.md`](.claude/skills/frontend-design/SKILL.md)** — read it in full before Phase 0 and re-read it before designing each screen. It is a project skill and should also be surfaced/invocable as `frontend-design` in normal sessions. Non-negotiables distilled from it:

- **No templated defaults.** Do not reach for the three AI-design clichés: (1) cream `#F4F1EA` + high-contrast serif + terracotta; (2) near-black + one acid-green/vermilion accent; (3) broadsheet hairline-rule columns with zero border-radius. Where the user's brief fixes a direction, follow it exactly; where it leaves an axis free, don't spend that freedom on a cliché.
- **Ground every choice in the subject.** This subject is a *hidden-chase game across a stylised Chennai transit map* — palette, type, structural devices, and motion should come from that world (transit maps, ticket stubs, route lines, the city), not from a generic dashboard kit.
- **Two-pass process.** Before coding a screen: brainstorm a compact token system — Color (4–6 named hex), Type (a characterful display face used with restraint + a body face + a utility/data face), Layout (prose + ASCII wireframe), and one **signature element** the screen is remembered by. Then critique that plan against the brief — revise anything that reads as a default and say what changed — *then* build, deriving every color/type value from the plan.
- **Spend boldness in one place.** One signature element per screen; everything around it stays quiet and disciplined. Remove one accessory before shipping.
- **Quality floor, unannounced:** responsive to mobile, visible keyboard focus, `prefers-reduced-motion` respected, motion used sparingly (over-animation reads as AI-generated).
- **Copy is design material.** Active voice, sentence case, name things by what the player controls ("Claim Vedha", "Ready"), an action keeps its name through the whole flow, errors state what happened and how to fix it, empty states invite action.
- Self-critique as you build — take screenshots via the browser preview tools and look at them.
- Keep design notes (what was tried, what was rejected and why) so later passes don't loop. Put them in `docs/design-notes.md` as they accumulate.

A **design system doc** (`DESIGN_SYSTEM.md`) will be created during Phase 0 once the first screen's token system is agreed, and every later screen must draw from it rather than re-inventing tokens.

### Visual direction (fixed)

- **Dark mode only.** There is no light theme — do not build a light palette, a theme toggle, or `prefers-color-scheme` light handling. Design the dark palette as the *only* palette (proper layered dark surfaces, not a inverted light theme). Settings > Appearance may offer contrast/accent tweaks, never a light mode.
- **Reference: chess.com.** The platform *shell* takes its cues from chess.com — calm, information-dense, board/game-centric, one restrained brand accent over a low-chroma dark UI, persistent left nav on desktop, a collapsible right rail on the play screen (tabs for moves / chat / players), stat-block profile pages with a game archive table, "Play" (here: Create / Join) given the most visual weight on the dashboard. Take the *structure and restraint*, not the literal green or the chess iconography — the identity still comes from the Chennai transit-map world per the design skill above.

---

## Tech stack (decided)

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | App Router only, not Pages Router |
| Styling | **Tailwind CSS + shadcn/ui** (Radix primitives) | Standard, well-supported |
| Backend | **Supabase** — Postgres + Auth + Realtime + Row Level Security (one free account) | SQL for game state + stats; RLS is the key feature — it lets the DB physically withhold the Runner's position from Detective clients |
| Auth | Supabase Auth — email/password + Google. Sign-up also collects **username + avatar** (preset avatars for MVP; upload later) | |
| Realtime | Supabase Realtime — **one channel per room**: game state + presence + text chat | |
| Video chat | **Daily.co** prebuilt call widget (free tier) | Simpler than Agora / raw WebRTC; key added later via env var |
| Board rendering | Hand-built **SVG**, React state drives node highlight / pawn position / pan + zoom | No mapping library (Leaflet/Mapbox) — the board is abstract, not real geography |
| Hosting | **None.** `npm run dev` → `localhost:3000` only | Supabase's cloud free tier for backend data is acceptable (the app is never deployed); local Docker Supabase is an option if the user wants zero cloud |

---

## Naming & terminology

- Product: **Find Vedha**.
- The hidden/evading player: **Runner**; in-world character name **Vedha**.
- The pursuing players: **Detectives** — they control **5 Detective pawns** between them. (Settled term, per the user — it's the authentic Scotland Yard word. The brief said "Tracker"; the user briefly floated "Chaser". Do not reintroduce either.)
- Detective slot colors: **D1 Blue · D2 Orange · D3 Purple · D4 Pink · D5 Cyan.** Deliberately avoid yellow/green/red — those are reserved for transport lines. CSS vars are `--tr-1`…`--tr-5` (kept short). (Proposal; finalize in Phase 0.)
- Transport tiers: **Auto** = yellow lines · **Bus** = green lines · **Metro** = red lines.
- **"Who is Vedha" is PUBLIC** from the lobby onward. **"Where Vedha is" is HIDDEN** during play except on reveal rounds. Never conflate the two.

### Board
- Exactly **199 numbered nodes**. **No named landmark stations** — deliberate deviation from the brief's §3 boilerplate, per the user's explicit instruction ("just nodes and a neat map bg"). Background art should *read* as Chennai (east-edge coastline = Bay of Bengal, two abstract river curves) with **no labels and no gameplay effect**.
- A node's available transports = **whichever colored edges touch it**. Do not store a separate "allowed transport" field per node. When the board graph is built (Phase 3), follow the density pattern: Auto everywhere (dense, short hops), Bus at busier nodes, Metro only at major hubs; **no node has Bus or Metro without also having Auto**.
- The graph also carries a few **river / black-line edges** — long shortcut connections, `transport: "river"` (Wildcard-only), roughly following the two Chennai river curves. Author ~2–4 of them in Phase 3.

---

## Complete ruleset — keep every number exact

| Rule | Value |
|---|---|
| Players per room | 2–6 |
| Pawns | 1 Runner (Vedha) + 5 Detective pawns. With <6 players, a player controls more than one Detective pawn. |
| Board nodes | exactly 199 |
| Detective tickets (per pawn) | **10 Auto · 8 Bus · 4 Metro** |
| Runner tickets | **4 Auto · 3 Bus · 3 Metro · 5 Wildcard · 2 Double-Move** |
| Wildcard | Usable on any transport type; **hides which transport type was used** from Detectives. (Destination is hidden every round anyway.) Also the **only** ticket that can cross a **river / black-line edge** — long Wildcard-only shortcut routes designed into the board (**in scope**; authored with the board graph in Phase 3). |
| Double-Move | Runner makes **two consecutive moves** before Detectives respond. If a reveal round lands on the **first** of the two moves, the reveal happens after that first move. |
| Start positions | Random draw from a fixed pool of **~20 designated start nodes** spread across the map. Runner + 5 Detectives all draw **distinct** nodes from that pool. |
| Rounds | **24** |
| Reveal rounds | **3, 8, 13, 18, 24.** Vedha's exact node is shown to all Detectives, then hidden again as soon as Vedha's next move is made. |
| Turn order | Runner moves first each round, then Detectives move **sequentially** (one at a time, each move visible to the others). |
| Movement | **One stop per ticket** — cannot skip a stop to a further one on the same route. **Every player must move each turn** — no passing/staying. |
| Detective blocking | A Detective **cannot** move onto a node occupied by another Detective. |
| Catch | Any Detective landing on Vedha's exact node → **Detectives win immediately.** Same if Vedha is forced onto an occupied Detective node. |
| Stuck Detective | A Detective with no usable ticket for any connection at its node is **stuck for the rest of the game** — still occupies/blocks that node, **auto-skipped** in turn rotation, visually marked "stuck". |
| Runner win | Survives through the end of **round 24**, OR **every Detective can no longer move** before round 24 completes (out of usable tickets, or abandoned and not taken over). |
| Runner stuck (no legal move) | **Detectives win** — matches the official rule (a Mr. X who cannot move is captured). Rare in practice now that Vedha gains Detectives' spent tickets. |
| Ticket handoff | **Implemented (real Scotland Yard rule).** When a Detective spends an Auto / Bus / Metro ticket, that ticket is added to Vedha's wallet and Vedha may spend it on a later turn. Vedha's **Wildcard and Double-Move counts are never increased this way** (they stay at the fixed 5 / 2). Detectives never get tickets back — their wallets only shrink. |

### Hidden-info enforcement (non-negotiable)
The Runner's real position must be **server-authoritative** and never sent to Detective clients except on reveal rounds / at game end — enforce with Supabase Row Level Security, not just client-side hiding, or it's inspectable via browser dev-tools. Move validation, catch detection, turn/round progression, and win/lose resolution are all validated database-side.

---

## Screens (summary — full detail in SITEMAP.md)

**Build now (Landing → Lobby → transition):**
- `/` Landing · `/how-to-play` Manual (+ reusable `<ManualDialog>`) · `/signup` (username + avatar) · `/login` · `/auth/reset*` · `/auth/callback`
- `/dashboard` — Create Room, Join-by-code, active rooms, friends, recent players, stats snapshot, match-history summary, settings
- `/rooms/new` — room name, max players (2–6), AI-fill toggle (disabled/"coming soon") → invite code + link
- `/join` and `/room/[code]/join` — with states: invalid / expired / room full / already started / already a member
- `/room/[code]` — **the Lobby** (see its special rules below)
- Lobby → game **transition animation** (transient, not a route)

**Design now, build later:**
- `/room/[code]/play` — In-Game (Vedha view vs Detective view; board, HUD with always-available Manual + Leave, colour-coded ticket panel, 24-round travel log, reveal-round state, stuck-pawn state, shared voice, public + detectives-only chat tabs). No turn timer, no deduction assist, no screen-share.
  - **Leaving / disconnects:** anyone can `Leave game` any time. A **Detective** leaving or dropping → their pawn stays put and stops moving (abandoned; blocks its node; counts as stuck for win checks). **Any remaining player can click an abandoned pawn to take it over** for the rest of the game (keeps its node + tickets; one player may run several). Original resumes on reconnect only if nobody took it over. A **Vedha** drop **pauses the game** — remaining players see a blocking `Vedha has disconnected · Waiting for them to return…` overlay with an `Exit game` CTA (any player); pressing it → **Detectives win** ("Vedha left the game"). No auto-timeout; reconnect clears it. Vedha pressing `Leave game` = instant Detectives win.
- `/room/[code]/results` — outcome, full reveal of Vedha's route, stat deltas, Rematch / Return to dashboard
- `/u/[username]` Profile · `/game/[gameId]` Match Detail/Replay · `/friends` · `/settings`
- Global: top nav, toast system, per-panel skeletons, empty/error states, 404/500, offline banner, confirm dialogs, presence dots, host migration

**No `/room/[code]/reveal` route** — role assignment happens publicly inside the Lobby, not on a separate screen.

---

## The Lobby — special rules (non-obvious; follow exactly, do not simplify)

Single screen, five phases:

- **Phase A — Open roster.** Players join; list updates live. **Host-only controls (this phase only):** kick player, toggle AI-fill, adjust max players (2–6). Host CTA: **"Lock roster & start role selection"** (≥2 players). *(That the host triggers this is an assumption — pending user confirmation.)*
- **Phase B — Role selection (10 seconds, PUBLIC).** Prominent 10-second countdown for everyone. One **Vedha** slot + five color-tagged **Detective** slots. Any player may claim the Vedha slot or a specific Detective slot; claims are visible to all and lock to others; a player may release and re-pick within the 10s. With <6 players, a player may hold more than one slot.
- **Phase C — Roles locked / auto-fill.** On timer expiry the platform **randomly assigns all unclaimed slots** to players with room — **including randomly choosing Vedha if nobody claimed it** — distributing multiple Detective slots as needed so all 5 are owned. Lobby then shows a clear public assignment ("Vedha: <player>", each Detective color → its player).
- **Phase D — Ready-up.** Each player gets a **Ready toggle**. Host may still `Close room`; **max-players / kick / AI-fill are now locked**.
- **Phase E — Auto-start.** When **all** players are Ready, a **5-second countdown** auto-starts (cancels if anyone un-readies or disconnects). At zero → the Lobby→game transition animation → board view.

A **"Manual" button is always visible** in the Lobby — opens the full rules reference (`<ManualDialog>`) without leaving the Lobby.

Edge cases: player leaves during B/C (slot re-opens / re-fills; below 2 players → fall back to Phase A); player disconnects (grey row + grace timer, un-readies them, cancels the 5s countdown); host leaves (migrate host to next player by join order); room closed by host (all → `/dashboard` + toast).

---

## Build order (phases)

| Phase | What |
|---|---|
| **−1** | Full sitemap — SITEMAP.md. **Status: in review (v2).** |
| **0** | Per-screen layout design, user-driven. Order: Landing → Manual → Auth → Dashboard → Create Room → Join → Lobby → Transition. Ask the user for each layout; confirm before building. |
| **1** | Build front-of-house UI (Landing → Lobby → transition) on **mocked local state** first. |
| **2** | Wire Supabase: auth (username/avatar), rooms, invite codes, Lobby realtime (roster, 10s claim timer, auto-fill, ready-up, 5s countdown), host controls. |
| **3** | Board data: the full **199-node Chennai graph** (ids, x/y coords, edges with transport type incl. ~2–4 Wildcard-only river edges, ~20 start-node flags) as JSON. Its own review checkpoint before any game logic. |
| **4** | In-game engine (local): board renders from data, movement + ticket logic, hidden-Runner logic, reveal rounds, win/loss detection, end-game screen. |
| **5** | Realtime sync of in-game moves across tabs/devices. |
| **6** | Social layer: video chat (Daily.co), text chat. |
| **7** | Results, profiles, stats, match history, friends list. |
| **8** | Polish (dark-only): node hover states, smooth pan/zoom, sound, move/reveal animations, onboarding. (Turn timer — deferred, not in scope.) |

**Current build scope:** everything from the Landing page through the **Lobby → game transition animation**. There is no separate Role Reveal screen. Vedha's private start node + wallet surface on Vedha's own board view when the game screen first loads (built in Phase 4).

---

## Non-goals (do not build unless the user asks)

- **AI bot Detectives** — v2 feature. The "Fill empty Detective slots with AI?" toggle exists in the UI but is **disabled / "Coming soon"** for MVP. Unclaimed slots go to human players (one player can hold several).
- **Public matchmaking / lobbies** — invite-code only, friends-only.
- **Screen-share** — no button at all (dropped).
- **In-game turn timer** — deferred; not built, not decided. The game ends only on escape (round 24), all Detectives stuck, or a catch.
- **In-game deduction assist** — no possible-location cloud, no reachability / danger overlays, no suggestion markers. Both sides deduce unaided from the board + travel log + voice/chat. (Highlighting your own legal destinations on your turn is fine — that's move legality, not assist.)
- **Avatar upload** — preset avatars only for MVP.
- **Deploying anywhere.** See below.

---

## Deployment rule — IMPORTANT

**Do not deploy this app to any public hosting (Vercel, Netlify, etc.) at any point unless the user explicitly says so.** Everything runs on `localhost` (`npm run dev`) so the user can review privately at each checkpoint. Only deploy on explicit instruction. (Using Supabase's hosted free tier as the backend database is fine — that is not "deploying the app".)

---

## Commands

```bash
npm run dev      # start dev server (Turbopack, http://localhost:3000)
npm run build    # production build — runs the TypeScript check. Does NOT run ESLint (Next 16).
npm run lint     # ESLint — run this separately before calling a change done
```

Run **both** `npm run build` and `npm run lint` before considering a change done.

---

## Open questions (pending user answers — resolve before or during Phase 0)

1. **What triggers the 10-second role-selection timer?** Assumption: host presses "Lock roster & start role selection".
2. **Avatars** — preset set only for MVP? (Assumed yes.)
3. In-game build: brief Phase 1 says "two players on one screen" — accepted as a dev convenience; true Runner/Detective screen separation comes with Phase 2 networking.

**Resolved:** Pursuers are called **Detectives** (not "Tracker"/"Chaser"). Runner-with-no-legal-move → Detectives win (matches official rule). River / Wildcard-only shortcut edges → **in scope**. Ticket handoff (Detectives' spent tickets → Vedha) → **in scope**.

---

## Known gotchas (already hit — don't rediscover)

1. **Next 16's `eslint-config-next` makes `react-hooks/set-state-in-effect` and `react-hooks/refs` hard errors.** Synchronous `setState` in an effect body, and reading `ref.current` during render, both fail `npm run lint`. Where the pattern is genuinely correct (one-time `localStorage` hydration; a timer/bot-driven phase advance in the Lobby), wrap the block in `/* eslint-disable react-hooks/set-state-in-effect */ … /* eslint-enable */` with a one-line reason — see `app-state-provider.tsx` and `lobby-client.tsx`. Prefer moving `setState` into event handlers, and prefer `useState` over a `ref` for anything read during render (the Lobby's countdown `deadline` is state for this reason).
2. **`next build` does not run ESLint in Next 16.** A build can pass with lint errors. Always run `npm run lint` too.
3. **Reading `localStorage` during render (even inside `useMemo`) causes an SSR/first-client-render hydration mismatch.** Hit this in `lobby-client.tsx` — `room.name` from `findRoom()` (which reads `localStorage`) rendered `"Room ABC123"` on the server and the real created-room name on the client. Gate any such lookup on the provider's `hydrated` flag and return the SSR-matching fallback until it's true.
4. **Scaffolding into `C:\Users\lokes\Desktop\SLY` directly fails** — `create-next-app` rejects the capitalised folder name ("npm naming restrictions"). It was scaffolded in a temp dir as `find-vedha` and moved in; `package.json` `name` is `find-vedha`.
5. **`preview_start` resolves `.claude/launch.json` from the session's primary working directory (the Loku project), not from SLY** — so `preview_start({ name: "find-vedha" })` starts the wrong server. Run `npm run dev` via a background shell and point the browser at `http://localhost:3000` with `preview_start({ url: … })` / `navigate` instead.

## Design notes / refinements to make

- **Lobby vertical balance** — the Lobby content is short and leaves a lot of empty space below on tall viewports. Next design pass: vertically centre the centre column, or give the chat / a "what happens next" panel more presence.
- Design-notes log lives at `docs/design-notes.md` once we start iterating on screens.
