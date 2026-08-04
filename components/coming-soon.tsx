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
