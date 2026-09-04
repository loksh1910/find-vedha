# Find Vedha — Design System

> Dark-mode only. No light theme, no toggle. This is the single token source for every screen.
> Direction: **"Night dispatch"** — the calm, dark console a night-shift transit dispatcher watches the city network on. Restraint and density like chess.com; identity from Chennai transit signage (destination blinds, route-number blades, the node-and-line route diagram, ticket stubs).
> Built following `.claude/skills/frontend-design/SKILL.md`.

---

## 1. Design thesis

| | |
|---|---|
| **Subject** | A hidden-chase deduction game on a stylised Chennai transit network. |
| **Audience** | Friends playing together over video — game-literate, chess.com users. |
| **The platform's job** | Get friends from "let's play" into a running game fast; between games, feel like a real competitive world. |
| **Signature** | The **destination-blade** — a horizontal capsule with a 4px colour bar on its left edge and a monospace label. One idiom, used everywhere: transport legend, Detective slot tags, section eyebrows, the invite code, later the move-log rows. Plus the ambient **route diagram** (faint nodes + connectors) behind signed-out screens and the Lobby→game transition. Boldness is spent here; everything else stays quiet. |
| **Risk taken** | Committing the whole UI to transit-signage vernacular on a sodium-amber accent — the visual language of a city network at night, which is literally the game. |

### Deliberately NOT
- Not cream/serif/terracotta. Not near-black + acid-green. Not broadsheet hairline columns with zero radius.
- Background is a **soft blue-slate, never pure black** ("not over dark").
- Accent is **sodium amber**, not acid-green/vermilion. Success/danger are mint/rose, not the board's green/red.
- `01/02/03` numbering appears **only** where content is a real sequence (How-it-works steps; the Lobby's five phases), as mono route-stop numbers.
- Monospace is for genuine data (route numbers, ticket counts, codes, timers) — not decoration.

---

## 2. Colour tokens

Defined as CSS custom properties on `:root` in `src/app/globals.css`, exposed to Tailwind v4 via `@theme inline`. **Never hardcode hex in components** — use the Tailwind token classes (`bg-surface`, `text-muted`, `border-line`, `text-signal`, …).

### Neutrals / surfaces
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#161B22` | app background — soft slate, faint blue (night over the bay) |
| `--bg-inset` | `#12161C` | recessed wells: chat log, code field, board frame |
| `--surface` | `#1C232D` | cards, panels, the left rail |
| `--surface-2` | `#232C38` | inputs, hover state, popovers, menus |
| `--line` | `#2E3945` | hairline borders, route-diagram rules |
| `--line-strong` | `#3B4855` | weighted dividers, borders on `--surface-2` |

### Text
| Token | Hex | Use |
|---|---|---|
| `--text` | `#E7EDF4` | primary (soft white — not `#fff`) |
| `--text-muted` | `#9BA8B5` | secondary, labels |
| `--text-faint` | `#6A7683` | captions, disabled, node numbers at rest |

### Signal (the one accent)
| Token | Hex | Use |
|---|---|---|
| `--signal` | `#F5B23E` | primary CTAs, focus rings, active nav, the "Vedha signal", countdown rings |
| `--signal-hover` | `#FFC15A` | hover on amber surfaces |
| `--signal-ink` | `#161B22` | text/icon on an amber fill |

### Status
| Token | Hex | Use |
|---|---|---|
| `--ok` | `#57C08A` | ready / success (a mint — NOT the bus green) |
| `--danger` | `#E5657B` | leave / kick / errors (a rose — NOT the metro red) |

### Transport semantics — RESERVED
Only on the board, the transport legend, and transport/ticket chips. Never UI chrome.
| Token | Hex | Transport |
|---|---|---|
| `--t-auto` | `#E6B12E` | Auto (yellow) |
| `--t-bus` | `#3E9B4F` | Bus (green) |
| `--t-metro` | `#CE4B4B` | Metro (red) |
| `--t-river` | `#4A86C4` | River / Wildcard-only edge (blue, dashed) |

### In-game / board palette
The game screen (`/room/[code]/play`) uses a Google-Maps-dark canvas, and swaps the amber UI accent for a **cool cyan** so it doesn't compete with the yellow Auto network that covers the board.
| Token | Hex | Use |
|---|---|---|
| `--game-canvas` | `#0E1116` | board background — near-black, minimal |
| `--game-water` | `#16324A` | the river band under the dashed river edge |
| `--game-accent` | `#45CFE0` | in-game UI accent — active turn, legal-move rings, tab underlines, primary game buttons |
| `--game-accent-ink` | `#06222A` | text/icon on a `--game-accent` fill |
| `--node-ink` | `#241C08` | the station number inside the yellow capsule body |
| `--reveal` | `#FF5DB1` | Vedha's reveal marker + "Vedha surfaced" flash + "last seen" ring — magenta, pops against yellow |

**Station marker** (`node-marker.tsx`) — a vertical capsule: yellow rounded-rect body with the number, a semicircle cap above (green = Bus) and below (red = Metro). Auto-only = all yellow. Detective slot CSS vars stay `--tr-1`…`--tr-5`.

### Detective slot colours
Five, each clearly separable from amber and from the three transport hues. CSS vars keep the short `--tr-*` names.
| Token | Hex | Slot |
|---|---|---|
| `--tr-1` | `#3E9BFF` | Detective 1 — Azure |
| `--tr-2` | `#8A7BFF` | Detective 2 — Indigo |
| `--tr-3` | `#C06BF0` | Detective 3 — Violet |
| `--tr-4` | `#EE5FA3` | Detective 4 — Magenta |
| `--tr-5` | `#28C2A8` | Detective 5 — Teal |

Vedha's own colour in the Lobby / when revealed = `--signal` (amber).

---

## 3. Typography

Loaded via `next/font/google` in `layout.tsx`, exposed as CSS variables.

| Role | Family | Weights | Used for |
|---|---|---|---|
| **Display** | **Bricolage Grotesque** | 600 / 700 / 800 | wordmark, headlines, big role names ("VEDHA"), countdown numbers |
| **Body** | **Poppins** | 400 / 500 / 600 | all running text, buttons, labels, nav |
| **Data** | **IBM Plex Mono** | 400 / 500 | invite codes, route/bus numbers, node numbers, ticket counts, timers, stat figures — always `font-variant-numeric: tabular-nums` |

Fallback stacks: display/body → `system-ui, sans-serif`; data → `ui-monospace, "SF Mono", Menlo, monospace`.

### Scale (rem)
`0.75` · `0.8125` · `0.875` · `1` · `1.125` · `1.375` · `1.75` · `2.25` · `3` · `4`

- Display ≥ `1.75rem`: `letter-spacing: -0.02em`, `line-height: 1.05`.
- Body: `line-height: 1.55`.
- **Eyebrow / blade label:** IBM Plex Mono, `0.75rem`, sentence case (no `text-transform`), `--text-muted`.

---

## 4. Spacing, radius, elevation

- **Spacing scale (px):** 2, 4, 8, 12, 16, 20, 24, 32, 40, 56, 72, 96. Prefer multiples of 4.
- **Page gutter:** 24 mobile / 40 desktop. Main content `max-width: 1100px`.
- **Radius:** `--r-sm: 8px` (chips, inputs) · `--r-md: 12px` (cards, buttons) · `--r-lg: 16px` (panels, dialogs) · blades use `--r-sm` with a squared left edge where the colour bar sits.
- **Borders:** 1px `--line` default; 1px `--line-strong` on raised surfaces.
- **Elevation:** flat by default. Popovers/dialogs: `0 12px 32px -8px rgba(0,0,0,0.55)` + 1px `--line-strong`. No glows except the functional amber focus ring and the pulsing signal node.
- **Focus ring:** `outline: 2px solid var(--signal); outline-offset: 2px;` on every interactive element. Always visible on keyboard focus.

---

## 5. Motion

Near-none by design (over-animation reads as AI-generated).
- **Countdown rings** (10s role-selection, 5s auto-start): functional, `stroke-dashoffset` transition, linear.
- **Ambient route diagram:** slow opacity/position drift on nodes, ~20s loop. **Frozen entirely under `prefers-reduced-motion`.**
- **Slot claim:** 120ms ease-out settle (scale 0.98→1 + border colour).
- **Lobby → game transition:** one orchestrated ~1.5s sequence — route lines sweep in, the amber node blooms, copy fades. Skipped/instant under reduced motion.
- **Hover:** border/tint change only, 100ms. No movement.
- Tokens: `--ease: cubic-bezier(0.2, 0.6, 0.2, 1)` · durations `--d-fast: 100ms` `--d: 160ms` `--d-slow: 320ms`.

---

## 6. Core components

| Component | Notes |
|---|---|
| **Blade** | The signature. `<Blade colorVar="--tr-1" label="DETECTIVE 1" value="Azure" />` — 4px left colour bar, mono label, optional right value, `--surface` fill, `--r-sm`. (Slot CSS vars stay named `--tr-*` internally.) |
| **Button** | `primary` (amber fill, `--signal-ink` text) · `default` (`--surface-2` fill, `--line-strong` border) · `ghost` (no fill) · `danger` (rose text/border). One size 40px, `sm` 32px. Label = the exact action ("Create room", "Claim Vedha", "Ready"). |
| **Segmented code input** | 6 mono cells, paste-aware, used for invite codes on Join. |
| **Countdown ring** | SVG circle, `--signal` stroke on `--line` track, mono number centred. |
| **Left rail** | 72px icon-only / 220px icon+label. Wordmark top, nav mid, user chip bottom. Active item: amber left bar + `--text`. |
| **Player row** | avatar · name · join-order (`#1` mono) · host badge · connection dot (`--ok` / `--text-faint`) · ready pip. |
| **Slot card** | role name (display), a Blade colour tag, and `Claim` button OR claimant avatar+name. Locked state: subtle inner border in the slot colour. |
| **Dialog** (`ManualDialog`) | `--surface`, `--r-lg`, hard-unmount from parent conditional (don't trust animate-out). Scroll-locked body. |
| **Toast** | bottom-centre, `--surface-2`, mono timestamp, auto-dismiss. |
| **Route diagram** | ambient SVG background: `--line` connectors + circles, one `--signal` pulsing node. Decorative, `aria-hidden`. |

---

## 7. Quality floor (every screen, unannounced)

- Responsive to 360px width; left rail → bottom bar on mobile.
- Visible keyboard focus on everything interactive (amber ring).
- `prefers-reduced-motion` respected (diagram frozen, transition instant).
- Colour is never the only signal: Detective slots show number + colour + name; transport shows icon + colour; connection/ready show shape + colour.
- Text contrast ≥ 4.5:1 for body on its background (`--text` on `--bg`/`--surface` passes; `--text-faint` is for non-essential only).
- Copy: active voice, sentence case, an action keeps its name through the whole flow, errors say what happened + how to fix, empty states invite an action.

---

## 8. Change log

- **2026-08-30** — v1. Established for the Phase 0/1 front-of-house build (Landing → Lobby → transition), mock data, dark-only.
- **2026-08-31** — added the in-game / board palette (`--game-canvas`, `--game-accent` cyan, `--reveal` magenta, `--t-river`) and the station-marker capsule spec, for the interactive in-game mock.
