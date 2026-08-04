# RubiksClock

A speedcubing timer for the web that plays by WCA rules.

Most browser timers start when you tap something. A WCA competition does not
work that way: both hands go flat on the timer, inspection is limited to
fifteen seconds and is penalised if you exceed it, and the solve starts the
instant your hands leave. RubiksClock reproduces those constraints, so practice
at home behaves like the timer on the table at a competition.

It runs entirely in your browser. Solves, settings and language are kept in
`localStorage`; there is nothing to sign up for. Accounts, a shared history and
a leaderboard are the next milestone — see [`docs/ROADMAP.md`](docs/ROADMAP.md).

## The rules it implements

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

The penalty is computed from the inspection time elapsed **at the instant the
solve starts** — the moment you release the keys, not the moment you finish.
Every solve in the list can still be re-judged by hand afterwards with the
`OK` / `+2` / `DNF` buttons.

Scrambles are genuine WCA random-state scrambles, generated with
[cubing.js](https://js.cubing.net/cubing/), not a random sequence of moves that
might leave the cube nearly solved.

Next to each one is the cube it produces, drawn as a flat net — `U` on top, then
`L F R B`, with `D` below — in the WCA colours, so you can check your cube
against it once the scramble is applied. The net is computed from the scramble
rather than fetched or rendered by a library: `lib/cube/facelets.ts` applies the
moves and hands the 54 stickers to `components/scramble/cube-net.tsx`, which
draws them as inline SVG. It is not the 3D preview originally planned, because
cubing.js's `<twisty-player>` does not initialise under Next.js's bundling — the
custom element registers and takes up space but builds no DOM at all, silently,
in development and in production alike. Computing the net locally needs no lazy
chunk, no custom element and no WebGL, and being a pure function of the scramble
it renders on the server, so the cube is there on the first paint.

## The six keys

One attempt, from idle to a recorded time:

1. **Hold all six keys.** The numerals turn red while the hold is too short,
   then green after 550 ms — the Stackmat's green-light delay.
2. **Release.** Inspection starts and counts down from 15.00. It turns amber
   past 15 s (a `+2` is coming) and red past 17 s (a `DNF`).
3. **Hold all six keys again.** Red, then green after another 550 ms.
4. **Release.** The stopwatch runs.
5. **Space** stops it. The solve is recorded with whatever penalty the
   inspection earned.

`Escape` at any point abandons the attempt without recording it, and so does
leaving the tab: a hidden tab or an unfocused window cannot be trusted to
deliver key releases, so the attempt is discarded rather than mistimed.

The default keys are `Q Z D` for the left hand and `L I J` for the right — the
AZERTY layout the app was written on. They are read by **physical position**
(`KeyboardEvent.code`), not by character, so the same fingering works unchanged
on a QWERTY keyboard.

**Remapping them:** open **Settings**, click any of the six key buttons, and
press the key you want in its place. A key already bound to another slot is
refused; `Escape` cancels the capture. **Reset** puts `Q Z D / L I J` back. The
keyboard visualiser under the timer lights up each key as it goes down, which
is also the diagnostic for keyboard ghosting — if your keyboard cannot report
six simultaneous keys, you will see it there and can remap to keys it can.

Settings also holds *hide the time while solving* (competition style: you only
see the result at the end), the 8 s / 12 s sound cues, and the language. The
interface is French and English, picked from the browser's language on first
visit and switchable at any time.

On a phone there is no keyboard, so two touch pads replace the six keys: hold
both with your thumbs, release, and the sequence above is identical.

## Running it locally

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

The other scripts:

```bash
pnpm test         # vitest, once
pnpm test:watch   # vitest, watching
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm build        # production build
pnpm start        # serve the production build
```

pnpm is the package manager; `npm install` or `yarn` will produce a lockfile
this project does not use. Tests are colocated with the code they cover
(`lib/timer/machine.test.ts` next to `lib/timer/machine.ts`, and so on) and run
under vitest with jsdom and Testing Library.

## Module map

The rule engine is pure. `lib/timer/`, `lib/stats.ts` and `lib/format.ts` know
nothing about React, the DOM, the clock or the network, which is what makes the
WCA behaviour testable without a browser.

```
lib/timer/penalties.ts             Penalty type, inspectionPenalty(), effectiveMs()
lib/timer/machine.ts               The pure reducer and its selectors
lib/timer/cues.ts                  Which of the 8 s / 12 s cues are newly due
lib/stats.ts                       best, worst, mo3, ao5, ao12, session mean
lib/format.ts                      formatMs(), formatResult(), formatCountdown()
lib/settings.ts                    Settings type, defaults, load/save, change store
lib/audio.ts                       The inspection beeps (Web Audio)
lib/i18n/dictionaries.ts           Locale, Dictionary, fr + en
lib/scramble/types.ts              ScrambleProvider interface
lib/scramble/cubing-provider.ts    Client for /api/scramble
lib/cube/facelets.ts               A WCA scramble applied to a solved cube
lib/storage/types.ts               Solve, SolveRepository, createSolve()
lib/storage/local-repository.ts    localStorage implementation
lib/storage/supabase-repository.ts Stub for the accounts milestone
lib/storage/index.ts               getSolveRepository() — the swap point

hooks/useSpeedTimer.ts             The only clock- and DOM-aware timer module
hooks/use-session.ts               Repository-backed session state
hooks/use-settings.ts              Settings, subscribed across tabs

components/timer/timer-display.tsx Big numerals, state colour, aria-live
components/timer/key-hints.tsx     Six-key visualiser
components/timer/touch-pads.tsx    Two-thumb fallback
components/timer/timer-panel.tsx   Composes the above, owns the hook
components/timer/timer-screen.tsx  The page: scramble, timer, stats, solves
components/scramble/scramble-bar.tsx, cube-net.tsx
components/session/session-stats.tsx, solve-list.tsx
components/settings/settings-dialog.tsx
components/i18n-provider.tsx       Context + useI18n()
components/site-nav.tsx, coming-soon.tsx
components/ui/                     button, dialog, switch (shadcn)

app/page.tsx                       Home = the timer
app/api/scramble/route.ts          Random-state scrambles, generated in Node
app/history, app/leaderboard, app/login   Placeholders for the accounts milestone
app/layout.tsx, app/globals.css    Nav, fonts, and the state-colour tokens

supabase/schema.sql                The schema the accounts milestone will apply
docs/ROADMAP.md                    What comes next, and where it plugs in
```

## Deployment

Vercel deploys this repository with no configuration: import it, keep the
Next.js framework preset, and set **no environment variables**. There are none
to set until accounts land.

The app is not purely static, though. Every page is prerendered and the timer
itself runs entirely in the browser, but `/api/scramble` is a Route Handler
that Vercel provisions as a serverless function — cubing.js's random-state
scramble search needs a real worker that this project's browser bundle cannot
instantiate, so scrambles are generated in Node instead. That is the app's one
server dependency; it needs no configuration either.

Environment variables arrive only with the accounts milestone, as documented in
[`docs/ROADMAP.md`](docs/ROADMAP.md).
