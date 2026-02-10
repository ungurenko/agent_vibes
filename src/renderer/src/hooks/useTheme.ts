import { useEffect } from 'react'
import { useSettings } from './useSettings'

export type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const { settings, updateSetting } = useSettings()
  const theme = settings.appearance.theme

  const setTheme = (newTheme: Theme): void => {
    updateSetting('appearance', 'theme', newTheme)
  }

  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    function applyTheme(): void {
      const isDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches)
      root.classList.toggle('dark', isDark)
    }

    applyTheme()
    mediaQuery.addEventListener('change', applyTheme)
    return () => mediaQuery.removeEventListener('change', applyTheme)
  }, [theme])

  return { theme, setTheme }
}
