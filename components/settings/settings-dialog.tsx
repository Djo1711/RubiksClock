'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
import { KEY_MAPS, KEYS_PER_HAND_OPTIONS, keysPerHand } from '@/lib/timer/machine'

// Space is intercepted by useSpeedTimer to dispatch `stop` before any
// per-code binding is even checked, so binding a slot to it would produce a
// key that can never be held. Tab and Enter fight the dialog's own focus
// handling. All three are refused, exactly like an already-bound code.
const DENIED_CODES: ReadonlySet<string> = new Set(['Space', 'Tab', 'Enter'])

export function SettingsDialog({
  settings,
  onChange,
}: {
  settings: Settings
  onChange: (settings: Settings) => void
}) {
  const { t, locale, setLocale } = useI18n()
  const [capturing, setCapturing] = useState<number | null>(null)
  const [open, setOpen] = useState(false)

  // The ghosting diagnostic. Held codes live in a ref because only the counts
  // are rendered, and a ref keeps the two handlers below from racing on state.
  const heldCodes = useRef<Set<string>>(new Set())
  const [heldCount, setHeldCount] = useState(0)
  const [maxHeldCount, setMaxHeldCount] = useState(0)

  const resetKeyboardTest = useCallback(() => {
    heldCodes.current.clear()
    setHeldCount(0)
    setMaxHeldCount(0)
  }, [])

  // While the dialog is open, count every key held so the user can discover how
  // many their keyboard can actually report at once — the whole point of the
  // test, so unmapped keys count too. Stopping propagation in the capture phase
  // also shields the timer: the event never bubbles back to the window listener
  // useSpeedTimer registers, so testing keys cannot arm a solve underneath.
  // Escape and Tab pass through, or the dialog could not be dismissed or
  // traversed.
  useEffect(() => {
    if (!open) return
    const shield = (event: KeyboardEvent) => {
      if (event.code !== 'Escape' && event.code !== 'Tab') event.stopPropagation()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      shield(event)
      if (event.repeat) return
      heldCodes.current.add(event.code)
      const count = heldCodes.current.size
      setHeldCount(count)
      setMaxHeldCount((previous) => Math.max(previous, count))
    }
    const onKeyUp = (event: KeyboardEvent) => {
      shield(event)
      heldCodes.current.delete(event.code)
      setHeldCount(heldCodes.current.size)
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    window.addEventListener('keyup', onKeyUp, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      window.removeEventListener('keyup', onKeyUp, { capture: true })
    }
  }, [open])

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
      if (DENIED_CODES.has(event.code)) return
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setCapturing(null)
          resetKeyboardTest()
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>{t.settings}</DialogTrigger>
      <DialogContent data-timer-ignore className="space-y-6">
        <DialogHeader>
          <DialogTitle>{t.settings}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t.settingsKeysPerHand}</p>
          <div className="flex gap-2">
            {KEYS_PER_HAND_OPTIONS.map((count) => {
              const active = keysPerHand(settings.keys) === count
              return (
                <Button
                  key={count}
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  aria-pressed={active}
                  onClick={() => onChange({ ...settings, keys: [...KEY_MAPS[count]] })}
                >
                  {count}
                </Button>
              )
            })}
          </div>
          <p className="text-xs text-neutral-400">{t.settingsKeysPerHandHint}</p>
        </div>

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

        <div className="space-y-2 rounded-lg border border-neutral-500 p-3">
          <p className="text-sm font-medium">{t.settingsKeyboardTest}</p>
          <p className="text-xs text-neutral-400">{t.settingsKeyboardTestHint}</p>
          <div className="flex items-end gap-6">
            <span>
              <span className="block text-[0.7rem] tracking-wide text-neutral-500 uppercase">
                {t.settingsKeysHeldNow}
              </span>
              <span data-testid="keys-held-now" className="font-mono text-2xl tabular-nums">
                {heldCount}
              </span>
            </span>
            <span>
              <span className="block text-[0.7rem] tracking-wide text-neutral-500 uppercase">
                {t.settingsKeysHeldMax}
              </span>
              <span
                data-testid="keys-held-max"
                className="font-mono text-2xl tabular-nums text-(--color-state-ready)"
              >
                {maxHeldCount}
              </span>
            </span>
            <Button variant="ghost" size="sm" onClick={resetKeyboardTest}>
              {t.settingsKeyboardTestReset}
            </Button>
          </div>
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
