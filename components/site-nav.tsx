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
