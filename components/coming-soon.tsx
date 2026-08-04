'use client'

import Link from 'next/link'
import { useI18n } from '@/components/i18n-provider'

export function ComingSoon() {
  const { t } = useI18n()
  return (
    // Same reason as the timer screen: this main sits under the site nav, so it
    // fills what the nav leaves rather than a whole viewport.
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">{t.comingSoonTitle}</h1>
      <p className="text-neutral-400">{t.comingSoonBody}</p>
      <Link href="/" className="text-sm underline underline-offset-4">
        {t.backToTimer}
      </Link>
    </main>
  )
}
