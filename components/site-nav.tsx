'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/components/i18n-provider'

export function SiteNav() {
  const { t } = useI18n()
  const pathname = usePathname()
  const links = [
    { href: '/', label: t.navTimer },
    { href: '/algorithms', label: t.navAlgorithms },
    { href: '/history', label: t.navHistory },
    { href: '/leaderboard', label: t.navLeaderboard },
    { href: '/login', label: t.navSignIn },
  ]
  // Five destinations no longer fit across a narrow phone in one line, so the
  // bar keeps less room either side of the links there, and wraps rather than
  // pushing the page sideways if even that is not enough.
  return (
    <nav
      data-timer-ignore
      aria-label={t.appName}
      className="flex flex-wrap justify-center gap-1 border-b border-neutral-800 px-2 py-3 text-sm sm:px-4"
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? 'page' : undefined}
          className={`rounded-md px-2 py-1 sm:px-3 ${
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
