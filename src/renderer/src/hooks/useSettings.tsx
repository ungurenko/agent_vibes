import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, type AppSettings, type SettingsSection } from '@/types/settings'

interface SettingsContextValue {
  settings: AppSettings
  updateSetting: <S extends SettingsSection>(
    section: S,
    key: keyof AppSettings[S],
    value: AppSettings[S][keyof AppSettings[S]]
  ) => void
  resetSettings: () => void
  loaded: boolean
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function deepMerge<T extends Record<string, unknown>>(defaults: T, overrides: Record<string, unknown>): T {
  const result = { ...defaults }
  for (const key of Object.keys(defaults)) {
    if (
      overrides[key] !== undefined &&
      typeof defaults[key] === 'object' &&
      defaults[key] !== null &&
      !Array.isArray(defaults[key])
    ) {
      result[key as keyof T] = deepMerge(
        defaults[key] as Record<string, unknown>,
        (overrides[key] as Record<string, unknown>) || {}
      ) as T[keyof T]
    } else if (overrides[key] !== undefined) {
      result[key as keyof T] = overrides[key] as T[keyof T]
    }
  }
  return result
}

export function SettingsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  // Load settings on mount
  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const stored = await window.settings.getAll()
        const merged = deepMerge(DEFAULT_SETTINGS, stored)

        // Migrate from localStorage if needed
        const legacyTheme = localStorage.getItem('claude-theme')
        const legacyModel = localStorage.getItem('claude-model')
        let migrated = false

        if (legacyTheme && !stored.appearance) {
          merged.appearance.theme = legacyTheme as AppSettings['appearance']['theme']
          localStorage.removeItem('claude-theme')
          migrated = true
        }

        if (legacyModel && !stored.model) {
          merged.model.default = legacyModel as AppSettings['model']['default']
          localStorage.removeItem('claude-model')
          migrated = true
        }

        setSettings(merged)

        if (migrated) {
          await window.settings.setAll(merged as unknown as Record<string, unknown>)
        }
      } catch {
        setSettings(DEFAULT_SETTINGS)
      }
      setLoaded(true)
    }
    load()
  }, [])

  const updateSetting = useCallback(
    <S extends SettingsSection>(
      section: S,
      key: keyof AppSettings[S],
      value: AppSettings[S][keyof AppSettings[S]]
    ) => {
      setSettings((prev) => {
        const next = {
          ...prev,
          [section]: {
            ...prev[section],
            [key]: value
          }
        }
        // Persist async
        window.settings.setAll(next as unknown as Record<string, unknown>).catch(console.error)
        return next
      })
    },
    []
  )

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    window.settings.reset()
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings, loaded }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
