import { NextResponse, type NextRequest } from 'next/server'
import type { Puzzle } from '@/lib/storage'

// cubing/scramble needs a real search worker, which the browser bundler
// (Turbopack or webpack) cannot currently instantiate for this project's
// dependency graph — see .superpowers/sdd/task-10-report.md. Generation
// happens here, in Node, instead.
export const runtime = 'nodejs'
// Every request must produce a fresh random-state scramble; never serve a
// cached/prerendered response.
export const dynamic = 'force-dynamic'

const EVENT_IDS: Record<Puzzle, string> = { '3x3': '333' }

function isPuzzle(value: string | null): value is Puzzle {
  return value !== null && Object.hasOwn(EVENT_IDS, value)
}

export async function GET(request: NextRequest) {
  const puzzle = request.nextUrl.searchParams.get('puzzle')
  if (!isPuzzle(puzzle)) {
    return NextResponse.json({ error: `Unknown puzzle: ${puzzle ?? '(missing)'}` }, { status: 400 })
  }

  const { randomScrambleForEvent } = await import('cubing/scramble')
  const alg = await randomScrambleForEvent(EVENT_IDS[puzzle])

  return NextResponse.json(
    { scramble: alg.toString() },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
