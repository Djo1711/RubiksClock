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
