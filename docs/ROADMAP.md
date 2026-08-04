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
   `lib/scramble/cubing-provider.ts` (`222`, `333`, `444`, …).
3. Add a puzzle selector to `components/timer/timer-screen.tsx` and store the
   choice in `lib/settings.ts`.

The state machine, the statistics and the storage layer need no changes: they
never assumed a 3x3.
