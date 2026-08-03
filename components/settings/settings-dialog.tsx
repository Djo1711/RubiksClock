'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { keyLabel } from '@/components/timer/key-hints'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { locales } from '@/lib/i18n/dictionaries'
import { defaultSettings, type Settings } from '@/lib/settings'

export function SettingsDialog({
  settings,
  onChange,
}: {
  settings: Settings
  onChange: (settings: Settings) => void
}) {
  const { t, locale, setLocale } = useI18n()
  const [capturing, setCapturing] = useState<number | null>(null)

  // While capturing, this listener runs before the timer's own and swallows the
  // key press so remapping never arms the timer.
  useEffect(() => {
    if (capturing === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.code === 'Escape') {
        setCapturing(null)
        return
      }
      const taken = settings.keys.some((key, index) => key === event.code && index !== capturing)
      if (taken) return
      onChange({
        ...settings,
        keys: settings.keys.map((key, index) => (index === capturing ? event.code : key)),
      })
      setCapturing(null)
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [capturing, onChange, settings])

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>{t.settings}</DialogTrigger>
      <DialogContent data-timer-ignore className="space-y-6">
        <DialogHeader>
          <DialogTitle>{t.settings}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t.settingsKeys}</p>
          <div className="flex flex-wrap gap-2">
            {settings.keys.map((code, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-14 font-mono"
                onClick={() => setCapturing(index)}
              >
                {capturing === index ? '…' : keyLabel(code)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-neutral-400">
            {capturing === null ? t.settingsKeysHint : t.settingsKeysCapture}
          </p>
          <p className="text-xs text-neutral-500">{t.ghostingHint}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...settings, keys: [...defaultSettings.keys] })}
          >
            {t.settingsKeysReset}
          </Button>
        </div>

        <div className="flex items-start justify-between gap-4">
          <span>
            <span className="block text-sm font-medium">{t.settingsHideTime}</span>
            <span className="block text-xs text-neutral-400">{t.settingsHideTimeHint}</span>
          </span>
          <Switch
            aria-label={t.settingsHideTime}
            checked={settings.hideTimeWhileSolving}
            onCheckedChange={(checked) =>
              onChange({ ...settings, hideTimeWhileSolving: checked })
            }
          />
        </div>

        <div className="flex items-start justify-between gap-4">
          <span>
            <span className="block text-sm font-medium">{t.settingsSounds}</span>
            <span className="block text-xs text-neutral-400">{t.settingsSoundsHint}</span>
          </span>
          <Switch
            aria-label={t.settingsSounds}
            checked={settings.sounds}
            onCheckedChange={(checked) => onChange({ ...settings, sounds: checked })}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t.settingsLanguage}</p>
          <div className="flex gap-2">
            {locales.map((candidate) => (
              <Button
                key={candidate}
                size="sm"
                variant={locale === candidate ? 'default' : 'outline'}
                aria-pressed={locale === candidate}
                onClick={() => setLocale(candidate)}
              >
                {candidate.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
