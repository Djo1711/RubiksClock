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
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-4">
      <p className="text-center font-mono text-lg leading-relaxed text-neutral-200">{text}</p>
      <div className="flex items-center gap-6">
        {!error && scramble ? <CubePreview scramble={scramble} /> : null}
        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          {t.newScramble}
        </Button>
      </div>
    </div>
  )
}
