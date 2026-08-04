# RubiksClock — Design Spec

**Date:** 2026-08-03
**Status:** Approved
**Repo:** `github.com/Djo1711/RubiksClock` (public), deployed on Vercel

## 1. Purpose

A speedcubing timer for the web that reproduces the constraints of a WCA
competition: both hands must be on the keyboard, inspection is timed and
penalised, and the solve starts on key release. The first release is a
single-user, client-only tool. Accounts, solve history and a leaderboard come
later; this spec defines the seams they will plug into.

## 2. Official rules implemented

From the WCA Regulations (Article A3, A4, A6):

| Regulation | Rule | Implementation |
|---|---|---|
| A3a | Inspection is 15 seconds | Countdown from 15.00 to 0 |
| A3b1 | Warning at 8 seconds elapsed | Visual cue + optional beep |
| A3b2 | Warning at 12 seconds elapsed | Visual cue + optional double beep |
| A3c1 | Solve started after 15 s → +2 | Penalty computed automatically |
| A3c2 | Solve started after 17 s → DNF | Penalty computed automatically |
| A4a/A4b | Hands flat on the timer, fingers on the buttons, before the start | Six keys must be held simultaneously |
| A4b1 | Hands stay on the timer until the solve starts | Timer starts on key release |
| A6 | The competitor stops the timer at the end of the solve | Space stops the timer |

Penalties are computed from the inspection time elapsed **at the instant the
solve starts** (key release), and can be overridden by hand afterwards.

## 3. Interaction model

Six keys, read by **physical position** (`event.code`), defaults chosen for an
AZERTY keyboard: left hand `KeyQ` `KeyZ` `KeyD`, right hand `KeyL` `KeyI`
`KeyJ`. Remappable in settings, persisted locally. Reading positions rather
than characters means the same physical fingering works on a QWERTY keyboard.

A keyboard visualiser shows which of the six keys are currently held. This is
also the diagnostic for keyboard ghosting: some keyboards cannot report six
simultaneous keys, and the visualiser makes that visible so the user can remap.

### State machine

Transitions of a pure reducer. `HOLD_MS = 550` mirrors the Stackmat's green-light
delay.

| State | Display | Trigger | Next state |
|---|---|---|---|
| `IDLE` | Prompt to hold the six keys | all six keys down | `ARMING_INSPECTION` |
| `ARMING_INSPECTION` | Red, then green after `HOLD_MS` of continuous hold | first key released, once green | `INSPECTION` |
| | | any key released before `HOLD_MS` | `IDLE` |
| `INSPECTION` | Countdown 15 → 0; amber 15–17 s (+2); red beyond 17 s (DNF) | all six keys down | `ARMING_SOLVE` |
| | | `Escape` | `IDLE` |
| `ARMING_SOLVE` | Red, then green after `HOLD_MS` | first key released, once green | `RUNNING` (penalty frozen) |
| | | any key released before `HOLD_MS` | `INSPECTION` (inspection clock never paused) |
| `RUNNING` | Elapsed time, or a neutral marker if "hide time while solving" is on | `Space` | `STOPPED` |
| | | `Escape` | `IDLE` (attempt discarded) |
| `STOPPED` | Result, penalty chips `+2` / `DNF`, session stats | all six keys down | `ARMING_INSPECTION` (next attempt) |

Additional rules:

The solve starts on the **first** key released once the green light is on, not
on the last: on a Stackmat, lifting either hand starts the clock. Requiring all
six releases would let a competitor lift one hand early for free.

- `Escape` returns to `IDLE` from any state, discarding the attempt in progress.
- The window losing focus, or the tab becoming hidden, resets to `IDLE`. An
  in-flight `RUNNING` attempt is discarded rather than recorded with a
  suspicious time.
- `Space` is swallowed (`preventDefault`) in every state so the page never
  scrolls.
- Key repeat events are ignored; only the first `keydown` per key counts.
- The reducer holds no wall-clock of its own: every event carries a timestamp
  supplied by the caller, which is what makes it testable without fake timers.

### Timing

`performance.now()` for all measurement, `requestAnimationFrame` for display
refresh. Never `setInterval`. Times are stored as integer milliseconds and
rendered truncated to hundredths (`mm:ss.cc`), matching how WCA results are
recorded.

## 4. Module boundaries

Each module has one purpose, is used through a narrow interface, and can be
tested on its own.

```
lib/timer/machine.ts      Pure reducer: (state, event) -> state. No DOM, no clock.
lib/timer/penalties.ts    Pure: inspectionMs -> 'none' | 'plus2' | 'dnf'.
lib/stats.ts              Pure: best, mo3, ao5, ao12, WCA trimmed mean, DNF handling.
lib/format.ts             Pure: ms -> 'mm:ss.cc'.
lib/scramble/             ScrambleProvider interface + client for /api/scramble.
lib/cube/facelets.ts      Pure: WCA scramble -> the cube's 54 stickers.
lib/storage/              SolveRepository interface.
                          LocalSolveRepository  — localStorage, shipped now.
                          SupabaseSolveRepository — stub, wired later.
hooks/useSpeedTimer.ts    The only place that touches the keyboard and rAF;
                          translates DOM events into machine events.
components/               TimerDisplay, ScrambleBar, CubeNet, KeyHints,
                          SessionStats, SolveList, SettingsSheet, LanguageToggle.
```

The UI reads and writes solves only through `SolveRepository`, so swapping
localStorage for Supabase does not touch a single component.

### Data model

```ts
type Penalty = 'none' | 'plus2' | 'dnf'

type Solve = {
  id: string             // uuid
  createdAt: string      // ISO 8601
  puzzle: '3x3'          // widened later
  scramble: string
  rawMs: number          // measured solve time
  inspectionMs: number   // inspection elapsed at solve start
  penalty: Penalty
  // effective time = rawMs + 2000 when penalty === 'plus2'; DNF has no time
}
```

Statistics follow WCA conventions: an average of 5 drops the best and the worst
and means the middle three; one DNF counts as the worst; two or more DNFs make
the average a DNF.

## 5. Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, pnpm. The
timer itself is entirely client-side: no network call sits between a key press
and the clock.

Scrambles: `cubing.js` random-state scrambles (the same class of scramble used
in competition), generated by a `/api/scramble` Route Handler on the Node
runtime, and shown beside a 2D net of the scrambled cube.

The net is not the 3D preview this spec originally called for. `cubing.js`'s
`<twisty-player>` does not initialise under Next.js's bundling: the custom
element registers and is laid out, but builds no DOM at all — no shadow root,
no canvas, no pixels — silently, in dev and in production alike, for both its
2D and its 3D visualisation. Rather than depend on the library in the browser,
`lib/cube/facelets.ts` computes the 54 stickers from the scramble itself and
`components/scramble/cube-net.tsx` draws them as inline SVG. That is pure
computation: no lazy chunk, no custom element, no WebGL, and — being a pure
function of the scramble — server-renderable, so the cube is there on the first
paint instead of arriving after a client-side load.

Generation runs on the server for a specific reason: `cubing.js` computes
random-state scrambles in a web worker, and Next.js does not emit that worker's
sibling chunks, so the browser build 404s on them — a known, unresolved upstream
incompatibility (cubing/cubing.js#309, #327). Running the same library in Node
sidesteps it and yields identical scrambles in 15–150 ms. The cost is that the
app is no longer purely static: it needs one serverless function, which Vercel
provisions with no configuration. The `ScrambleProvider` interface keeps that
choice reversible — if the upstream bug is fixed, only
`lib/scramble/cubing-provider.ts` changes.

Interface language: French and English, texts centralised in a translation
module with a language toggle persisted locally.

## 6. Visual design

Dark-first, modern, quiet. Oversized monospace numerals as the focal point.
State is carried primarily by colour — idle neutral, arming red then green,
inspection blue shading to amber then red, running neutral — so it is readable
peripherally while the user's attention is on the cube. Transitions are short
and respect `prefers-reduced-motion`. Layout is responsive; on touch devices a
two-thumb hold zone replaces the six keys.

Accessibility: state changes are announced to screen readers, colour is never
the only signal (labels accompany every state), contrast meets WCAG AA.

## 7. Prepared for the next steps

Built now, inert until activated:

- `supabase/schema.sql` — `profiles`, `sessions`, `solves`, a `leaderboard`
  view, and row-level security policies restricting each user to their own rows.
- `SolveRepository` interface with the Supabase implementation stubbed and
  throwing an explicit "not configured yet" error.
- Routes `/history`, `/leaderboard`, `/login` as styled "coming soon" pages, so
  navigation and layout already account for them.
- `docs/ROADMAP.md` — the exact steps to enable accounts: create the Supabase
  project, run the schema, set the environment variables, swap the repository
  implementation, migrate existing local solves on first sign-in.

Deliberately out of scope for this release: multiple puzzle types, sharing,
video, algorithm trainers, and anything requiring a server.

## 8. Testing

Vitest over the pure logic, written test-first:

- `machine` — every transition in the table above, including release before
  `HOLD_MS` in both arming states, `Escape` in each state, ignored key repeats,
  and reset on blur.
- `penalties` — boundaries at exactly 15.000 s and 17.000 s, and either side.
- `stats` — ao5/ao12 trimming, one DNF, two DNFs, insufficient sample sizes.
- `format` — sub-second, minute rollover, truncation rather than rounding.
- `LocalSolveRepository` — round-trip, corrupted payload, empty storage.

The keyboard flow itself is verified manually in a browser before delivery: a
full attempt, an inspection overrun into +2 and into DNF, an early release, and
a blur mid-solve.

## 9. Definition of done

`pnpm build` and `pnpm test` pass, the manual keyboard checks above behave as
specified, the repo is pushed to `github.com/Djo1711/RubiksClock`, and the app
is deployable on Vercel with no configuration.
