import { Sun, Monitor, Moon } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { SettingsItem } from '../SettingsItem'
import { SegmentedControl } from '../SegmentedControl'
import type { AppSettings } from '@/types/settings'

type Theme = AppSettings['appearance']['theme']
type FontSize = AppSettings['appearance']['fontSize']

export function AppearanceSection(): JSX.Element {
  const { settings, updateSetting } = useSettings()

  const themeOptions: { value: Theme; label: React.ReactNode }[] = [
    { value: 'light', label: <><Sun className="mr-1.5 h-3.5 w-3.5" />Светлая</> },
    { value: 'system', label: <><Monitor className="mr-1.5 h-3.5 w-3.5" />Системная</> },
    { value: 'dark', label: <><Moon className="mr-1.5 h-3.5 w-3.5" />Тёмная</> }
  ]

  const fontSizeOptions: { value: FontSize; label: string }[] = [
    { value: 'small', label: 'S' },
    { value: 'medium', label: 'M' },
    { value: 'large', label: 'L' }
  ]

  return (
    <div className="space-y-2">
      <SettingsItem label="Тема" description="Выберите цветовую схему приложения">
        <SegmentedControl
          options={themeOptions}
          value={settings.appearance.theme}
          onChange={(v) => updateSetting('appearance', 'theme', v)}
        />
      </SettingsItem>

      <SettingsItem label="Размер шрифта чата" description="Размер текста в сообщениях">
        <SegmentedControl
          options={fontSizeOptions}
          value={settings.appearance.fontSize}
          onChange={(v) => updateSetting('appearance', 'fontSize', v)}
        />
      </SettingsItem>

      <SettingsItem label="Размер шрифта кода" description="Размер текста в блоках кода">
        <SegmentedControl
          options={fontSizeOptions}
          value={settings.appearance.codeFontSize}
          onChange={(v) => updateSetting('appearance', 'codeFontSize', v)}
        />
      </SettingsItem>
    </div>
  )
}
