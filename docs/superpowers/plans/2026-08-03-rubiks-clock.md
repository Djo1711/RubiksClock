# RubiksClock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a WCA-faithful speedcubing timer web app: six-key two-hand hold-to-start, 15-second penalised inspection, space to stop, session statistics — deployable on Vercel with no server.

**Architecture:** All timing logic lives in pure, dependency-free modules (`reduce(state, event, config)` for the state machine, pure functions for penalties, formatting and statistics) that are unit-tested without a DOM or a clock. Exactly one module (`hooks/useSpeedTimer.ts`) translates DOM keyboard events and `requestAnimationFrame` into machine events. The UI reads and writes solves only through a `SolveRepository` interface, whose localStorage implementation ships now and whose Supabase implementation is stubbed for the accounts milestone.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI primitives), `cubing.js` (random-state scrambles + 3D preview), Vitest 4 + Testing Library, pnpm.

## Global Constraints

- Spec of record: `docs/superpowers/specs/2026-08-03-rubiks-clock-design.md`. Read it before Task 1.
- Package manager is **pnpm**. Never run `npm install` or `yarn`.
- Work from the repository root. Git is already initialised on branch `main` with the spec committed. The repo-local git identity is already configured — do not change it.
- Import alias is `@/*` mapped to the repo root. No `src/` directory.
- `HOLD_MS = 550`, `INSPECTION_MS = 15000`, `INSPECTION_PLUS2_LIMIT_MS = 17000`. These live in code as named constants, never as inline literals outside their defining module.
- All measured times are integer milliseconds. Display truncates to hundredths, never rounds up.
- Timing uses `performance.now()` and `requestAnimationFrame`. `setInterval` and `setTimeout` are forbidden for anything a user can see the time of.
- Keyboard input is read by physical position (`event.code`), never by character (`event.key`), except for `Space` and `Escape` which are read via `event.code` as `'Space'` and `'Escape'`.
- Every test file imports its helpers explicitly from `vitest` (`import { describe, it, expect } from 'vitest'`). Vitest globals are **off**.
- Every task ends with a commit. Commit messages are Conventional Commits (`feat:`, `test:`, `docs:`, `chore:`) and end with the trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- UI text is never hardcoded in components. It comes from the dictionary in `lib/i18n/dictionaries.ts` (Task 7). Tasks 9–13 must add any new string to both `fr` and `en`.
- Do not create the GitHub remote or push until Task 14.

---

## File Structure

Created over the course of the plan:

```
lib/timer/penalties.ts        Penalty type, inspectionPenalty(), effectiveMs()      Task 2
lib/format.ts                 formatMs(), formatResult(), formatCountdown()         Task 3
lib/timer/machine.ts          Pure reducer + selectors                              Task 4
lib/stats.ts                  best/worst/mo3/ao5/ao12/session mean                  Task 5
lib/storage/types.ts          Solve, SolveRepository interface, createSolve()       Task 6
lib/storage/local-repository.ts   localStorage implementation                        Task 6
lib/storage/supabase-repository.ts  stub for the accounts milestone                  Task 6
lib/storage/index.ts          getSolveRepository() — the swap point                  Task 6
lib/i18n/dictionaries.ts      Locale, Dictionary, fr + en                            Task 7
components/i18n-provider.tsx  Context + useT()                                       Task 7
hooks/useSpeedTimer.ts        The only DOM/clock-aware module                        Task 8
components/timer/timer-display.tsx   Big numerals + state colour + aria-live         Task 9
components/timer/key-hints.tsx       Six-key visualiser                              Task 9
components/timer/touch-pads.tsx      Two-thumb fallback                              Task 9
components/timer/timer-panel.tsx     Composes the above, owns the hook               Task 9
app/page.tsx                  Home = the timer                                       Task 9
lib/scramble/types.ts         ScrambleProvider interface                             Task 10
lib/scramble/cubing-provider.ts  cubing.js random-state implementation               Task 10
components/scramble/scramble-bar.tsx, cube-preview.tsx                               Task 10
hooks/use-session.ts          Repository-backed session state                        Task 11
components/session/session-stats.tsx, solve-list.tsx                                 Task 11
lib/settings.ts               Settings type, defaults, load/save                     Task 12
lib/audio.ts                  Inspection beeps (WebAudio)                            Task 12
components/settings/settings-dialog.tsx                                              Task 12
components/site-nav.tsx, components/coming-soon.tsx                                  Task 13
app/history/page.tsx, app/leaderboard/page.tsx, app/login/page.tsx                   Task 13
supabase/schema.sql, docs/ROADMAP.md                                                 Task 13
README.md                                                                            Task 14
```

---

## Task 1: Project scaffold, test harness, UI primitives

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `components.json`, `components/ui/*` (all generated)
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `pnpm dev` / `pnpm build` / `pnpm test`, the `@/*` import alias, and the shadcn primitives `Button`, `Switch`, `Dialog` under `components/ui/`.

- [ ] **Step 1: Scaffold Next.js into a scratch directory**

`create-next-app` refuses to run in a directory that already contains `docs/`, so scaffold outside and copy in.

```bash
cd "$(git rev-parse --show-toplevel)"
SCAFFOLD="${TMPDIR:-/tmp}/rc-scaffold"
rm -rf "$SCAFFOLD"
pnpm create next-app@latest "$SCAFFOLD" --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm --turbopack --disable-git
```

Expected: ends with `Success! Created rc-scaffold`.

- [ ] **Step 2: Copy the scaffold into the repo and install**

```bash
cd "$(git rev-parse --show-toplevel)"
SCAFFOLD="${TMPDIR:-/tmp}/rc-scaffold"
rsync -a --exclude node_modules --exclude .git --exclude .gitignore --exclude README.md "$SCAFFOLD"/ .
pnpm install
```

Then replace `.gitignore` with:

```gitignore
.claude/
node_modules/
.next/
out/
next-env.d.ts
*.tsbuildinfo
.env*.local
.vercel
.DS_Store
```

- [ ] **Step 3: Add the test harness**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event
```

Create `vitest.config.mts` (the `.mts` extension keeps Vite's native config
loader from warning about ESM syntax in a CommonJS-loaded file):

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['{app,components,hooks,lib}/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': import.meta.dirname },
  },
})
```

Create `vitest.setup.ts`:

```ts
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

- [ ] **Step 4: Add scripts to `package.json`**

Set the `scripts` block to exactly:

```json
{
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run --passWithNoTests",
  "test:watch": "vitest"
}
```

- [ ] **Step 5: Verify the harness runs**

```bash
pnpm test && pnpm typecheck && pnpm build
```

Expected: `No test files found, exiting with code 0`, no TypeScript errors, and a successful Next.js build listing route `/`.

- [ ] **Step 6: Install the shadcn/ui primitives**

```bash
pnpm dlx shadcn@latest init -d
pnpm dlx shadcn@latest add button switch dialog --yes
```

Expected: `components.json` created and `components/ui/button.tsx`, `switch.tsx`, `dialog.tsx` present.

- [ ] **Step 7: Verify the build still passes and commit**

```bash
pnpm build
git add -A
git commit -m "$(cat <<'EOF'
chore: scaffold Next.js app with Vitest and shadcn/ui

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Inspection penalties

**Files:**
- Create: `lib/timer/penalties.ts`
- Test: `lib/timer/penalties.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Penalty = 'none' | 'plus2' | 'dnf'`
  - `const INSPECTION_MS = 15000`, `const INSPECTION_PLUS2_LIMIT_MS = 17000`, `const PLUS2_MS = 2000`
  - `inspectionPenalty(inspectionMs: number): Penalty`
  - `effectiveMs(rawMs: number, penalty: Penalty): number | null` — `null` means DNF (no comparable time)

- [ ] **Step 1: Write the failing tests**

Create `lib/timer/penalties.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { effectiveMs, inspectionPenalty } from './penalties'

describe('inspectionPenalty', () => {
  it('returns none well inside the 15 second limit', () => {
    expect(inspectionPenalty(9_000)).toBe('none')
  })

  it('returns none at exactly 15 seconds (A3c1 penalises exceeding it)', () => {
    expect(inspectionPenalty(15_000)).toBe('none')
  })

  it('returns plus2 one millisecond past 15 seconds', () => {
    expect(inspectionPenalty(15_001)).toBe('plus2')
  })

  it('returns plus2 at exactly 17 seconds', () => {
    expect(inspectionPenalty(17_000)).toBe('plus2')
  })

  it('returns dnf one millisecond past 17 seconds', () => {
    expect(inspectionPenalty(17_001)).toBe('dnf')
  })
})

describe('effectiveMs', () => {
  it('leaves an unpenalised time untouched', () => {
    expect(effectiveMs(12_340, 'none')).toBe(12_340)
  })

  it('adds two seconds for plus2', () => {
    expect(effectiveMs(12_340, 'plus2')).toBe(14_340)
  })

  it('returns null for dnf', () => {
    expect(effectiveMs(12_340, 'dnf')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test lib/timer/penalties`
Expected: FAIL — `Failed to resolve import "./penalties"`.

- [ ] **Step 3: Write the implementation**

Create `lib/timer/penalties.ts`:

```ts
/** WCA A3a: inspection is 15 seconds. */
export const INSPECTION_MS = 15_000

/** WCA A3c2: starting the solve past 17 seconds of inspection is a DNF. */
export const INSPECTION_PLUS2_LIMIT_MS = 17_000

/** WCA A3c1: the penalty for exceeding the inspection time. */
export const PLUS2_MS = 2_000

export type Penalty = 'none' | 'plus2' | 'dnf'

/**
 * The penalty incurred by the inspection time elapsed at the moment the solve
 * started. Exceeding 15 s is +2 (A3c1); exceeding 17 s is a DNF (A3c2).
 */
export function inspectionPenalty(inspectionMs: number): Penalty {
  if (inspectionMs > INSPECTION_PLUS2_LIMIT_MS) return 'dnf'
  if (inspectionMs > INSPECTION_MS) return 'plus2'
  return 'none'
}

/** The comparable time for a solve, or null when it does not have one (DNF). */
export function effectiveMs(rawMs: number, penalty: Penalty): number | null {
  if (penalty === 'dnf') return null
  return penalty === 'plus2' ? rawMs + PLUS2_MS : rawMs
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test lib/timer/penalties`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/timer/penalties.ts lib/timer/penalties.test.ts
git commit -m "$(cat <<'EOF'
feat: add WCA inspection penalty rules

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Time formatting

**Files:**
- Create: `lib/format.ts`
- Test: `lib/format.test.ts`

**Interfaces:**
- Consumes: `Penalty`, `effectiveMs` from `@/lib/timer/penalties`.
- Produces:
  - `formatMs(ms: number): string` — `'9.87'`, `'12.34'`, `'1:02.34'`
  - `formatResult(rawMs: number, penalty: Penalty): string` — `'DNF'`, or the effective time with a `'+'` marker for +2
  - `formatCountdown(remainingMs: number): string` — whole seconds, clamped at `'0'`

- [ ] **Step 1: Write the failing tests**

Create `lib/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatCountdown, formatMs, formatResult } from './format'

describe('formatMs', () => {
  it('formats sub-minute times without a leading zero', () => {
    expect(formatMs(9_870)).toBe('9.87')
  })

  it('pads hundredths', () => {
    expect(formatMs(9_800)).toBe('9.80')
    expect(formatMs(9_805)).toBe('9.80')
  })

  it('truncates rather than rounds, like a Stackmat display', () => {
    expect(formatMs(9_879)).toBe('9.87')
  })

  it('formats minutes with padded seconds', () => {
    expect(formatMs(62_340)).toBe('1:02.34')
  })

  it('formats a whole minute', () => {
    expect(formatMs(60_000)).toBe('1:00.00')
  })

  it('clamps negatives to zero', () => {
    expect(formatMs(-500)).toBe('0.00')
  })
})

describe('formatResult', () => {
  it('renders an unpenalised solve as its raw time', () => {
    expect(formatResult(12_340, 'none')).toBe('12.34')
  })

  it('renders a plus2 as the penalised time with a marker', () => {
    expect(formatResult(12_340, 'plus2')).toBe('14.34+')
  })

  it('renders a dnf as DNF', () => {
    expect(formatResult(12_340, 'dnf')).toBe('DNF')
  })
})

describe('formatCountdown', () => {
  it('shows whole seconds remaining, rounded up', () => {
    expect(formatCountdown(14_100)).toBe('15')
    expect(formatCountdown(8_001)).toBe('9')
  })

  it('clamps to zero once the inspection time is spent', () => {
    expect(formatCountdown(-2_400)).toBe('0')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test lib/format`
Expected: FAIL — `Failed to resolve import "./format"`.

- [ ] **Step 3: Write the implementation**

Create `lib/format.ts`:

```ts
import { effectiveMs, type Penalty } from '@/lib/timer/penalties'

function pad2(value: number): string {
  return value.toString().padStart(2, '0')
}

/**
 * Milliseconds as a competition-style time, truncated to hundredths the way a
 * Stackmat display truncates: 9.879 s reads as 9.87.
 */
export function formatMs(ms: number): string {
  const total = Math.max(0, Math.trunc(ms))
  const hundredths = Math.floor(total / 10) % 100
  const seconds = Math.floor(total / 1_000) % 60
  const minutes = Math.floor(total / 60_000)
  return minutes > 0
    ? `${minutes}:${pad2(seconds)}.${pad2(hundredths)}`
    : `${seconds}.${pad2(hundredths)}`
}

/** A finished solve, penalty included. */
export function formatResult(rawMs: number, penalty: Penalty): string {
  const effective = effectiveMs(rawMs, penalty)
  if (effective === null) return 'DNF'
  return penalty === 'plus2' ? `${formatMs(effective)}+` : formatMs(effective)
}

/** Whole seconds left in the inspection, never negative. */
export function formatCountdown(remainingMs: number): string {
  return Math.max(0, Math.ceil(remainingMs / 1_000)).toString()
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test lib/format`
Expected: PASS — 11 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/format.ts lib/format.test.ts
git commit -m "$(cat <<'EOF'
feat: add competition-style time formatting

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: The timer state machine

This is the heart of the app. It is a pure reducer: it owns no clock, so every
event carries the timestamp the caller observed. That is what makes the hold
delay and the inspection overrun testable without fake timers.

**Files:**
- Create: `lib/timer/machine.ts`
- Test: `lib/timer/machine.test.ts`

**Interfaces:**
- Consumes: `INSPECTION_MS`, `Penalty`, `inspectionPenalty` from `@/lib/timer/penalties`.
- Produces:
  - `const HOLD_MS = 550`
  - `const DEFAULT_KEYS: readonly string[]` — `['KeyQ','KeyZ','KeyD','KeyL','KeyI','KeyJ']`
  - `type TimerStatus = 'idle' | 'armingInspection' | 'inspection' | 'armingSolve' | 'running' | 'stopped'`
  - `type TimerState`, `type TimerEvent`, `type TimerConfig`
  - `const defaultConfig: TimerConfig`, `const initialState: TimerState`
  - `reduce(state: TimerState, event: TimerEvent, config: TimerConfig): TimerState`
  - `isArmed(state, now, config): boolean`
  - `inspectionElapsedMs(state, now): number`, `inspectionRemainingMs(state, now, config): number`
  - `solveElapsedMs(state, now): number`

- [ ] **Step 1: Write the failing tests**

Create `lib/timer/machine.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_KEYS,
  HOLD_MS,
  defaultConfig,
  initialState,
  inspectionRemainingMs,
  isArmed,
  reduce,
  solveElapsedMs,
  type TimerEvent,
  type TimerState,
} from './machine'

const [L1, L2, , R1] = DEFAULT_KEYS

const down = (code: string, at: number): TimerEvent => ({ type: 'keyDown', code, at })
const up = (code: string, at: number): TimerEvent => ({ type: 'keyUp', code, at })
const allDown = (at: number): TimerEvent[] => DEFAULT_KEYS.map((code) => down(code, at))

function feed(events: TimerEvent[], from: TimerState = initialState): TimerState {
  return events.reduce((state, event) => reduce(state, event, defaultConfig), from)
}

/** All six keys held at t=0, released at t=HOLD_MS: inspection starts. */
function intoInspection(): TimerState {
  return feed([...allDown(0), up(L1, HOLD_MS)])
}

/**
 * Inspection starts at t=HOLD_MS. Arming at t=inspectionMs and releasing one
 * hold delay later starts the solve exactly `inspectionMs` into the inspection.
 */
function intoRunning(inspectionMs: number): TimerState {
  const armAt = inspectionMs
  return feed([...allDown(armAt), up(L1, armAt + HOLD_MS)], intoInspection())
}

describe('idle', () => {
  it('accumulates held keys without arming', () => {
    const state = feed([down(L1, 0), down(L2, 10)])
    expect(state.status).toBe('idle')
    expect(state.heldKeys).toEqual([L1, L2])
  })

  it('ignores a repeated keyDown for a key already held', () => {
    const state = feed([down(L1, 0), down(L1, 5)])
    expect(state.heldKeys).toEqual([L1])
  })

  it('ignores keys outside the configured six', () => {
    const state = feed([down('KeyX', 0)])
    expect(state.heldKeys).toEqual([])
  })

  it('arms once all six keys are held', () => {
    const state = feed(allDown(0))
    expect(state.status).toBe('armingInspection')
    expect(state.armedAt).toBe(0)
  })

  it('forgets a released key', () => {
    const state = feed([down(L1, 0), up(L1, 5)])
    expect(state.heldKeys).toEqual([])
  })
})

describe('armingInspection', () => {
  it('is not armed before the hold delay and is armed after it', () => {
    const state = feed(allDown(0))
    expect(isArmed(state, HOLD_MS - 1, defaultConfig)).toBe(false)
    expect(isArmed(state, HOLD_MS, defaultConfig)).toBe(true)
  })

  it('returns to idle when a key is released too early', () => {
    const state = feed([...allDown(0), up(L1, HOLD_MS - 1)])
    expect(state.status).toBe('idle')
    expect(state.armedAt).toBeNull()
  })

  it('starts the inspection on the first release once armed', () => {
    const state = intoInspection()
    expect(state.status).toBe('inspection')
    expect(state.inspectionStartedAt).toBe(HOLD_MS)
  })

  it('counts the inspection down from 15 seconds', () => {
    const state = intoInspection()
    expect(inspectionRemainingMs(state, HOLD_MS, defaultConfig)).toBe(15_000)
    expect(inspectionRemainingMs(state, HOLD_MS + 6_000, defaultConfig)).toBe(9_000)
    expect(inspectionRemainingMs(state, HOLD_MS + 16_000, defaultConfig)).toBe(-1_000)
  })
})

describe('inspection', () => {
  it('arms the solve once all six keys are held again', () => {
    const state = feed(allDown(5_000), intoInspection())
    expect(state.status).toBe('armingSolve')
    expect(state.armedAt).toBe(5_000)
  })

  it('ignores space', () => {
    const state = feed([{ type: 'stop', at: 5_000 }], intoInspection())
    expect(state.status).toBe('inspection')
  })
})

describe('armingSolve', () => {
  it('returns to inspection when released too early, without pausing the inspection clock', () => {
    const state = feed([...allDown(5_000), up(L1, 5_000 + HOLD_MS - 1)], intoInspection())
    expect(state.status).toBe('inspection')
    expect(state.inspectionStartedAt).toBe(HOLD_MS)
    expect(state.armedAt).toBeNull()
  })

  it('starts the solve on the first release once armed', () => {
    const state = feed([...allDown(5_000), up(L1, 5_000 + HOLD_MS)], intoInspection())
    expect(state.status).toBe('running')
    expect(state.solveStartedAt).toBe(5_000 + HOLD_MS)
  })

  it('freezes the inspection time and its penalty at the moment the solve starts', () => {
    const state = intoRunning(9_000)
    expect(state.inspectionMs).toBe(9_000)
    expect(state.penalty).toBe('none')
  })

  it('awards +2 when the solve starts past 15 seconds of inspection', () => {
    expect(intoRunning(15_500).penalty).toBe('plus2')
  })

  it('awards a DNF when the solve starts past 17 seconds of inspection', () => {
    expect(intoRunning(17_500).penalty).toBe('dnf')
  })
})

describe('running', () => {
  it('reports the elapsed solve time', () => {
    const state = intoRunning(9_000)
    expect(solveElapsedMs(state, state.solveStartedAt! + 12_340)).toBe(12_340)
  })

  it('records the raw time when space stops it', () => {
    const running = intoRunning(9_000)
    const state = reduce(
      running,
      { type: 'stop', at: running.solveStartedAt! + 12_340 },
      defaultConfig,
    )
    expect(state.status).toBe('stopped')
    expect(state.rawMs).toBe(12_340)
  })

  it('ignores the six keys so a solve cannot be re-armed mid-attempt', () => {
    const running = intoRunning(9_000)
    const state = feed(allDown(running.solveStartedAt! + 1_000), running)
    expect(state.status).toBe('running')
    expect(state.heldKeys).toEqual([])
  })

  it('ignores the keyUp of the key whose release started the solve', () => {
    const running = intoRunning(9_000)
    const state = feed([up(R1, running.solveStartedAt! + 20)], running)
    expect(state.status).toBe('running')
  })
})

describe('stopped', () => {
  it('starts the next attempt when the six keys are held again, clearing the result', () => {
    const running = intoRunning(9_000)
    const stopped = reduce(
      running,
      { type: 'stop', at: running.solveStartedAt! + 12_340 },
      defaultConfig,
    )
    const state = feed(allDown(100_000), stopped)
    expect(state.status).toBe('armingInspection')
    expect(state.rawMs).toBeNull()
    expect(state.inspectionMs).toBeNull()
    expect(state.penalty).toBe('none')
  })
})

describe('abort', () => {
  it('returns any state to the initial state', () => {
    for (const state of [
      feed(allDown(0)),
      intoInspection(),
      feed(allDown(5_000), intoInspection()),
      intoRunning(9_000),
    ]) {
      expect(reduce(state, { type: 'abort' }, defaultConfig)).toEqual(initialState)
    }
  })
})

describe('custom key maps', () => {
  it('arms on the configured keys only', () => {
    const config = { ...defaultConfig, keys: ['KeyA', 'KeyB'] as const }
    const state = [
      { type: 'keyDown', code: 'KeyA', at: 0 } as const,
      { type: 'keyDown', code: 'KeyB', at: 0 } as const,
    ].reduce((s, e) => reduce(s, e, config), initialState)
    expect(state.status).toBe('armingInspection')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test lib/timer/machine`
Expected: FAIL — `Failed to resolve import "./machine"`.

- [ ] **Step 3: Write the implementation**

Create `lib/timer/machine.ts`:

```ts
import { INSPECTION_MS, inspectionPenalty, type Penalty } from './penalties'

/** Mirrors the Stackmat's green-light delay. */
export const HOLD_MS = 550

/**
 * Physical key positions, not characters: these are the AZERTY home-row and
 * upper-row keys under each hand, and the same positions on a QWERTY board.
 */
export const DEFAULT_KEYS = ['KeyQ', 'KeyZ', 'KeyD', 'KeyL', 'KeyI', 'KeyJ'] as const

export type TimerStatus =
  | 'idle'
  | 'armingInspection'
  | 'inspection'
  | 'armingSolve'
  | 'running'
  | 'stopped'

export type TimerState = {
  status: TimerStatus
  /** Configured keys currently held, in the order they were pressed. */
  heldKeys: readonly string[]
  /** When every configured key became held, in either arming state. */
  armedAt: number | null
  inspectionStartedAt: number | null
  solveStartedAt: number | null
  /** Inspection elapsed at the instant the solve started. */
  inspectionMs: number | null
  /** Measured solve time, set when the timer stops. */
  rawMs: number | null
  penalty: Penalty
}

export type TimerEvent =
  | { type: 'keyDown'; code: string; at: number }
  | { type: 'keyUp'; code: string; at: number }
  /** Space. */
  | { type: 'stop'; at: number }
  /** Escape, window blur, or tab hidden. */
  | { type: 'abort' }

export type TimerConfig = {
  keys: readonly string[]
  holdMs: number
  inspectionMs: number
}

export const defaultConfig: TimerConfig = {
  keys: DEFAULT_KEYS,
  holdMs: HOLD_MS,
  inspectionMs: INSPECTION_MS,
}

export const initialState: TimerState = {
  status: 'idle',
  heldKeys: [],
  armedAt: null,
  inspectionStartedAt: null,
  solveStartedAt: null,
  inspectionMs: null,
  rawMs: null,
  penalty: 'none',
}

/** True once the hold has lasted long enough to show the green light. */
export function isArmed(state: TimerState, now: number, config: TimerConfig): boolean {
  if (state.armedAt === null) return false
  return now - state.armedAt >= config.holdMs
}

export function inspectionElapsedMs(state: TimerState, now: number): number {
  if (state.inspectionStartedAt === null) return 0
  return now - state.inspectionStartedAt
}

export function inspectionRemainingMs(
  state: TimerState,
  now: number,
  config: TimerConfig,
): number {
  return config.inspectionMs - inspectionElapsedMs(state, now)
}

export function solveElapsedMs(state: TimerState, now: number): number {
  if (state.solveStartedAt === null) return 0
  return now - state.solveStartedAt
}

function withKeyDown(state: TimerState, code: string, config: TimerConfig): TimerState {
  if (!config.keys.includes(code) || state.heldKeys.includes(code)) return state
  const heldKeys = [...state.heldKeys, code]
  if (heldKeys.length < config.keys.length) return { ...state, heldKeys }
  return {
    ...state,
    heldKeys,
    status: state.status === 'inspection' ? 'armingSolve' : 'armingInspection',
    armedAt: null,
  }
}

export function reduce(
  state: TimerState,
  event: TimerEvent,
  config: TimerConfig,
): TimerState {
  if (event.type === 'abort') return initialState

  switch (state.status) {
    case 'idle':
    case 'stopped': {
      if (event.type !== 'keyDown') {
        if (event.type === 'keyUp') {
          return { ...state, heldKeys: state.heldKeys.filter((key) => key !== event.code) }
        }
        return state
      }
      const next = withKeyDown(state, event.code, config)
      if (next.status !== 'armingInspection') return next
      // A new attempt begins: clear the previous result.
      return {
        ...initialState,
        status: 'armingInspection',
        heldKeys: next.heldKeys,
        armedAt: event.at,
      }
    }

    case 'armingInspection': {
      if (event.type !== 'keyUp') return state
      if (!isArmed(state, event.at, config)) {
        return {
          ...state,
          status: 'idle',
          heldKeys: state.heldKeys.filter((key) => key !== event.code),
          armedAt: null,
        }
      }
      return {
        ...state,
        status: 'inspection',
        heldKeys: [],
        armedAt: null,
        inspectionStartedAt: event.at,
      }
    }

    case 'inspection': {
      if (event.type === 'keyDown') {
        const next = withKeyDown(state, event.code, config)
        return next.status === 'armingSolve' ? { ...next, armedAt: event.at } : next
      }
      if (event.type === 'keyUp') {
        return { ...state, heldKeys: state.heldKeys.filter((key) => key !== event.code) }
      }
      return state
    }

    case 'armingSolve': {
      if (event.type !== 'keyUp') return state
      if (!isArmed(state, event.at, config)) {
        return {
          ...state,
          status: 'inspection',
          heldKeys: state.heldKeys.filter((key) => key !== event.code),
          armedAt: null,
        }
      }
      const inspectionMs = inspectionElapsedMs(state, event.at)
      return {
        ...state,
        status: 'running',
        heldKeys: [],
        armedAt: null,
        solveStartedAt: event.at,
        inspectionMs,
        penalty: inspectionPenalty(inspectionMs),
      }
    }

    case 'running': {
      if (event.type !== 'stop') return state
      return { ...state, status: 'stopped', rawMs: solveElapsedMs(state, event.at) }
    }
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test lib/timer/machine`
Expected: PASS — 23 tests.

- [ ] **Step 5: Run the whole suite and typecheck**

```bash
pnpm test && pnpm typecheck
```

Expected: all tests pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add lib/timer/machine.ts lib/timer/machine.test.ts
git commit -m "$(cat <<'EOF'
feat: add pure timer state machine

Six-key arming with a 550ms hold, inspection countdown, solve start on
first release, and penalties frozen at solve start.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Session statistics

**Files:**
- Create: `lib/stats.ts`
- Test: `lib/stats.test.ts`

**Interfaces:**
- Consumes: `Penalty`, `effectiveMs` from `@/lib/timer/penalties`.
- Produces:
  - `type Attempt = { rawMs: number; penalty: Penalty }`
  - `mean(attempts: Attempt[]): number | null` — DNF-intolerant, used for mo3 and the session mean
  - `trimmedAverage(attempts: Attempt[]): number | null` — drops best and worst
  - `sessionStats(attempts: Attempt[]): SessionStats`
  - `type SessionStats = { count: number; best: number | null; worst: number | null; mo3: number | null; ao5: number | null; ao12: number | null; sessionMean: number | null }`

WCA conventions to honour: a DNF sorts as the worst attempt, so a single DNF in
an average of 5 is the dropped worst and the average still stands; two or more
DNFs make the average a DNF. Averages are rounded to the nearest hundredth.

- [ ] **Step 1: Write the failing tests**

Create `lib/stats.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mean, sessionStats, trimmedAverage, type Attempt } from './stats'

const ok = (rawMs: number): Attempt => ({ rawMs, penalty: 'none' })
const dnf = (rawMs: number): Attempt => ({ rawMs, penalty: 'dnf' })
const plus2 = (rawMs: number): Attempt => ({ rawMs, penalty: 'plus2' })

describe('mean', () => {
  it('averages the effective times', () => {
    expect(mean([ok(10_000), ok(12_000), ok(14_000)])).toBe(12_000)
  })

  it('counts the +2 in the effective time', () => {
    // Effective times are 10 000, 10 000 and 12 000: a mean of 10 666.67 ms,
    // which rounds to the nearest hundredth as 10 670 ms.
    expect(mean([ok(10_000), ok(10_000), plus2(10_000)])).toBe(10_670)
  })

  it('is a DNF as soon as one attempt is a DNF', () => {
    expect(mean([ok(10_000), ok(12_000), dnf(14_000)])).toBeNull()
  })

  it('is null for an empty list', () => {
    expect(mean([])).toBeNull()
  })

  it('rounds to the nearest hundredth', () => {
    expect(mean([ok(10_000), ok(10_000), ok(10_007)])).toBe(10_000)
    expect(mean([ok(10_000), ok(10_000), ok(10_020)])).toBe(10_010)
  })
})

describe('trimmedAverage', () => {
  it('drops the best and the worst', () => {
    expect(trimmedAverage([ok(8_000), ok(10_000), ok(12_000), ok(14_000), ok(30_000)])).toBe(
      12_000,
    )
  })

  it('treats a single DNF as the dropped worst', () => {
    expect(trimmedAverage([ok(8_000), ok(10_000), ok(12_000), ok(14_000), dnf(9_000)])).toBe(
      12_000,
    )
  })

  it('is a DNF with two or more DNFs', () => {
    expect(
      trimmedAverage([ok(8_000), ok(10_000), ok(12_000), dnf(14_000), dnf(9_000)]),
    ).toBeNull()
  })

  it('is null below three attempts', () => {
    expect(trimmedAverage([ok(8_000), ok(10_000)])).toBeNull()
  })
})

describe('sessionStats', () => {
  it('reports zeroes for an empty session', () => {
    expect(sessionStats([])).toEqual({
      count: 0,
      best: null,
      worst: null,
      mo3: null,
      ao5: null,
      ao12: null,
      sessionMean: null,
    })
  })

  it('reports the best and worst effective times, ignoring DNFs', () => {
    const stats = sessionStats([ok(15_000), ok(9_000), dnf(3_000)])
    expect(stats.best).toBe(9_000)
    expect(stats.worst).toBe(15_000)
    expect(stats.count).toBe(3)
  })

  it('computes mo3 and ao5 over the most recent attempts', () => {
    const attempts = [ok(30_000), ok(8_000), ok(10_000), ok(12_000), ok(14_000), ok(20_000)]
    expect(sessionStats(attempts).mo3).toBe(mean(attempts.slice(-3)))
    expect(sessionStats(attempts).ao5).toBe(trimmedAverage(attempts.slice(-5)))
  })

  it('leaves ao12 null until twelve attempts exist', () => {
    expect(sessionStats(Array.from({ length: 11 }, () => ok(10_000))).ao12).toBeNull()
    expect(sessionStats(Array.from({ length: 12 }, () => ok(10_000))).ao12).toBe(10_000)
  })

  it('excludes DNFs from the session mean', () => {
    expect(sessionStats([ok(10_000), ok(14_000), dnf(5_000)]).sessionMean).toBe(12_000)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test lib/stats`
Expected: FAIL — `Failed to resolve import "./stats"`.

- [ ] **Step 3: Write the implementation**

Create `lib/stats.ts`:

```ts
import { effectiveMs, type Penalty } from '@/lib/timer/penalties'

export type Attempt = { rawMs: number; penalty: Penalty }

export type SessionStats = {
  count: number
  best: number | null
  worst: number | null
  mo3: number | null
  ao5: number | null
  ao12: number | null
  sessionMean: number | null
}

/** WCA 9f2: results are expressed to the nearest hundredth of a second. */
function roundToHundredth(ms: number): number {
  return Math.round(ms / 10) * 10
}

function times(attempts: Attempt[]): (number | null)[] {
  return attempts.map((attempt) => effectiveMs(attempt.rawMs, attempt.penalty))
}

/** The mean of every attempt, or null if any of them is a DNF. */
export function mean(attempts: Attempt[]): number | null {
  if (attempts.length === 0) return null
  const values = times(attempts)
  if (values.some((value) => value === null)) return null
  const total = (values as number[]).reduce((sum, value) => sum + value, 0)
  return roundToHundredth(total / values.length)
}

/**
 * The WCA average: drop the best and the worst, mean the rest. A DNF sorts as
 * the worst attempt, so one DNF is absorbed and two make the average a DNF.
 */
export function trimmedAverage(attempts: Attempt[]): number | null {
  if (attempts.length < 3) return null
  const values = times(attempts)
  if (values.filter((value) => value === null).length >= 2) return null
  const sorted = values
    .map((value) => (value === null ? Number.POSITIVE_INFINITY : value))
    .sort((a, b) => a - b)
  const middle = sorted.slice(1, -1)
  const total = middle.reduce((sum, value) => sum + value, 0)
  return roundToHundredth(total / middle.length)
}

/** `attempts` is chronological, oldest first. */
export function sessionStats(attempts: Attempt[]): SessionStats {
  const solved = times(attempts).filter((value): value is number => value !== null)
  return {
    count: attempts.length,
    best: solved.length > 0 ? Math.min(...solved) : null,
    worst: solved.length > 0 ? Math.max(...solved) : null,
    mo3: attempts.length >= 3 ? mean(attempts.slice(-3)) : null,
    ao5: attempts.length >= 5 ? trimmedAverage(attempts.slice(-5)) : null,
    ao12: attempts.length >= 12 ? trimmedAverage(attempts.slice(-12)) : null,
    sessionMean:
      solved.length > 0
        ? roundToHundredth(solved.reduce((sum, value) => sum + value, 0) / solved.length)
        : null,
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test lib/stats`
Expected: PASS — 14 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/stats.ts lib/stats.test.ts
git commit -m "$(cat <<'EOF'
feat: add WCA session statistics

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Solve storage

**Files:**
- Create: `lib/storage/types.ts`, `lib/storage/local-repository.ts`, `lib/storage/supabase-repository.ts`, `lib/storage/index.ts`
- Test: `lib/storage/local-repository.test.ts`

**Interfaces:**
- Consumes: `Penalty` from `@/lib/timer/penalties`.
- Produces:
  - `type Puzzle = '3x3'`
  - `type Solve = { id: string; createdAt: string; puzzle: Puzzle; scramble: string; rawMs: number; inspectionMs: number; penalty: Penalty }`
  - `createSolve(input: Omit<Solve, 'id' | 'createdAt' | 'puzzle'> & { puzzle?: Puzzle }): Solve`
  - `interface SolveRepository { list(); add(solve); updatePenalty(id, penalty); remove(id); clear() }` — every method returns a promise
  - `createLocalSolveRepository(storage?: Storage): SolveRepository`
  - `createSupabaseSolveRepository(): SolveRepository` (throws until configured)
  - `getSolveRepository(): SolveRepository`

- [ ] **Step 1: Write the failing tests**

Create `lib/storage/local-repository.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { createLocalSolveRepository, STORAGE_KEY } from './local-repository'
import { createSolve } from './types'

function attempt(rawMs: number) {
  return createSolve({ scramble: "R U R' U'", rawMs, inspectionMs: 9_000, penalty: 'none' })
}

describe('createLocalSolveRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts empty', async () => {
    await expect(createLocalSolveRepository().list()).resolves.toEqual([])
  })

  it('round-trips a solve', async () => {
    const repository = createLocalSolveRepository()
    const solve = attempt(12_340)
    await repository.add(solve)
    await expect(repository.list()).resolves.toEqual([solve])
  })

  it('returns solves oldest first', async () => {
    const repository = createLocalSolveRepository()
    const older = { ...attempt(12_340), createdAt: '2026-08-01T10:00:00.000Z' }
    const newer = { ...attempt(11_110), createdAt: '2026-08-02T10:00:00.000Z' }
    await repository.add(newer)
    await repository.add(older)
    const solves = await repository.list()
    expect(solves.map((solve) => solve.rawMs)).toEqual([12_340, 11_110])
  })

  it('updates a penalty', async () => {
    const repository = createLocalSolveRepository()
    const solve = attempt(12_340)
    await repository.add(solve)
    await repository.updatePenalty(solve.id, 'plus2')
    const [stored] = await repository.list()
    expect(stored.penalty).toBe('plus2')
  })

  it('removes a solve', async () => {
    const repository = createLocalSolveRepository()
    const solve = attempt(12_340)
    await repository.add(solve)
    await repository.remove(solve.id)
    await expect(repository.list()).resolves.toEqual([])
  })

  it('clears the session', async () => {
    const repository = createLocalSolveRepository()
    await repository.add(attempt(12_340))
    await repository.clear()
    await expect(repository.list()).resolves.toEqual([])
  })

  it('ignores a corrupted payload instead of throwing', async () => {
    localStorage.setItem(STORAGE_KEY, 'not json')
    await expect(createLocalSolveRepository().list()).resolves.toEqual([])
  })

  it('drops entries that are not shaped like solves', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 'x' }, attempt(12_340)]))
    const solves = await createLocalSolveRepository().list()
    expect(solves).toHaveLength(1)
  })
})

describe('createSolve', () => {
  it('assigns an id, a timestamp and the 3x3 puzzle', () => {
    const solve = createSolve({
      scramble: "R U R' U'",
      rawMs: 12_340,
      inspectionMs: 9_000,
      penalty: 'none',
    })
    expect(solve.id).toMatch(/[0-9a-f-]{36}/)
    expect(Number.isNaN(Date.parse(solve.createdAt))).toBe(false)
    expect(solve.puzzle).toBe('3x3')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test lib/storage`
Expected: FAIL — `Failed to resolve import "./local-repository"`.

- [ ] **Step 3: Write the types**

Create `lib/storage/types.ts`:

```ts
import type { Penalty } from '@/lib/timer/penalties'

export type Puzzle = '3x3'

export type Solve = {
  id: string
  /** ISO 8601. */
  createdAt: string
  puzzle: Puzzle
  scramble: string
  /** Measured solve time in milliseconds, before any penalty. */
  rawMs: number
  /** Inspection elapsed at the instant the solve started. */
  inspectionMs: number
  penalty: Penalty
}

/**
 * Where solves live. The localStorage implementation ships today; the Supabase
 * one takes over when accounts land, without any change to the UI.
 */
export interface SolveRepository {
  list(): Promise<Solve[]>
  add(solve: Solve): Promise<void>
  updatePenalty(id: string, penalty: Penalty): Promise<void>
  remove(id: string): Promise<void>
  clear(): Promise<void>
}

export function createSolve(
  input: Omit<Solve, 'id' | 'createdAt' | 'puzzle'> & { puzzle?: Puzzle },
): Solve {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    puzzle: input.puzzle ?? '3x3',
    scramble: input.scramble,
    rawMs: input.rawMs,
    inspectionMs: input.inspectionMs,
    penalty: input.penalty,
  }
}

export function isSolve(value: unknown): value is Solve {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.createdAt === 'string' &&
    candidate.puzzle === '3x3' &&
    typeof candidate.scramble === 'string' &&
    typeof candidate.rawMs === 'number' &&
    typeof candidate.inspectionMs === 'number' &&
    (candidate.penalty === 'none' ||
      candidate.penalty === 'plus2' ||
      candidate.penalty === 'dnf')
  )
}
```

- [ ] **Step 4: Write the localStorage implementation**

Create `lib/storage/local-repository.ts`:

```ts
import type { Penalty } from '@/lib/timer/penalties'
import { isSolve, type Solve, type SolveRepository } from './types'

export const STORAGE_KEY = 'rubiksclock.solves.v1'

function read(storage: Storage | null): Solve[] {
  if (!storage) return []
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter(isSolve)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

function write(storage: Storage | null, solves: Solve[]): void {
  storage?.setItem(STORAGE_KEY, JSON.stringify(solves))
}

/**
 * Solves in the browser's localStorage. Falls back to a no-op on the server,
 * where there is no storage to read.
 */
export function createLocalSolveRepository(
  storage: Storage | null = typeof window === 'undefined' ? null : window.localStorage,
): SolveRepository {
  return {
    async list() {
      return read(storage)
    },
    async add(solve: Solve) {
      write(storage, [...read(storage), solve])
    },
    async updatePenalty(id: string, penalty: Penalty) {
      write(
        storage,
        read(storage).map((solve) => (solve.id === id ? { ...solve, penalty } : solve)),
      )
    },
    async remove(id: string) {
      write(
        storage,
        read(storage).filter((solve) => solve.id !== id),
      )
    },
    async clear() {
      storage?.removeItem(STORAGE_KEY)
    },
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test lib/storage`
Expected: PASS — 9 tests.

- [ ] **Step 6: Add the Supabase stub and the swap point**

Create `lib/storage/supabase-repository.ts`:

```ts
import type { SolveRepository } from './types'

const NOT_CONFIGURED =
  'The Supabase solve repository is not configured yet. See docs/ROADMAP.md, "Accounts and history".'

/**
 * Placeholder for the accounts milestone. Every method throws until the
 * Supabase project exists and `getSolveRepository()` is pointed here.
 */
export function createSupabaseSolveRepository(): SolveRepository {
  const reject = () => Promise.reject(new Error(NOT_CONFIGURED))
  return {
    list: reject,
    add: reject,
    updatePenalty: reject,
    remove: reject,
    clear: reject,
  }
}
```

Create `lib/storage/index.ts`:

```ts
import { createLocalSolveRepository } from './local-repository'
import type { SolveRepository } from './types'

export { createSolve, type Puzzle, type Solve, type SolveRepository } from './types'
export { STORAGE_KEY } from './local-repository'

/**
 * The single place that decides where solves live. When accounts land, return
 * the Supabase repository for signed-in users and keep the local one for
 * guests — no component changes needed.
 */
export function getSolveRepository(): SolveRepository {
  return createLocalSolveRepository()
}
```

- [ ] **Step 7: Typecheck and commit**

```bash
pnpm test && pnpm typecheck
git add lib/storage
git commit -m "$(cat <<'EOF'
feat: add solve repository with localStorage implementation

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Bilingual text

**Files:**
- Create: `lib/i18n/dictionaries.ts`, `components/i18n-provider.tsx`
- Modify: `app/layout.tsx`
- Test: `lib/i18n/dictionaries.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Locale = 'fr' | 'en'`, `const locales: readonly Locale[]`
  - `type Dictionary` (the key set below), `const dictionaries: Record<Locale, Dictionary>`
  - `<I18nProvider>` and `useI18n(): { locale, setLocale, t: Dictionary }`
  - `LOCALE_STORAGE_KEY = 'rubiksclock.locale'`

- [ ] **Step 1: Write the failing test**

Create `lib/i18n/dictionaries.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { dictionaries, locales } from './dictionaries'

describe('dictionaries', () => {
  it('covers every locale', () => {
    expect(Object.keys(dictionaries).sort()).toEqual([...locales].sort())
  })

  it('defines the same keys in every locale, with no empty string', () => {
    const reference = Object.keys(dictionaries.fr).sort()
    for (const locale of locales) {
      expect(Object.keys(dictionaries[locale]).sort()).toEqual(reference)
      for (const [key, value] of Object.entries(dictionaries[locale])) {
        expect(value, `${locale}.${key}`).not.toBe('')
      }
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test lib/i18n`
Expected: FAIL — `Failed to resolve import "./dictionaries"`.

- [ ] **Step 3: Write the dictionaries**

Create `lib/i18n/dictionaries.ts`:

```ts
export const locales = ['fr', 'en'] as const

export type Locale = (typeof locales)[number]

export type Dictionary = {
  appName: string
  tagline: string
  navTimer: string
  navHistory: string
  navLeaderboard: string
  navSignIn: string
  idleHint: string
  armingHint: string
  readyHint: string
  releaseHint: string
  inspectionLabel: string
  plus2Warning: string
  dnfWarning: string
  runningHint: string
  stoppedHint: string
  abortHint: string
  scramble: string
  newScramble: string
  scrambleLoading: string
  statsTitle: string
  best: string
  worst: string
  mo3: string
  ao5: string
  ao12: string
  sessionMean: string
  solveCount: string
  solvesTitle: string
  noSolves: string
  penaltyNone: string
  penaltyPlus2: string
  penaltyDnf: string
  deleteSolve: string
  clearSession: string
  clearSessionConfirm: string
  cancel: string
  settings: string
  settingsKeys: string
  settingsKeysHint: string
  settingsKeysCapture: string
  settingsKeysReset: string
  settingsHideTime: string
  settingsHideTimeHint: string
  settingsSounds: string
  settingsSoundsHint: string
  settingsLanguage: string
  ghostingHint: string
  comingSoonTitle: string
  comingSoonBody: string
  backToTimer: string
}

export const dictionaries: Record<Locale, Dictionary> = {
  fr: {
    appName: 'RubiksClock',
    tagline: 'Chronomètre de speedcubing aux règles WCA',
    navTimer: 'Chrono',
    navHistory: 'Historique',
    navLeaderboard: 'Classement',
    navSignIn: 'Se connecter',
    idleHint: 'Maintiens les six touches des deux mains',
    armingHint: 'Continue de maintenir…',
    readyHint: 'Prêt — relâche pour lancer l’inspection',
    releaseHint: 'Prêt — relâche pour démarrer le solve',
    inspectionLabel: 'Inspection',
    plus2Warning: '+2 : inspection dépassée',
    dnfWarning: 'DNF : plus de 17 secondes d’inspection',
    runningHint: 'Espace pour arrêter',
    stoppedHint: 'Maintiens les six touches pour le solve suivant',
    abortHint: 'Échap pour annuler',
    scramble: 'Mélange',
    newScramble: 'Nouveau mélange',
    scrambleLoading: 'Génération du mélange…',
    statsTitle: 'Statistiques de la session',
    best: 'Meilleur',
    worst: 'Pire',
    mo3: 'mo3',
    ao5: 'ao5',
    ao12: 'ao12',
    sessionMean: 'Moyenne',
    solveCount: 'Solves',
    solvesTitle: 'Solves de la session',
    noSolves: 'Aucun solve pour le moment.',
    penaltyNone: 'OK',
    penaltyPlus2: '+2',
    penaltyDnf: 'DNF',
    deleteSolve: 'Supprimer ce solve',
    clearSession: 'Vider la session',
    clearSessionConfirm: 'Supprimer tous les solves de cette session ?',
    cancel: 'Annuler',
    settings: 'Réglages',
    settingsKeys: 'Touches',
    settingsKeysHint:
      'Les touches sont lues par position physique, donc le même placement de doigts marche en AZERTY comme en QWERTY.',
    settingsKeysCapture: 'Appuie sur une touche…',
    settingsKeysReset: 'Rétablir Q Z D / L I J',
    settingsHideTime: 'Masquer le temps pendant le solve',
    settingsHideTimeHint: 'Comme en compétition : tu ne vois le temps qu’à la fin.',
    settingsSounds: 'Signaux sonores',
    settingsSoundsHint: 'Bips aux 8 et 12 secondes d’inspection (règles A3b1 et A3b2).',
    settingsLanguage: 'Langue',
    ghostingHint:
      'Ton clavier ne remonte pas les six touches en même temps ? Change-les dans les réglages.',
    comingSoonTitle: 'Bientôt disponible',
    comingSoonBody:
      'Cette page arrive avec les comptes utilisateurs. En attendant, tes solves sont enregistrés dans ce navigateur.',
    backToTimer: 'Retour au chrono',
  },
  en: {
    appName: 'RubiksClock',
    tagline: 'A speedcubing timer that plays by WCA rules',
    navTimer: 'Timer',
    navHistory: 'History',
    navLeaderboard: 'Leaderboard',
    navSignIn: 'Sign in',
    idleHint: 'Hold the six keys with both hands',
    armingHint: 'Keep holding…',
    readyHint: 'Ready — release to start inspection',
    releaseHint: 'Ready — release to start the solve',
    inspectionLabel: 'Inspection',
    plus2Warning: '+2: inspection exceeded',
    dnfWarning: 'DNF: inspection past 17 seconds',
    runningHint: 'Space to stop',
    stoppedHint: 'Hold the six keys for the next solve',
    abortHint: 'Escape to cancel',
    scramble: 'Scramble',
    newScramble: 'New scramble',
    scrambleLoading: 'Generating scramble…',
    statsTitle: 'Session statistics',
    best: 'Best',
    worst: 'Worst',
    mo3: 'mo3',
    ao5: 'ao5',
    ao12: 'ao12',
    sessionMean: 'Mean',
    solveCount: 'Solves',
    solvesTitle: 'Session solves',
    noSolves: 'No solves yet.',
    penaltyNone: 'OK',
    penaltyPlus2: '+2',
    penaltyDnf: 'DNF',
    deleteSolve: 'Delete this solve',
    clearSession: 'Clear session',
    clearSessionConfirm: 'Delete every solve in this session?',
    cancel: 'Cancel',
    settings: 'Settings',
    settingsKeys: 'Keys',
    settingsKeysHint:
      'Keys are read by physical position, so the same fingering works on AZERTY and QWERTY.',
    settingsKeysCapture: 'Press a key…',
    settingsKeysReset: 'Reset to Q Z D / L I J',
    settingsHideTime: 'Hide the time while solving',
    settingsHideTimeHint: 'Competition style: you only see the result at the end.',
    settingsSounds: 'Sound cues',
    settingsSoundsHint: 'Beeps at 8 and 12 seconds of inspection (A3b1 and A3b2).',
    settingsLanguage: 'Language',
    ghostingHint:
      'Keyboard not reporting all six keys at once? Remap them in the settings.',
    comingSoonTitle: 'Coming soon',
    comingSoonBody:
      'This page arrives with user accounts. Until then your solves are stored in this browser.',
    backToTimer: 'Back to the timer',
  },
}

export const LOCALE_STORAGE_KEY = 'rubiksclock.locale'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test lib/i18n`
Expected: PASS — 2 tests.

- [ ] **Step 5: Write the provider**

Create `components/i18n-provider.tsx`:

```tsx
'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  dictionaries,
  isLocale,
  LOCALE_STORAGE_KEY,
  type Dictionary,
  type Locale,
} from '@/lib/i18n/dictionaries'

type I18nValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Dictionary
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr')

  // Resolve the stored or browser locale after mount, so the server-rendered
  // markup and the first client render agree.
  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isLocale(stored)) {
      setLocaleState(stored)
      return
    }
    setLocaleState(navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en')
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
    setLocaleState(next)
  }, [])

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t: dictionaries[locale] }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>')
  return value
}
```

- [ ] **Step 6: Wrap the app**

Modify `app/layout.tsx`: import `I18nProvider` and wrap `{children}` with it. Set the exported metadata to:

```tsx
export const metadata: Metadata = {
  title: 'RubiksClock',
  description: 'A speedcubing timer that plays by WCA rules.',
}
```

Set `<html lang="fr">` (the provider updates it on the client).

- [ ] **Step 7: Verify and commit**

```bash
pnpm test && pnpm typecheck && pnpm build
git add lib/i18n components/i18n-provider.tsx app/layout.tsx
git commit -m "$(cat <<'EOF'
feat: add French and English dictionaries with a locale provider

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: The keyboard and clock adapter

**Files:**
- Create: `hooks/useSpeedTimer.ts`
- Test: `hooks/useSpeedTimer.test.tsx`

**Interfaces:**
- Consumes: everything from `@/lib/timer/machine`, `Penalty` from `@/lib/timer/penalties`.
- Produces:
  - `type SolveResult = { rawMs: number; inspectionMs: number; penalty: Penalty }`
  - `type UseSpeedTimerOptions = { config?: TimerConfig; now?: () => number; onSolveComplete?: (result: SolveResult) => void }`
  - `useSpeedTimer(options?): { state: TimerState; now: number; armed: boolean; press: (code: string) => void; release: (code: string) => void }`

`press`/`release` exist so the touch pads in Task 9 can drive the same machine
without synthesising keyboard events. `now` is injectable so tests can control
the hold delay without fake timers.

- [ ] **Step 1: Write the failing tests**

Create `hooks/useSpeedTimer.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_KEYS, HOLD_MS } from '@/lib/timer/machine'
import { useSpeedTimer } from './useSpeedTimer'

function setup() {
  let clock = 0
  const now = () => clock
  const onSolveComplete = vi.fn()
  const view = renderHook(() => useSpeedTimer({ now, onSolveComplete }))
  const advance = (ms: number) => {
    clock += ms
  }
  const keyDown = (code: string) =>
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }))
    })
  const keyUp = (code: string) =>
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }))
    })
  const holdAll = () => DEFAULT_KEYS.forEach(keyDown)
  return { view, advance, keyDown, keyUp, holdAll, onSolveComplete }
}

describe('useSpeedTimer', () => {
  it('arms on the six keys and starts the inspection on release', () => {
    const { view, advance, holdAll, keyUp } = setup()
    holdAll()
    expect(view.result.current.state.status).toBe('armingInspection')
    expect(view.result.current.armed).toBe(false)
    advance(HOLD_MS)
    keyUp(DEFAULT_KEYS[0])
    expect(view.result.current.state.status).toBe('inspection')
  })

  it('starts the solve, then stops it on space and reports the result', () => {
    const { view, advance, holdAll, keyUp, onSolveComplete } = setup()
    holdAll()
    advance(HOLD_MS)
    keyUp(DEFAULT_KEYS[0])
    advance(9_000)
    holdAll()
    advance(HOLD_MS)
    keyUp(DEFAULT_KEYS[0])
    expect(view.result.current.state.status).toBe('running')
    advance(12_340)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }))
    })
    expect(view.result.current.state.status).toBe('stopped')
    expect(onSolveComplete).toHaveBeenCalledWith({
      rawMs: 12_340,
      inspectionMs: 9_000 + HOLD_MS,
      penalty: 'none',
    })
  })

  it('aborts on escape', () => {
    const { view, holdAll } = setup()
    holdAll()
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }))
    })
    expect(view.result.current.state.status).toBe('idle')
  })

  it('aborts when the window loses focus', () => {
    const { view, holdAll } = setup()
    holdAll()
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })
    expect(view.result.current.state.status).toBe('idle')
  })

  it('ignores key repeats', () => {
    const { view } = setup()
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: DEFAULT_KEYS[0], repeat: true, bubbles: true }),
      )
    })
    expect(view.result.current.state.heldKeys).toEqual([])
  })

  it('ignores keys typed into a text field', () => {
    const input = document.createElement('input')
    document.body.append(input)
    const { view } = setup()
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { code: DEFAULT_KEYS[0], bubbles: true }),
      )
    })
    expect(view.result.current.state.heldKeys).toEqual([])
    input.remove()
  })

  it('ignores keys pressed inside a [data-timer-ignore] subtree', () => {
    const panel = document.createElement('div')
    panel.setAttribute('data-timer-ignore', '')
    const button = document.createElement('button')
    panel.append(button)
    document.body.append(panel)
    const { view } = setup()
    act(() => {
      button.dispatchEvent(
        new KeyboardEvent('keydown', { code: DEFAULT_KEYS[0], bubbles: true }),
      )
    })
    expect(view.result.current.state.heldKeys).toEqual([])
    panel.remove()
  })

  it('publishes a fresh now from the animation frame loop while counting', async () => {
    const { view, advance, holdAll } = setup()
    holdAll()
    expect(view.result.current.now).toBe(0)
    expect(view.result.current.armed).toBe(false)
    advance(HOLD_MS)
    // Two frames: the loop's own callback runs before one scheduled here.
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    })
    expect(view.result.current.now).toBe(HOLD_MS)
    expect(view.result.current.armed).toBe(true)
  })

  it('does not schedule animation frames while idle', () => {
    const scheduled = vi.spyOn(globalThis, 'requestAnimationFrame')
    setup()
    expect(scheduled).not.toHaveBeenCalled()
    scheduled.mockRestore()
  })

  it('drives the machine from the touch pad helpers', () => {
    const { view, advance } = setup()
    act(() => {
      DEFAULT_KEYS.forEach((code) => view.result.current.press(code))
    })
    expect(view.result.current.state.status).toBe('armingInspection')
    advance(HOLD_MS)
    act(() => {
      view.result.current.release(DEFAULT_KEYS[0])
    })
    expect(view.result.current.state.status).toBe('inspection')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test hooks/useSpeedTimer`
Expected: FAIL — `Failed to resolve import "./useSpeedTimer"`.

- [ ] **Step 3: Write the implementation**

Create `hooks/useSpeedTimer.ts`:

```ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  defaultConfig,
  initialState,
  isArmed,
  reduce,
  type TimerConfig,
  type TimerEvent,
  type TimerState,
} from '@/lib/timer/machine'
import type { Penalty } from '@/lib/timer/penalties'

export type SolveResult = {
  rawMs: number
  inspectionMs: number
  penalty: Penalty
}

export type UseSpeedTimerOptions = {
  config?: TimerConfig
  /** Injectable clock; defaults to performance.now. */
  now?: () => number
  onSolveComplete?: (result: SolveResult) => void
}

const LIVE_STATUSES: ReadonlySet<TimerState['status']> = new Set([
  'armingInspection',
  'inspection',
  'armingSolve',
  'running',
])

/**
 * Keys typed into a field, or pressed while focus sits inside a panel marked
 * `data-timer-ignore` (settings dialog, solve list, navigation), belong to that
 * UI and must not drive the timer.
 */
function shouldIgnore(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true
  return target.closest('[data-timer-ignore]') !== null
}

export function useSpeedTimer(options: UseSpeedTimerOptions = {}) {
  const config = options.config ?? defaultConfig
  const [state, setState] = useState<TimerState>(initialState)
  const [now, setNow] = useState(0)

  const configRef = useRef(config)
  configRef.current = config
  const nowRef = useRef(options.now)
  nowRef.current = options.now
  const onSolveCompleteRef = useRef(options.onSolveComplete)
  onSolveCompleteRef.current = options.onSolveComplete

  const clock = useCallback(() => (nowRef.current ?? performance.now)(), [])

  const dispatch = useCallback((event: TimerEvent) => {
    setState((current) => reduce(current, event, configRef.current))
  }, [])

  const press = useCallback(
    (code: string) => dispatch({ type: 'keyDown', code, at: clock() }),
    [clock, dispatch],
  )
  const release = useCallback(
    (code: string) => dispatch({ type: 'keyUp', code, at: clock() }),
    [clock, dispatch],
  )

  // Keyboard is the only input the machine cares about.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || shouldIgnore(event.target)) return
      if (event.code === 'Space') {
        event.preventDefault()
        dispatch({ type: 'stop', at: clock() })
        return
      }
      if (event.code === 'Escape') {
        dispatch({ type: 'abort' })
        return
      }
      if (!configRef.current.keys.includes(event.code)) return
      event.preventDefault()
      dispatch({ type: 'keyDown', code: event.code, at: clock() })
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (shouldIgnore(event.target)) return
      if (!configRef.current.keys.includes(event.code)) return
      event.preventDefault()
      dispatch({ type: 'keyUp', code: event.code, at: clock() })
    }

    // A hidden tab or an unfocused window cannot be trusted to deliver keyups,
    // so the attempt in progress is discarded rather than mistimed.
    const onAbort = () => dispatch({ type: 'abort' })
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') onAbort()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onAbort)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onAbort)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [clock, dispatch])

  // One rAF loop, running only while something is actually counting.
  useEffect(() => {
    if (!LIVE_STATUSES.has(state.status)) return
    let frame = 0
    const tick = () => {
      setNow(clock())
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [clock, state.status])

  useEffect(() => {
    if (state.status !== 'stopped') return
    if (state.rawMs === null || state.inspectionMs === null) return
    onSolveCompleteRef.current?.({
      rawMs: state.rawMs,
      inspectionMs: state.inspectionMs,
      penalty: state.penalty,
    })
  }, [state.inspectionMs, state.penalty, state.rawMs, state.status])

  return {
    state,
    now: LIVE_STATUSES.has(state.status) ? now : clock(),
    armed: isArmed(state, now, config),
    press,
    release,
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test hooks/useSpeedTimer`
Expected: PASS — 10 tests.

The `armed` flag in the first test is `false` before advancing because the rAF
loop has not yet published a `now` past the hold delay. If `armed` flickers in
the browser, that is a bug in the rAF effect, not in the machine.

The two animation-frame tests are the only ones that exercise the loop itself:
jsdom fires `requestAnimationFrame` on a real macrotask, so a synchronous
`act()` never lets a tick run. Both were verified by sabotage — removing the
`LIVE_STATUSES` gate fails the idle test, removing the effect fails the tick
test.

- [ ] **Step 5: Commit**

```bash
pnpm test && pnpm typecheck
git add hooks/useSpeedTimer.ts hooks/useSpeedTimer.test.tsx
git commit -m "$(cat <<'EOF'
feat: bind keyboard and animation frames to the timer machine

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: The timer screen

**Files:**
- Create: `components/timer/timer-display.tsx`, `components/timer/key-hints.tsx`, `components/timer/touch-pads.tsx`, `components/timer/timer-panel.tsx`, `components/timer/timer-screen.tsx`
- Modify: `app/page.tsx`, `app/globals.css`
- Test: `components/timer/timer-display.test.tsx`

**Interfaces:**
- Consumes: `useSpeedTimer`, `useI18n`, `formatMs`, `formatCountdown`, `formatResult`, the machine selectors.
- Produces:
  - `type TimerPhase = 'idle' | 'arming' | 'ready' | 'inspection' | 'inspectionPlus2' | 'inspectionDnf' | 'running' | 'stopped'`
  - `timerPhase(state, now, armed, config): TimerPhase`
  - `<TimerDisplay phase value hint />`, `<KeyHints keys held />`, `<TouchPads onPress onRelease keys />`, `<TimerPanel config hideTimeWhileSolving onSolveComplete />`, `<TimerScreen />`
  - `keyLabel(code: string): string` from `key-hints.tsx`

- [ ] **Step 1: Get the visual direction**

Invoke the `ui-ux-pro-max` skill for a dark-first palette, a display/monospace
type pairing, and the state-colour ramp for: idle (neutral), arming (red),
ready (green), inspection (blue), inspection +2 (amber), inspection DNF (red),
running (neutral), stopped (neutral with accent). Record the chosen CSS custom
properties in `app/globals.css` under `@theme`, using the names
`--color-state-idle`, `--color-state-arming`, `--color-state-ready`,
`--color-state-inspection`, `--color-state-warn`, `--color-state-danger`.

Constraints on the result, from the spec:

- Every state colour must reach WCAG AA contrast against the page background.
  Check each one; the amber and the green are the usual offenders.
- Colour is never the only signal — each state also has its hint text, which
  Task 9 already renders.
- Append this to `app/globals.css` so the state transitions respect the user's
  motion preference:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

Do not skip this step: Tasks 9–13 all consume these tokens.

- [ ] **Step 2: Write the failing test**

Create `components/timer/timer-display.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defaultConfig, initialState, type TimerState } from '@/lib/timer/machine'
import { TimerDisplay, timerPhase } from './timer-display'

const at = (state: Partial<TimerState>): TimerState => ({ ...initialState, ...state })

describe('timerPhase', () => {
  it('is idle at rest', () => {
    expect(timerPhase(initialState, 0, false, defaultConfig)).toBe('idle')
  })

  it('is arming while the hold is too short, then ready', () => {
    const state = at({ status: 'armingInspection', armedAt: 0 })
    expect(timerPhase(state, 100, false, defaultConfig)).toBe('arming')
    expect(timerPhase(state, 600, true, defaultConfig)).toBe('ready')
  })

  it('escalates the inspection through +2 and DNF', () => {
    const state = at({ status: 'inspection', inspectionStartedAt: 0 })
    expect(timerPhase(state, 9_000, false, defaultConfig)).toBe('inspection')
    expect(timerPhase(state, 15_500, false, defaultConfig)).toBe('inspectionPlus2')
    expect(timerPhase(state, 17_500, false, defaultConfig)).toBe('inspectionDnf')
  })
})

describe('TimerDisplay', () => {
  it('renders the value and the hint, and announces changes politely', () => {
    render(<TimerDisplay phase="inspection" value="12" hint="Inspection" />)
    expect(screen.getByText('12')).not.toBeNull()
    expect(screen.getByText('Inspection')).not.toBeNull()
    expect(screen.getByRole('status')).not.toBeNull()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test components/timer`
Expected: FAIL — `Failed to resolve import "./timer-display"`.

- [ ] **Step 4: Write the display**

Create `components/timer/timer-display.tsx`:

```tsx
'use client'

import {
  inspectionElapsedMs,
  isArmed,
  type TimerConfig,
  type TimerState,
} from '@/lib/timer/machine'
import { INSPECTION_MS, INSPECTION_PLUS2_LIMIT_MS } from '@/lib/timer/penalties'

export type TimerPhase =
  | 'idle'
  | 'arming'
  | 'ready'
  | 'inspection'
  | 'inspectionPlus2'
  | 'inspectionDnf'
  | 'running'
  | 'stopped'

/** The single source of truth for what the screen looks like right now. */
export function timerPhase(
  state: TimerState,
  now: number,
  armed: boolean,
  config: TimerConfig,
): TimerPhase {
  switch (state.status) {
    case 'idle':
      return 'idle'
    case 'stopped':
      return 'stopped'
    case 'running':
      return 'running'
    case 'armingInspection':
    case 'armingSolve':
      return armed || isArmed(state, now, config) ? 'ready' : 'arming'
    case 'inspection': {
      const elapsed = inspectionElapsedMs(state, now)
      if (elapsed > INSPECTION_PLUS2_LIMIT_MS) return 'inspectionDnf'
      if (elapsed > INSPECTION_MS) return 'inspectionPlus2'
      return 'inspection'
    }
  }
}

const PHASE_COLOR: Record<TimerPhase, string> = {
  idle: 'text-(--color-state-idle)',
  arming: 'text-(--color-state-arming)',
  ready: 'text-(--color-state-ready)',
  inspection: 'text-(--color-state-inspection)',
  inspectionPlus2: 'text-(--color-state-warn)',
  inspectionDnf: 'text-(--color-state-danger)',
  running: 'text-(--color-state-idle)',
  stopped: 'text-(--color-state-idle)',
}

export function TimerDisplay({
  phase,
  value,
  hint,
}: {
  phase: TimerPhase
  value: string
  hint: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 select-none"
    >
      <span
        className={`font-mono text-[clamp(4rem,18vw,11rem)] leading-none tabular-nums transition-colors duration-150 ${PHASE_COLOR[phase]}`}
      >
        {value}
      </span>
      <span className="text-sm tracking-wide text-neutral-400 uppercase">{hint}</span>
    </div>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test components/timer`
Expected: PASS — 4 tests.

- [ ] **Step 6: Write the key visualiser**

Create `components/timer/key-hints.tsx`:

```tsx
'use client'

/** The character to draw for a physical key position, AZERTY-labelled. */
const KEY_LABEL: Record<string, string> = {
  KeyA: 'A', KeyB: 'B', KeyC: 'C', KeyD: 'D', KeyE: 'E', KeyF: 'F', KeyG: 'G',
  KeyH: 'H', KeyI: 'I', KeyJ: 'J', KeyK: 'K', KeyL: 'L', KeyM: 'M', KeyN: 'N',
  KeyO: 'O', KeyP: 'P', KeyQ: 'Q', KeyR: 'R', KeyS: 'S', KeyT: 'T', KeyU: 'U',
  KeyV: 'V', KeyW: 'W', KeyX: 'X', KeyY: 'Y', KeyZ: 'Z',
}

export function keyLabel(code: string): string {
  return KEY_LABEL[code] ?? code.replace(/^Key/, '')
}

export function KeyHints({
  keys,
  held,
}: {
  keys: readonly string[]
  held: readonly string[]
}) {
  const half = Math.ceil(keys.length / 2)
  const hands = [keys.slice(0, half), keys.slice(half)]
  return (
    <div className="flex items-center gap-6" aria-hidden="true">
      {hands.map((hand, index) => (
        <div key={index} className="flex gap-2">
          {hand.map((code) => (
            <span
              key={code}
              className={`flex h-9 w-9 items-center justify-center rounded-md border font-mono text-sm transition-colors ${
                held.includes(code)
                  ? 'border-(--color-state-ready) bg-(--color-state-ready)/15 text-(--color-state-ready)'
                  : 'border-neutral-500 text-neutral-500'
              }`}
            >
              {keyLabel(code)}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Write the touch fallback**

Create `components/timer/touch-pads.tsx`. Each pad presses and releases the
three key codes of one hand, so touch drives the same machine as the keyboard
with no special cases.

```tsx
'use client'

export function TouchPads({
  keys,
  onPress,
  onRelease,
}: {
  keys: readonly string[]
  onPress: (code: string) => void
  onRelease: (code: string) => void
}) {
  const half = Math.ceil(keys.length / 2)
  const hands = [keys.slice(0, half), keys.slice(half)]
  return (
    <div className="grid w-full grid-cols-2 gap-3 md:hidden">
      {hands.map((hand, index) => (
        <button
          key={index}
          type="button"
          aria-label={index === 0 ? 'Left hand pad' : 'Right hand pad'}
          className="h-28 rounded-xl border border-neutral-500 bg-neutral-900 active:border-(--color-state-ready) active:bg-(--color-state-ready)/15"
          onPointerDown={(event) => {
            event.preventDefault()
            hand.forEach(onPress)
          }}
          onPointerUp={(event) => {
            event.preventDefault()
            hand.forEach(onRelease)
          }}
          onPointerCancel={() => hand.forEach(onRelease)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 8: Compose the panel**

Create `components/timer/timer-panel.tsx`:

```tsx
'use client'

import { useI18n } from '@/components/i18n-provider'
import { KeyHints } from '@/components/timer/key-hints'
import { TimerDisplay, timerPhase, type TimerPhase } from '@/components/timer/timer-display'
import { TouchPads } from '@/components/timer/touch-pads'
import { useSpeedTimer, type SolveResult } from '@/hooks/useSpeedTimer'
import { formatCountdown, formatMs, formatResult } from '@/lib/format'
import {
  defaultConfig,
  inspectionRemainingMs,
  solveElapsedMs,
  type TimerConfig,
} from '@/lib/timer/machine'

export function TimerPanel({
  config = defaultConfig,
  hideTimeWhileSolving = false,
  onSolveComplete,
}: {
  config?: TimerConfig
  hideTimeWhileSolving?: boolean
  onSolveComplete?: (result: SolveResult) => void
}) {
  const { t } = useI18n()
  const { state, now, armed, press, release } = useSpeedTimer({ config, onSolveComplete })
  const phase = timerPhase(state, now, armed, config)

  const value = (() => {
    switch (phase) {
      case 'idle':
      case 'arming':
      case 'ready':
        return state.status === 'armingSolve'
          ? formatCountdown(inspectionRemainingMs(state, now, config))
          : '0.00'
      case 'inspection':
      case 'inspectionPlus2':
      case 'inspectionDnf':
        return formatCountdown(inspectionRemainingMs(state, now, config))
      case 'running':
        return hideTimeWhileSolving ? '•••' : formatMs(solveElapsedMs(state, now))
      case 'stopped':
        return state.rawMs === null ? '0.00' : formatResult(state.rawMs, state.penalty)
    }
  })()

  const hint: Record<TimerPhase, string> = {
    idle: t.idleHint,
    arming: t.armingHint,
    ready: state.status === 'armingSolve' ? t.releaseHint : t.readyHint,
    inspection: t.inspectionLabel,
    inspectionPlus2: t.plus2Warning,
    inspectionDnf: t.dnfWarning,
    running: t.runningHint,
    stopped: t.stoppedHint,
  }

  return (
    <section className="flex flex-col items-center gap-8">
      <TimerDisplay phase={phase} value={value} hint={hint[phase]} />
      <KeyHints keys={config.keys} held={state.heldKeys} />
      <TouchPads keys={config.keys} onPress={press} onRelease={release} />
    </section>
  )
}
```

- [ ] **Step 9: Wire the home page**

`TimerScreen` is the composition root; Tasks 10–12 each add one section to it.
`app/page.tsx` stays a two-line shell throughout.

Create `components/timer/timer-screen.tsx`:

```tsx
'use client'

import { useI18n } from '@/components/i18n-provider'
import { TimerPanel } from '@/components/timer/timer-panel'

export function TimerScreen() {
  const { t } = useI18n()
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col items-center gap-10 px-4 py-8">
      <header className="w-full">
        <h1 className="text-lg font-semibold">{t.appName}</h1>
        <p className="text-sm text-neutral-400">{t.tagline}</p>
      </header>
      <TimerPanel />
    </main>
  )
}
```

Replace `app/page.tsx` with:

```tsx
import { TimerScreen } from '@/components/timer/timer-screen'

export default function Page() {
  return <TimerScreen />
}
```

- [ ] **Step 10: Verify in the browser**

```bash
pnpm dev
```

Open `http://localhost:3000` and confirm: holding the six keys turns the
numerals red then green after roughly half a second, releasing starts a
countdown from 15, holding again arms the solve, releasing starts the stopwatch,
and space stops it. Then stop the dev server.

- [ ] **Step 11: Commit**

```bash
pnpm test && pnpm typecheck && pnpm build
git add app components/timer
git commit -m "$(cat <<'EOF'
feat: add the timer screen with key visualiser and touch fallback

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Scrambles

**Files:**
- Create: `lib/scramble/types.ts`, `lib/scramble/cubing-provider.ts`, `components/scramble/scramble-bar.tsx`, `components/scramble/cube-preview.tsx`
- Modify: `components/timer/timer-screen.tsx`
- Test: `lib/scramble/types.test.ts`

**Interfaces:**
- Consumes: `Puzzle` from `@/lib/storage`.
- Produces:
  - `interface ScrambleProvider { next(puzzle: Puzzle): Promise<string> }`
  - `createCubingScrambleProvider(): ScrambleProvider`
  - `createStaticScrambleProvider(scrambles: string[]): ScrambleProvider` (used by tests and by components rendered without a worker)
  - `<ScrambleBar scramble onRefresh loading />`, `<CubePreview scramble />`

- [ ] **Step 1: Install cubing.js**

```bash
pnpm add cubing
```

- [ ] **Step 2: Write the failing test**

Create `lib/scramble/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createStaticScrambleProvider } from './types'

describe('createStaticScrambleProvider', () => {
  it('cycles through the supplied scrambles', async () => {
    const provider = createStaticScrambleProvider(["R U R'", "L D L'"])
    await expect(provider.next('3x3')).resolves.toBe("R U R'")
    await expect(provider.next('3x3')).resolves.toBe("L D L'")
    await expect(provider.next('3x3')).resolves.toBe("R U R'")
  })

  it('rejects an empty list rather than returning an empty scramble', () => {
    expect(() => createStaticScrambleProvider([])).toThrow()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test lib/scramble`
Expected: FAIL — `Failed to resolve import "./types"`.

- [ ] **Step 4: Write the provider interface**

Create `lib/scramble/types.ts`:

```ts
import type { Puzzle } from '@/lib/storage'

export interface ScrambleProvider {
  next(puzzle: Puzzle): Promise<string>
}

/** Deterministic provider for tests and for rendering without a worker. */
export function createStaticScrambleProvider(scrambles: string[]): ScrambleProvider {
  if (scrambles.length === 0) throw new Error('createStaticScrambleProvider needs at least one scramble')
  let index = 0
  return {
    async next() {
      const scramble = scrambles[index % scrambles.length]
      index += 1
      return scramble
    },
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test lib/scramble`
Expected: PASS — 2 tests.

- [ ] **Step 6: Write the cubing.js provider**

Create `lib/scramble/cubing-provider.ts`. The import is dynamic so the scramble
worker and its tables never enter the first load bundle.

```ts
import type { Puzzle } from '@/lib/storage'
import type { ScrambleProvider } from './types'

const EVENT_IDS: Record<Puzzle, string> = { '3x3': '333' }

/**
 * Random-state scrambles from cubing.js — the same class of scramble used in
 * competition, rather than a random sequence of moves that may leave the cube
 * nearly solved.
 */
export function createCubingScrambleProvider(): ScrambleProvider {
  return {
    async next(puzzle: Puzzle) {
      const { randomScrambleForEvent } = await import('cubing/scramble')
      const alg = await randomScrambleForEvent(EVENT_IDS[puzzle])
      return alg.toString()
    },
  }
}
```

- [ ] **Step 7: Write the scramble bar and the 3D preview**

Create `components/scramble/cube-preview.tsx`:

```tsx
'use client'

import { useEffect, useRef } from 'react'

/**
 * Wraps cubing.js's <twisty-player> custom element. Loaded dynamically because
 * it registers custom elements and only works in the browser.
 */
export function CubePreview({ scramble }: { scramble: string }) {
  const host = useRef<HTMLDivElement>(null)
  const player = useRef<(HTMLElement & { alg: string }) | null>(null)

  useEffect(() => {
    let cancelled = false
    void import('cubing/twisty').then(({ TwistyPlayer }) => {
      if (cancelled || !host.current) return
      const instance = new TwistyPlayer({
        puzzle: '3x3x3',
        visualization: '3D',
        background: 'none',
        controlPanel: 'none',
        hintFacelets: 'none',
        alg: scramble,
      })
      instance.style.width = '100%'
      instance.style.height = '100%'
      host.current.replaceChildren(instance)
      player.current = instance as unknown as HTMLElement & { alg: string }
    })
    return () => {
      cancelled = true
    }
    // The player is created once; the effect below keeps its alg in sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (player.current) player.current.alg = scramble
  }, [scramble])

  return <div ref={host} className="h-40 w-40" aria-hidden="true" />
}
```

Create `components/scramble/scramble-bar.tsx`:

```tsx
'use client'

import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'

const CubePreview = dynamic(
  () => import('@/components/scramble/cube-preview').then((module) => module.CubePreview),
  { ssr: false },
)

export function ScrambleBar({
  scramble,
  loading,
  onRefresh,
}: {
  scramble: string
  loading: boolean
  onRefresh: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-4">
      <p className="text-center font-mono text-lg leading-relaxed text-neutral-200">
        {loading ? t.scrambleLoading : scramble}
      </p>
      <div className="flex items-center gap-6">
        {scramble ? <CubePreview scramble={scramble} /> : null}
        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          {t.newScramble}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Wire scrambles into the screen**

Replace `components/timer/timer-screen.tsx` with:

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { ScrambleBar } from '@/components/scramble/scramble-bar'
import { TimerPanel } from '@/components/timer/timer-panel'
import { createCubingScrambleProvider } from '@/lib/scramble/cubing-provider'

export function TimerScreen() {
  const { t } = useI18n()
  const provider = useRef(createCubingScrambleProvider())
  const [scramble, setScramble] = useState('')
  const [loadingScramble, setLoadingScramble] = useState(true)

  const nextScramble = useCallback(async () => {
    setLoadingScramble(true)
    setScramble(await provider.current.next('3x3'))
    setLoadingScramble(false)
  }, [])

  useEffect(() => {
    void nextScramble()
  }, [nextScramble])

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col items-center gap-10 px-4 py-8">
      <header className="w-full">
        <h1 className="text-lg font-semibold">{t.appName}</h1>
        <p className="text-sm text-neutral-400">{t.tagline}</p>
      </header>
      <ScrambleBar
        scramble={scramble}
        loading={loadingScramble}
        onRefresh={() => void nextScramble()}
      />
      <TimerPanel onSolveComplete={() => void nextScramble()} />
    </main>
  )
}
```

- [ ] **Step 9: Verify the scramble renders in the browser**

```bash
pnpm dev
```

Confirm at `http://localhost:3000`: a scramble of roughly 20 moves appears, the
3D cube shows it applied, and `New scramble` produces a different sequence. The
browser console must be free of errors. Then stop the dev server.

- [ ] **Step 10: Commit**

```bash
pnpm test && pnpm typecheck && pnpm build
git add lib/scramble components/scramble components/timer/timer-screen.tsx package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat: add WCA random-state scrambles with a 3D preview

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Session panel

**Files:**
- Create: `hooks/use-session.ts`, `components/session/session-stats.tsx`, `components/session/solve-list.tsx`
- Modify: `components/timer/timer-screen.tsx`
- Test: `hooks/use-session.test.tsx`

**Interfaces:**
- Consumes: `getSolveRepository`, `createSolve`, `Solve` from `@/lib/storage`; `sessionStats` from `@/lib/stats`; `SolveResult` from `@/hooks/useSpeedTimer`.
- Produces:
  - `useSession(repository?): { solves: Solve[]; stats: SessionStats; record: (result: SolveResult, scramble: string) => Promise<void>; setPenalty: (id, penalty) => Promise<void>; remove: (id) => Promise<void>; clear: () => Promise<void> }`
  - `<SessionStats stats />`, `<SolveList solves onPenalty onRemove onClear />`

- [ ] **Step 1: Write the failing test**

Create `hooks/use-session.test.tsx`:

```tsx
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createLocalSolveRepository } from '@/lib/storage/local-repository'
import { useSession } from './use-session'

describe('useSession', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads the stored solves on mount', async () => {
    const repository = createLocalSolveRepository()
    const { result } = renderHook(() => useSession(repository))
    await waitFor(() => expect(result.current.solves).toEqual([]))
  })

  it('records a solve with its scramble and updates the statistics', async () => {
    const repository = createLocalSolveRepository()
    const { result } = renderHook(() => useSession(repository))
    await act(async () => {
      await result.current.record(
        { rawMs: 12_340, inspectionMs: 9_000, penalty: 'none' },
        "R U R' U'",
      )
    })
    expect(result.current.solves).toHaveLength(1)
    expect(result.current.solves[0].scramble).toBe("R U R' U'")
    expect(result.current.stats.best).toBe(12_340)
  })

  it('applies a penalty to a recorded solve', async () => {
    const repository = createLocalSolveRepository()
    const { result } = renderHook(() => useSession(repository))
    await act(async () => {
      await result.current.record(
        { rawMs: 12_340, inspectionMs: 9_000, penalty: 'none' },
        "R U R' U'",
      )
    })
    await act(async () => {
      await result.current.setPenalty(result.current.solves[0].id, 'dnf')
    })
    expect(result.current.solves[0].penalty).toBe('dnf')
    expect(result.current.stats.best).toBeNull()
  })

  it('removes a solve and clears the session', async () => {
    const repository = createLocalSolveRepository()
    const { result } = renderHook(() => useSession(repository))
    await act(async () => {
      await result.current.record(
        { rawMs: 12_340, inspectionMs: 9_000, penalty: 'none' },
        "R U R' U'",
      )
      await result.current.record(
        { rawMs: 11_110, inspectionMs: 9_000, penalty: 'none' },
        "L D L' D'",
      )
    })
    await act(async () => {
      await result.current.remove(result.current.solves[0].id)
    })
    expect(result.current.solves).toHaveLength(1)
    await act(async () => {
      await result.current.clear()
    })
    expect(result.current.solves).toEqual([])
    expect(result.current.stats.count).toBe(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test hooks/use-session`
Expected: FAIL — `Failed to resolve import "./use-session"`.

- [ ] **Step 3: Write the hook**

Create `hooks/use-session.ts`:

```ts
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SolveResult } from '@/hooks/useSpeedTimer'
import { sessionStats } from '@/lib/stats'
import { createSolve, getSolveRepository, type Solve, type SolveRepository } from '@/lib/storage'
import type { Penalty } from '@/lib/timer/penalties'

export function useSession(repository?: SolveRepository) {
  const repositoryRef = useRef<SolveRepository | null>(repository ?? null)
  if (!repositoryRef.current) repositoryRef.current = getSolveRepository()
  const store = repositoryRef.current

  const [solves, setSolves] = useState<Solve[]>([])

  const refresh = useCallback(async () => {
    setSolves(await store.list())
  }, [store])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const record = useCallback(
    async (result: SolveResult, scramble: string) => {
      await store.add(createSolve({ ...result, scramble }))
      await refresh()
    },
    [refresh, store],
  )

  const setPenalty = useCallback(
    async (id: string, penalty: Penalty) => {
      await store.updatePenalty(id, penalty)
      await refresh()
    },
    [refresh, store],
  )

  const remove = useCallback(
    async (id: string) => {
      await store.remove(id)
      await refresh()
    },
    [refresh, store],
  )

  const clear = useCallback(async () => {
    await store.clear()
    await refresh()
  }, [refresh, store])

  const stats = useMemo(() => sessionStats(solves), [solves])

  return { solves, stats, record, setPenalty, remove, clear }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test hooks/use-session`
Expected: PASS — 4 tests.

- [ ] **Step 5: Write the statistics grid**

Create `components/session/session-stats.tsx`. The component and the type share
a name, so the type is imported as `Stats`.

```tsx
'use client'

import { useI18n } from '@/components/i18n-provider'
import { formatMs } from '@/lib/format'
import type { SessionStats as Stats } from '@/lib/stats'

const EM_DASH = '—'

const show = (value: number | null) => (value === null ? EM_DASH : formatMs(value))

export function SessionStats({ stats }: { stats: Stats }) {
  const { t } = useI18n()
  const cells = [
    { label: t.solveCount, value: stats.count.toString(), best: false },
    { label: t.best, value: show(stats.best), best: true },
    { label: t.worst, value: show(stats.worst), best: false },
    { label: t.mo3, value: show(stats.mo3), best: false },
    { label: t.ao5, value: show(stats.ao5), best: false },
    { label: t.ao12, value: show(stats.ao12), best: false },
    { label: t.sessionMean, value: show(stats.sessionMean), best: false },
  ]
  return (
    <section
      aria-label={t.statsTitle}
      className="grid w-full grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7"
    >
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-center"
        >
          <div className="text-[0.7rem] tracking-wide text-neutral-500 uppercase">
            {cell.label}
          </div>
          <div
            className={`font-mono text-lg tabular-nums ${
              cell.best ? 'text-(--color-state-ready)' : 'text-neutral-100'
            }`}
          >
            {cell.value}
          </div>
        </div>
      ))}
    </section>
  )
}
```

- [ ] **Step 6: Write the solve list**

Create `components/session/solve-list.tsx`. `data-timer-ignore` on the section
is what keeps key presses inside it from driving the timer (Task 8).

```tsx
'use client'

import { useState } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatMs, formatResult } from '@/lib/format'
import type { Solve } from '@/lib/storage'
import type { Penalty } from '@/lib/timer/penalties'

const PENALTIES: Penalty[] = ['none', 'plus2', 'dnf']

export function SolveList({
  solves,
  onPenalty,
  onRemove,
  onClear,
}: {
  solves: Solve[]
  onPenalty: (id: string, penalty: Penalty) => void
  onRemove: (id: string) => void
  onClear: () => void
}) {
  const { t } = useI18n()
  const [confirming, setConfirming] = useState(false)
  const labels: Record<Penalty, string> = {
    none: t.penaltyNone,
    plus2: t.penaltyPlus2,
    dnf: t.penaltyDnf,
  }

  return (
    <section data-timer-ignore aria-label={t.solvesTitle} className="w-full">
      <h2 className="mb-3 text-sm tracking-wide text-neutral-400 uppercase">
        {t.solvesTitle}
      </h2>
      {solves.length === 0 ? (
        <p className="text-sm text-neutral-500">{t.noSolves}</p>
      ) : (
        <ul className="divide-y divide-neutral-800">
          {[...solves].reverse().map((solve, index) => (
            <li key={solve.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="w-8 text-right font-mono text-xs text-neutral-500">
                {solves.length - index}
              </span>
              <span className="w-24 font-mono text-lg tabular-nums">
                {formatResult(solve.rawMs, solve.penalty)}
              </span>
              <span className="w-16 font-mono text-xs text-neutral-500">
                {formatMs(solve.inspectionMs)}
              </span>
              <span
                className="min-w-0 flex-1 truncate font-mono text-xs text-neutral-500"
                title={solve.scramble}
              >
                {solve.scramble}
              </span>
              <span className="flex gap-1">
                {PENALTIES.map((penalty) => (
                  <Button
                    key={penalty}
                    size="sm"
                    variant={solve.penalty === penalty ? 'default' : 'outline'}
                    aria-pressed={solve.penalty === penalty}
                    onClick={() => onPenalty(solve.id, penalty)}
                  >
                    {labels[penalty]}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={t.deleteSolve}
                  onClick={() => onRemove(solve.id)}
                >
                  ×
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {solves.length > 0 ? (
        <Dialog open={confirming} onOpenChange={setConfirming}>
          <DialogTrigger render={<Button variant="outline" size="sm" className="mt-4" />}>
            {t.clearSession}
          </DialogTrigger>
          <DialogContent data-timer-ignore>
            <DialogHeader>
              <DialogTitle>{t.clearSessionConfirm}</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirming(false)}>
                {t.cancel}
              </Button>
              <Button
                onClick={() => {
                  onClear()
                  setConfirming(false)
                }}
              >
                {t.clearSession}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  )
}
```

- [ ] **Step 7: Wire the session into the screen**

`components/timer/timer-screen.tsx` already handles scramble loading and
failure, and creates the provider lazily. Do **not** replace the file — those
behaviours were hard-won and a wholesale rewrite would regress them. Modify it:

1. Add these imports:

```tsx
import { SessionStats } from '@/components/session/session-stats'
import { SolveList } from '@/components/session/solve-list'
import { useSession } from '@/hooks/use-session'
import type { SolveResult } from '@/hooks/useSpeedTimer'
```

2. Inside `TimerScreen`, after the `useI18n()` line, add:

```tsx
  const session = useSession()
```

3. After the existing mount effect, add the handler that records the finished
   solve against the scramble it was solved on, then fetches the next one. A
   failed write must not become an unhandled rejection, and must not discard the
   time the user just earned — the panel keeps showing it either way:

```tsx
  const recordSolve = useCallback(
    async (result: SolveResult) => {
      try {
        await session.record(result, scramble)
      } catch (error) {
        // The solve stays on screen; only persistence failed (quota, private
        // browsing). Surfacing this properly belongs with the accounts work.
        console.error('Could not save the solve', error)
      }
      await nextScramble()
    },
    [nextScramble, scramble, session],
  )
```

4. Change `TimerPanel`'s prop from `onSolveComplete={() => void nextScramble()}`
   to `onSolveComplete={(result) => void recordSolve(result)}`.

5. After `<TimerPanel …/>`, render the two new sections:

```tsx
      <SessionStats stats={session.stats} />
      <SolveList
        solves={session.solves}
        onPenalty={(id, penalty) => void session.setPenalty(id, penalty)}
        onRemove={(id) => void session.remove(id)}
        onClear={() => void session.clear()}
      />
```

Leave the header, the `ScrambleBar` call, the `useScrambleProviderRef` hook, the
`nextScramble` callback and the mount effect exactly as they are.

- [ ] **Step 8: Verify in the browser**

```bash
pnpm dev
```

Complete three solves, apply a `+2` and a `DNF`, delete one, and confirm the
statistics change accordingly and survive a page reload. Then stop the dev
server.

- [ ] **Step 9: Commit**

```bash
pnpm test && pnpm typecheck && pnpm build
git add hooks/use-session.ts hooks/use-session.test.tsx components/session components/timer/timer-screen.tsx
git commit -m "$(cat <<'EOF'
feat: add session statistics and solve list with penalty editing

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Settings, key remapping and sound cues

**Files:**
- Create: `lib/settings.ts`, `lib/audio.ts`, `components/settings/settings-dialog.tsx`
- Modify: `components/timer/timer-screen.tsx`, `components/timer/timer-panel.tsx`
- Test: `lib/settings.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_KEYS`, `TimerConfig` from `@/lib/timer/machine`; `useI18n`.
- Produces:
  - `type Settings = { keys: string[]; hideTimeWhileSolving: boolean; sounds: boolean }`
  - `const defaultSettings: Settings`, `SETTINGS_STORAGE_KEY = 'rubiksclock.settings.v1'`
  - `loadSettings(storage?): Settings`, `saveSettings(settings, storage?): void`
  - `createBeeper(): { beep: (count: number) => void }`
  - `<SettingsDialog settings onChange />`

- [ ] **Step 1: Write the failing test**

Create `lib/settings.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { defaultSettings, loadSettings, saveSettings, SETTINGS_STORAGE_KEY } from './settings'

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns the defaults when nothing is stored', () => {
    expect(loadSettings()).toEqual(defaultSettings)
  })

  it('round-trips saved settings', () => {
    const settings = { ...defaultSettings, sounds: false, hideTimeWhileSolving: true }
    saveSettings(settings)
    expect(loadSettings()).toEqual(settings)
  })

  it('falls back to the defaults on a corrupted payload', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{oops')
    expect(loadSettings()).toEqual(defaultSettings)
  })

  it('rejects a key map that is not six distinct keys', () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...defaultSettings, keys: ['KeyQ', 'KeyQ'] }),
    )
    expect(loadSettings().keys).toEqual(defaultSettings.keys)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test lib/settings`
Expected: FAIL — `Failed to resolve import "./settings"`.

- [ ] **Step 3: Write the settings module**

Create `lib/settings.ts`:

```ts
import { DEFAULT_KEYS } from '@/lib/timer/machine'

export const SETTINGS_STORAGE_KEY = 'rubiksclock.settings.v1'

export type Settings = {
  keys: string[]
  hideTimeWhileSolving: boolean
  sounds: boolean
}

export const defaultSettings: Settings = {
  keys: [...DEFAULT_KEYS],
  hideTimeWhileSolving: false,
  sounds: true,
}

function isValidKeyMap(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length === DEFAULT_KEYS.length &&
    value.every((key) => typeof key === 'string' && key.length > 0) &&
    new Set(value).size === value.length
  )
}

function defaultStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

export function loadSettings(storage: Storage | null = defaultStorage()): Settings {
  const raw = storage?.getItem(SETTINGS_STORAGE_KEY)
  if (!raw) return defaultSettings
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return defaultSettings
  }
  if (typeof parsed !== 'object' || parsed === null) return defaultSettings
  const candidate = parsed as Partial<Settings>
  return {
    keys: isValidKeyMap(candidate.keys) ? candidate.keys : defaultSettings.keys,
    hideTimeWhileSolving:
      typeof candidate.hideTimeWhileSolving === 'boolean'
        ? candidate.hideTimeWhileSolving
        : defaultSettings.hideTimeWhileSolving,
    sounds: typeof candidate.sounds === 'boolean' ? candidate.sounds : defaultSettings.sounds,
  }
}

export function saveSettings(
  settings: Settings,
  storage: Storage | null = defaultStorage(),
): void {
  storage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test lib/settings`
Expected: PASS — 4 tests.

- [ ] **Step 5: Write the beeper**

Create `lib/audio.ts`:

```ts
'use client'

/**
 * Short sine beeps for the 8 s and 12 s inspection warnings (A3b1, A3b2). The
 * AudioContext is created lazily: the first beep always follows a key press,
 * which satisfies the browser's autoplay gesture requirement.
 */
export function createBeeper() {
  let context: AudioContext | null = null

  const beepOnce = (startAt: number) => {
    if (!context) return
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(0.2, startAt + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.12)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(startAt)
    oscillator.stop(startAt + 0.13)
  }

  return {
    beep(count: number) {
      context ??= new AudioContext()
      void context.resume()
      for (let index = 0; index < count; index += 1) {
        beepOnce(context.currentTime + index * 0.18)
      }
    },
  }
}
```

- [ ] **Step 6: Fire the warnings from the timer panel**

Replace `components/timer/timer-panel.tsx` with the version below. Two things
changed from Task 9: a `sounds` prop with the 8 s / 12 s cues, and two markers
under the display so the cue is never sound-only.

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { KeyHints } from '@/components/timer/key-hints'
import { TimerDisplay, timerPhase, type TimerPhase } from '@/components/timer/timer-display'
import { TouchPads } from '@/components/timer/touch-pads'
import { useSpeedTimer, type SolveResult } from '@/hooks/useSpeedTimer'
import { createBeeper } from '@/lib/audio'
import { formatCountdown, formatMs, formatResult } from '@/lib/format'
import {
  defaultConfig,
  inspectionElapsedMs,
  inspectionRemainingMs,
  solveElapsedMs,
  type TimerConfig,
} from '@/lib/timer/machine'

/** WCA A3b1 and A3b2: the judge warns at 8 and at 12 seconds. */
const CUES = [8_000, 12_000] as const

export function TimerPanel({
  config = defaultConfig,
  hideTimeWhileSolving = false,
  sounds = false,
  onSolveComplete,
}: {
  config?: TimerConfig
  hideTimeWhileSolving?: boolean
  sounds?: boolean
  onSolveComplete?: (result: SolveResult) => void
}) {
  const { t } = useI18n()
  const { state, now, armed, press, release } = useSpeedTimer({ config, onSolveComplete })
  const phase = timerPhase(state, now, armed, config)

  const inspecting = state.status === 'inspection' || state.status === 'armingSolve'
  const inspectionElapsed = inspecting ? inspectionElapsedMs(state, now) : 0

  const beeper = useRef<ReturnType<typeof createBeeper> | null>(null)
  const fired = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!inspecting) {
      fired.current.clear()
      return
    }
    CUES.forEach((threshold, index) => {
      if (inspectionElapsed < threshold || fired.current.has(threshold)) return
      fired.current.add(threshold)
      if (!sounds) return
      beeper.current ??= createBeeper()
      beeper.current.beep(index + 1)
    })
  }, [inspecting, inspectionElapsed, sounds])

  const value = (() => {
    switch (phase) {
      case 'inspection':
      case 'inspectionPlus2':
      case 'inspectionDnf':
        return formatCountdown(inspectionRemainingMs(state, now, config))
      case 'arming':
      case 'ready':
        return state.status === 'armingSolve'
          ? formatCountdown(inspectionRemainingMs(state, now, config))
          : '0.00'
      case 'running':
        return hideTimeWhileSolving ? '•••' : formatMs(solveElapsedMs(state, now))
      case 'stopped':
        return state.rawMs === null ? '0.00' : formatResult(state.rawMs, state.penalty)
      case 'idle':
        return '0.00'
    }
  })()

  const hint: Record<TimerPhase, string> = {
    idle: t.idleHint,
    arming: t.armingHint,
    ready: state.status === 'armingSolve' ? t.releaseHint : t.readyHint,
    inspection: t.inspectionLabel,
    inspectionPlus2: t.plus2Warning,
    inspectionDnf: t.dnfWarning,
    running: t.runningHint,
    stopped: t.stoppedHint,
  }

  return (
    <section className="flex flex-col items-center gap-8">
      <TimerDisplay phase={phase} value={value} hint={hint[phase]} />
      {inspecting ? (
        <div className="flex gap-2" aria-hidden="true">
          <span
            className={`h-2 w-8 rounded-full transition-colors ${
              inspectionElapsed >= CUES[0] ? 'bg-(--color-state-warn)' : 'bg-neutral-800'
            }`}
          />
          <span
            className={`h-2 w-8 rounded-full transition-colors ${
              inspectionElapsed >= CUES[1] ? 'bg-(--color-state-danger)' : 'bg-neutral-800'
            }`}
          />
        </div>
      ) : null}
      <KeyHints keys={config.keys} held={state.heldKeys} />
      <TouchPads keys={config.keys} onPress={press} onRelease={release} />
    </section>
  )
}
```

- [ ] **Step 7: Write the settings dialog**

Create `components/settings/settings-dialog.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { keyLabel } from '@/components/timer/key-hints'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { locales } from '@/lib/i18n/dictionaries'
import { defaultSettings, type Settings } from '@/lib/settings'

export function SettingsDialog({
  settings,
  onChange,
}: {
  settings: Settings
  onChange: (settings: Settings) => void
}) {
  const { t, locale, setLocale } = useI18n()
  const [capturing, setCapturing] = useState<number | null>(null)

  // While capturing, this listener runs before the timer's own and swallows the
  // key press so remapping never arms the timer.
  useEffect(() => {
    if (capturing === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.code === 'Escape') {
        setCapturing(null)
        return
      }
      const taken = settings.keys.some((key, index) => key === event.code && index !== capturing)
      if (taken) return
      onChange({
        ...settings,
        keys: settings.keys.map((key, index) => (index === capturing ? event.code : key)),
      })
      setCapturing(null)
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [capturing, onChange, settings])

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>{t.settings}</DialogTrigger>
      <DialogContent data-timer-ignore className="space-y-6">
        <DialogHeader>
          <DialogTitle>{t.settings}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t.settingsKeys}</p>
          <div className="flex flex-wrap gap-2">
            {settings.keys.map((code, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-14 font-mono"
                onClick={() => setCapturing(index)}
              >
                {capturing === index ? '…' : keyLabel(code)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-neutral-400">
            {capturing === null ? t.settingsKeysHint : t.settingsKeysCapture}
          </p>
          <p className="text-xs text-neutral-500">{t.ghostingHint}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...settings, keys: [...defaultSettings.keys] })}
          >
            {t.settingsKeysReset}
          </Button>
        </div>

        <div className="flex items-start justify-between gap-4">
          <span>
            <span className="block text-sm font-medium">{t.settingsHideTime}</span>
            <span className="block text-xs text-neutral-400">{t.settingsHideTimeHint}</span>
          </span>
          <Switch
            aria-label={t.settingsHideTime}
            checked={settings.hideTimeWhileSolving}
            onCheckedChange={(checked) =>
              onChange({ ...settings, hideTimeWhileSolving: checked })
            }
          />
        </div>

        <div className="flex items-start justify-between gap-4">
          <span>
            <span className="block text-sm font-medium">{t.settingsSounds}</span>
            <span className="block text-xs text-neutral-400">{t.settingsSoundsHint}</span>
          </span>
          <Switch
            aria-label={t.settingsSounds}
            checked={settings.sounds}
            onCheckedChange={(checked) => onChange({ ...settings, sounds: checked })}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t.settingsLanguage}</p>
          <div className="flex gap-2">
            {locales.map((candidate) => (
              <Button
                key={candidate}
                size="sm"
                variant={locale === candidate ? 'default' : 'outline'}
                aria-pressed={locale === candidate}
                onClick={() => setLocale(candidate)}
              >
                {candidate.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 8: Wire settings into the screen**

Again, modify `components/timer/timer-screen.tsx` rather than replacing it.

1. Add these imports:

```tsx
import { SettingsDialog } from '@/components/settings/settings-dialog'
import { defaultSettings, loadSettings, saveSettings, type Settings } from '@/lib/settings'
import { HOLD_MS } from '@/lib/timer/machine'
import { INSPECTION_MS } from '@/lib/timer/penalties'
```

2. Add the settings state and its persistence. Read after mount so the
   server-rendered markup and the first client render agree:

```tsx
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  useEffect(() => {
    setSettings(loadSettings())
  }, [])

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next)
    saveSettings(next)
  }, [])
```

   If the `setSettings` call in that effect trips
   `react-hooks/set-state-in-effect`, resolve it the way the scramble mount
   effect does — the rule objects to a bare synchronous `setState` in an effect
   body, and this project does not accept blanket disables.

3. Turn the header into a row that holds the settings trigger:

```tsx
      <header className="flex w-full items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">{t.appName}</h1>
          <p className="text-sm text-neutral-400">{t.tagline}</p>
        </div>
        <SettingsDialog settings={settings} onChange={updateSettings} />
      </header>
```

4. Pass the settings into `TimerPanel`, keeping the `onSolveComplete` wiring
   from Task 11:

```tsx
      <TimerPanel
        config={{ keys: settings.keys, holdMs: HOLD_MS, inspectionMs: INSPECTION_MS }}
        hideTimeWhileSolving={settings.hideTimeWhileSolving}
        sounds={settings.sounds}
        onSolveComplete={(result) => void recordSolve(result)}
      />
```

Leave everything else in the file as it is.

- [ ] **Step 9: Verify in the browser**

```bash
pnpm dev
```

Confirm: remapping a key changes the visualiser and the new key arms the timer;
a reload keeps the remap; the 8 s and 12 s cues fire once each per inspection;
turning sounds off silences them; hiding the time shows `•••` while solving and
the real time after stopping. Then stop the dev server.

- [ ] **Step 10: Commit**

```bash
pnpm test && pnpm typecheck && pnpm build
git add lib/settings.ts lib/settings.test.ts lib/audio.ts components/settings components/timer
git commit -m "$(cat <<'EOF'
feat: add settings with key remapping, inspection cues and hidden times

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Groundwork for accounts, history and the leaderboard

Nothing here is wired to a backend. The point is that the accounts milestone
becomes a matter of filling in `SupabaseSolveRepository` and flipping
`getSolveRepository()`.

**Files:**
- Create: `components/coming-soon.tsx`, `components/site-nav.tsx`, `app/history/page.tsx`, `app/leaderboard/page.tsx`, `app/login/page.tsx`, `supabase/schema.sql`, `docs/ROADMAP.md`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `useI18n`.
- Produces: `<ComingSoon />`, `<SiteNav />`, three routes, the SQL schema, the roadmap.

- [ ] **Step 1: Write the shared placeholder and the navigation**

Create `components/coming-soon.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useI18n } from '@/components/i18n-provider'

export function ComingSoon() {
  const { t } = useI18n()
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">{t.comingSoonTitle}</h1>
      <p className="text-neutral-400">{t.comingSoonBody}</p>
      <Link href="/" className="text-sm underline underline-offset-4">
        {t.backToTimer}
      </Link>
    </main>
  )
}
```

Create `components/site-nav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/components/i18n-provider'

export function SiteNav() {
  const { t } = useI18n()
  const pathname = usePathname()
  const links = [
    { href: '/', label: t.navTimer },
    { href: '/history', label: t.navHistory },
    { href: '/leaderboard', label: t.navLeaderboard },
    { href: '/login', label: t.navSignIn },
  ]
  return (
    <nav
      data-timer-ignore
      aria-label={t.appName}
      className="flex justify-center gap-1 border-b border-neutral-800 px-4 py-3 text-sm"
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? 'page' : undefined}
          className={`rounded-md px-3 py-1 ${
            pathname === link.href
              ? 'bg-neutral-800 text-neutral-100'
              : 'text-neutral-400 hover:text-neutral-100'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Add the three routes**

Create `app/history/page.tsx`, `app/leaderboard/page.tsx` and
`app/login/page.tsx`, each with this body:

```tsx
import { ComingSoon } from '@/components/coming-soon'

export default function Page() {
  return <ComingSoon />
}
```

In `app/layout.tsx`, render `<SiteNav />` immediately above `{children}`, inside
`<I18nProvider>`.

- [ ] **Step 3: Write the database schema**

Create `supabase/schema.sql`:

```sql
-- RubiksClock — schema for the accounts milestone.
-- Run once against a fresh Supabase project: see docs/ROADMAP.md.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 32),
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'Session',
  created_at timestamptz not null default now()
);

-- Postgres has no CREATE TYPE IF NOT EXISTS, and every other statement here
-- is re-runnable, so guard this one to match.
do $$
begin
  create type public.penalty as enum ('none', 'plus2', 'dnf');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.solves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  puzzle text not null default '3x3',
  scramble text not null,
  raw_ms integer not null check (raw_ms > 0),
  inspection_ms integer not null check (inspection_ms >= 0),
  penalty public.penalty not null default 'none',
  created_at timestamptz not null default now()
);

create index if not exists solves_user_created_idx
  on public.solves (user_id, created_at desc);

-- The comparable time for a solve: null for a DNF, +2000 ms for a plus2.
create or replace function public.effective_ms(raw_ms integer, penalty public.penalty)
returns integer
language sql
immutable
as $$
  select case penalty
    when 'dnf' then null
    when 'plus2' then raw_ms + 2000
    else raw_ms
  end
$$;

create or replace view public.leaderboard as
  select
    p.id as user_id,
    p.display_name,
    s.puzzle,
    min(public.effective_ms(s.raw_ms, s.penalty)) as best_ms,
    count(*) as solve_count
  from public.solves s
  join public.profiles p on p.id = s.user_id
  group by p.id, p.display_name, s.puzzle;

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.solves enable row level security;

-- Profiles are public (the leaderboard shows display names); everything else
-- is private to its owner.
create policy "profiles are readable by everyone"
  on public.profiles for select using (true);
create policy "a user manages their own profile"
  on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "a user manages their own sessions"
  on public.sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "a user manages their own solves"
  on public.solves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 4: Write the roadmap**

Create `docs/ROADMAP.md`:

```markdown
# Roadmap

The timer ships first and works on its own. Everything below is groundwork that
is already in the repository, waiting to be filled in.

**Invariant:** `lib/timer/`, `lib/stats.ts` and `lib/format.ts` are pure and
must never import Supabase, React, or anything DOM-bound. Every milestone below
respects that.

## 1. Accounts and history

1. Create a Supabase project.
2. Run `supabase/schema.sql` in its SQL editor. It creates `profiles`,
   `sessions`, `solves`, the `leaderboard` view and the row-level security
   policies.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
   `.env.local` and in the Vercel project settings.
4. `pnpm add @supabase/supabase-js @supabase/ssr`.
5. Implement `lib/storage/supabase-repository.ts` against the `solves` table.
   The column names map one-to-one onto the `Solve` type except for the
   snake_case conversion (`raw_ms`, `inspection_ms`, `created_at`).
6. In `lib/storage/index.ts`, return the Supabase repository when a session
   exists and the local one otherwise. This is the only file that needs to know
   both exist.
7. Replace `app/login/page.tsx` with the Supabase auth UI (email magic link,
   then Google).
8. On first sign-in, read the solves out of localStorage and insert them, so a
   guest's session is not lost when they create an account.
9. Replace `app/history/page.tsx` with a paginated view over
   `SolveRepository.list()`, grouped by day, reusing `components/session/`.

## 2. Leaderboard

Query `public.leaderboard` in `app/leaderboard/page.tsx`, filtered by puzzle and
ordered by `best_ms`, with the signed-in user's row highlighted. The view
already excludes DNFs, because `effective_ms` returns null for them and `min`
skips nulls.

## 3. More puzzles

1. Widen `Puzzle` in `lib/storage/types.ts` (`'2x2' | '3x3' | '4x4' | ...`).
2. Add the matching WCA event ids to `EVENT_IDS` in
   `app/api/scramble/route.ts` (`222`, `333`, `444`, …). The mapping lives on
   the server because generation does; `lib/scramble/cubing-provider.ts` only
   passes the puzzle id through as a query parameter and needs no change.
3. Add a puzzle selector to `components/timer/timer-screen.tsx` and store the
   choice in `lib/settings.ts`.

The state machine, the statistics and the storage layer need no changes: they
never assumed a 3x3.
```

- [ ] **Step 5: Verify and commit**

```bash
pnpm test && pnpm typecheck && pnpm build
git add components/coming-soon.tsx components/site-nav.tsx app supabase docs/ROADMAP.md
git commit -m "$(cat <<'EOF'
feat: add navigation, placeholder routes and the accounts groundwork

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Documentation, full verification, and publish

**Files:**
- Create: `README.md`
- Modify: nothing else.

**Interfaces:**
- Consumes: everything.
- Produces: the public repository `github.com/Djo1711/RubiksClock` on branch `main`.

- [ ] **Step 1: Write the README**

Create `README.md` covering: what the app is; the WCA rules it implements, as
the table from the spec; the six-key interaction and how to remap it; local
development (`pnpm install`, `pnpm dev`, `pnpm test`); the module map from this
plan's File Structure section; a link to `docs/ROADMAP.md`; and a note that
deployment is a Vercel import of the repository with no environment variables.

- [ ] **Step 2: Run the full verification**

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm build
```

Expected: every test passes, no type errors, no lint errors, and a successful
production build. Do not proceed past a failure — fix it.

- [ ] **Step 3: Run the manual checks**

```bash
pnpm dev
```

Walk through each of these at `http://localhost:3000` and confirm the stated
outcome:

1. Hold the six keys: numerals go red, then green after about half a second.
2. Release: the countdown starts at 15 and runs down.
3. Cues fire once at 8 s and once at 12 s.
4. Hold and release again before 15 s: the stopwatch runs; space stops it; the
   solve is listed with no penalty.
5. Repeat but release after 16 s of inspection: the solve is recorded `+2`.
6. Repeat but release after 18 s: the solve is recorded `DNF`.
7. Release one key before the green light: nothing starts.
8. During a solve, switch to another tab and back: the attempt is discarded,
   not recorded.
9. Press escape mid-inspection: back to idle.
10. Narrow the window to phone width: the two touch pads appear and drive the
    timer.
11. Reload: solves, settings and language persist.

Then stop the dev server.

- [ ] **Step 4: Commit the README**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs: add README

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Create the public repository and push**

```bash
GH_HOST=github.com gh repo create Djo1711/RubiksClock \
  --public \
  --description "A speedcubing timer that plays by WCA rules" \
  --source=. --remote=origin --push
```

Expected: the command prints the new repository URL and `main` is pushed.

- [ ] **Step 6: Confirm the remote state**

```bash
GH_HOST=github.com gh repo view Djo1711/RubiksClock --json name,visibility,defaultBranchRef
git status --short --branch
```

Expected: `"visibility": "PUBLIC"`, default branch `main`, and a clean working
tree tracking `origin/main`.

---

## Deployment

Vercel deploys this repository with no configuration: import
`Djo1711/RubiksClock`, framework preset Next.js, no environment variables. Every
page is prerendered and the timer runs entirely in the browser; the one server
dependency is the `/api/scramble` Route Handler, which Vercel provisions as a
serverless function automatically. Environment variables arrive only with the
accounts milestone, as documented in `docs/ROADMAP.md`.
