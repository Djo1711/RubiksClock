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
  error,
  onRefresh,
}: {
  scramble: string
  loading: boolean
  error: boolean
  onRefresh: () => void
}) {
  const { t } = useI18n()
  const text = loading ? t.scrambleLoading : error ? t.scrambleError : scramble
  // One strip: cube, scramble, action. The cube's box is always in the layout,
  // even before the first scramble resolves, so nothing below it moves when the
  // preview appears.
  return (
    <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <p className="min-w-0 flex-1 text-center font-mono text-lg leading-relaxed text-neutral-200">
        {text}
      </p>
      {/* `sm:contents` dissolves this wrapper on wider screens, so the preview
        * and the button become items of the strip itself. Below that they stay
        * a row of their own under the scramble, which keeps the phone layout
        * two lines tall instead of three. */}
      <div className="flex items-center gap-4 sm:contents">
        <div aria-hidden="true" className="size-24 shrink-0 sm:order-first sm:size-28">
          {!error && scramble ? <CubePreview scramble={scramble} /> : null}
        </div>
        <Button variant="outline" onClick={onRefresh} disabled={loading} className="shrink-0">
          {t.newScramble}
        </Button>
      </div>
    </div>
  )
}
