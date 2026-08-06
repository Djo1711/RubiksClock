'use client'

import { useI18n } from '@/components/i18n-provider'
import { LastLayerFigure, type LastLayerMode } from '@/components/cfop/last-layer-figure'
import {
  OLL_CASES,
  OLL_FAMILIES,
  PLL_CASES,
  PLL_FAMILIES,
  TWO_LOOK_OLL_CASES,
  TWO_LOOK_PLL_CASES,
  type OllFamily,
  type PllFamily,
} from '@/lib/cfop'
import type { Dictionary } from '@/lib/i18n/dictionaries'

/**
 * One case as the page shows it: the figure to draw, the name to read, the
 * label that identifies it, and the algorithm. Both tables reduce to this, so
 * the card below is written once.
 */
type Entry = {
  key: string
  name: string
  label: string
  algorithm: string
  mode: LastLayerMode
  twoLook: boolean
}

/**
 * The shape names of the OLL families, as every OLL sheet spells them. Cubing
 * vocabulary, so they are the same in both languages and do not belong in the
 * dictionary — only the prose around them does.
 */
const OLL_FAMILY_NAME: Record<OllFamily, string> = {
  dot: 'Dot',
  line: 'Line',
  'l-shape': 'L shape',
  cross: 'Cross',
  fish: 'Fish',
  p: 'P',
  w: 'W',
  t: 'T',
  c: 'C',
  square: 'Square',
  lightning: 'Lightning',
  awkward: 'Awkward',
  knight: 'Knight',
  'corners-oriented': 'Corners oriented',
}

/** Which dictionary entry names each PLL family: prose, so it is translated. */
const PLL_FAMILY_KEY: Record<PllFamily, keyof Dictionary> = {
  'edge-only': 'algorithmsPllFamilyEdgeOnly',
  'corner-only': 'algorithmsPllFamilyCornerOnly',
  both: 'algorithmsPllFamilyBoth',
}

/** An OLL case as a card: numbered, and drawn as an orientation figure. */
function ollEntry(entry: (typeof OLL_CASES)[number]): Entry {
  return {
    key: `oll-${entry.id}`,
    name: entry.name,
    label: `OLL ${entry.id}`,
    algorithm: entry.algorithm,
    mode: 'orientation',
    twoLook: entry.twoLook !== null,
  }
}

/** A PLL case as a card: its letter is its name, and it is drawn in colour. */
function pllEntry(entry: (typeof PLL_CASES)[number]): Entry {
  return {
    key: `pll-${entry.name}`,
    name: entry.name,
    label: 'PLL',
    algorithm: entry.algorithm,
    mode: 'permutation',
    twoLook: entry.twoLook !== null,
  }
}

/**
 * `template` with each `{name}` replaced by the matching number. The counts on
 * this page — how many cases, how many algorithms 2-look needs — are read off
 * the tables rather than written into the sentences, so they cannot fall out of
 * step with the data, and each language keeps its own sentence around them.
 */
function fill(template: string, values: Record<string, number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  )
}

/**
 * One case: the figure, what it is called, and the algorithm that solves it.
 *
 * The algorithm is the thing people come here for, so it gets a line of its own
 * across the whole card, in the monospace face the scramble uses, rather than
 * being squeezed in beside the figure.
 */
function CaseCard({ entry }: { entry: Entry }) {
  return (
    <li className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
      <div className="flex items-center gap-3">
        {/* A fixed box, so every figure is the same size and the cards of a row
          * line up whatever their algorithm's length. */}
        <div className="size-14 shrink-0">
          <LastLayerFigure algorithm={entry.algorithm} mode={entry.mode} />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-sm font-medium text-neutral-100">{entry.name}</p>
          <p className="flex items-center gap-2 text-xs text-neutral-400">
            <span>{entry.label}</span>
            {entry.twoLook ? (
              <span className="rounded-sm bg-neutral-800 px-1.5 py-0.5 text-neutral-300">
                2-look
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <p className="mt-2.5 rounded-md bg-neutral-950/70 px-2 py-1.5 font-mono text-[13px] leading-6 text-neutral-100 sm:text-sm">
        {entry.algorithm}
      </p>
    </li>
  )
}

/** A named group of cases: a heading, how many there are, and the cards. */
function CaseGroup({ title, entries }: { title: string; entries: Entry[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-baseline gap-2 text-sm font-semibold text-neutral-300">
        {title}
        <span className="text-xs font-normal text-neutral-400">{entries.length}</span>
      </h3>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <CaseCard key={entry.key} entry={entry} />
        ))}
      </ul>
    </section>
  )
}

export function AlgorithmsScreen() {
  const { t } = useI18n()
  const twoLookCount = TWO_LOOK_OLL_CASES.length + TWO_LOOK_PLL_CASES.length
  const fullCount = OLL_CASES.length + PLL_CASES.length

  // The four steps of 2-look, in the order they are learnt: edges then corners
  // for OLL, corners then edges for PLL.
  const twoLookSteps = [
    {
      title: t.algorithmsStepEdgeOrientation,
      entries: TWO_LOOK_OLL_CASES.filter((entry) => entry.twoLook === 'edge-orientation').map(
        ollEntry,
      ),
    },
    {
      title: t.algorithmsStepCornerOrientation,
      entries: TWO_LOOK_OLL_CASES.filter((entry) => entry.twoLook === 'corner-orientation').map(
        ollEntry,
      ),
    },
    {
      title: t.algorithmsStepCornerPermutation,
      entries: TWO_LOOK_PLL_CASES.filter((entry) => entry.twoLook === 'corner-permutation').map(
        pllEntry,
      ),
    },
    {
      title: t.algorithmsStepEdgePermutation,
      entries: TWO_LOOK_PLL_CASES.filter((entry) => entry.twoLook === 'edge-permutation').map(
        pllEntry,
      ),
    },
  ]

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-6">
      <header className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-2xl font-semibold">{t.algorithmsTitle}</h1>
        <p className="text-sm leading-relaxed text-neutral-400">{t.algorithmsIntro}</p>
        <p className="text-sm leading-relaxed text-neutral-400">{t.algorithmsFigureHint}</p>
        {/* 78 cases is a long page, so the three sections are one tap apart. */}
        <nav aria-label={t.algorithmsContents} className="flex flex-wrap gap-2 pt-1 text-sm">
          {[
            { href: '#two-look', label: '2-look' },
            { href: '#oll', label: 'OLL' },
            { href: '#pll', label: 'PLL' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md border border-neutral-800 px-3 py-1.5 text-neutral-300 hover:text-neutral-100"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      {/* Lead with the subset: a beginner can finish every last layer with these
        * seventeen, and meets the rest later. */}
      <section id="two-look" className="flex scroll-mt-4 flex-col gap-6">
        <div className="flex max-w-2xl flex-col gap-2">
          <h2 className="text-xl font-semibold">{t.algorithmsTwoLookTitle}</h2>
          <p className="text-sm leading-relaxed text-neutral-400">
            {fill(t.algorithmsTwoLookBody, { twoLook: twoLookCount, full: fullCount })}
          </p>
        </div>
        {twoLookSteps.map((step) => (
          <CaseGroup key={step.title} title={step.title} entries={step.entries} />
        ))}
      </section>

      <section id="oll" className="flex scroll-mt-4 flex-col gap-6">
        <div className="flex max-w-2xl flex-col gap-2">
          <h2 className="text-xl font-semibold">{t.algorithmsOllTitle}</h2>
          <p className="text-sm leading-relaxed text-neutral-400">
            {fill(t.algorithmsOllBody, { count: OLL_CASES.length })}
          </p>
        </div>
        {OLL_FAMILIES.map((family) => (
          <CaseGroup
            key={family}
            title={OLL_FAMILY_NAME[family]}
            entries={OLL_CASES.filter((entry) => entry.family === family).map(ollEntry)}
          />
        ))}
      </section>

      <section id="pll" className="flex scroll-mt-4 flex-col gap-6">
        <div className="flex max-w-2xl flex-col gap-2">
          <h2 className="text-xl font-semibold">{t.algorithmsPllTitle}</h2>
          <p className="text-sm leading-relaxed text-neutral-400">
            {fill(t.algorithmsPllBody, { count: PLL_CASES.length })}
          </p>
        </div>
        {PLL_FAMILIES.map((family) => (
          <CaseGroup
            key={family}
            title={t[PLL_FAMILY_KEY[family]]}
            entries={PLL_CASES.filter((entry) => entry.family === family).map(pllEntry)}
          />
        ))}
      </section>
    </main>
  )
}
