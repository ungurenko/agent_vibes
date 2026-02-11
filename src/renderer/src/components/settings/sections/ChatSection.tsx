import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useSettings } from '@/hooks/useSettings'
import { SettingsItem } from '../SettingsItem'
import { SegmentedControl } from '../SegmentedControl'
import type { AppSettings } from '@/types/settings'

type ContentWidth = AppSettings['chat']['maxContentWidth']

export function ChatSection(): JSX.Element {
  const { settings, updateSetting } = useSettings()

  const widthOptions: { value: ContentWidth; label: string }[] = [
    { value: 'narrow', label: 'Узкий' },
    { value: 'medium', label: 'Средний' },
    { value: 'wide', label: 'Широкий' }
  ]

  return (
    <div className="space-y-2">
      <SettingsItem
        label="Отправка по Enter"
        description="Если выключено, Enter — перенос строки, Cmd+Enter — отправка"
      >
        <Switch
          checked={settings.chat.sendOnEnter}
          onCheckedChange={(v) => updateSetting('chat', 'sendOnEnter', v)}
        />
      </SettingsItem>

      <SettingsItem label="Метки времени" description="Когда показывать время сообщения">
        <Select
          value={settings.chat.showTimestamps}
          onValueChange={(v) => updateSetting('chat', 'showTimestamps', v as AppSettings['chat']['showTimestamps'])}
        >
          <SelectTrigger className="w-[150px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hover">При наведении</SelectItem>
            <SelectItem value="always">Всегда</SelectItem>
            <SelectItem value="never">Никогда</SelectItem>
          </SelectContent>
        </Select>
      </SettingsItem>

      <SettingsItem label="Ширина контента" description="Максимальная ширина области сообщений">
        <SegmentedControl
          options={widthOptions}
          value={settings.chat.maxContentWidth}
          onChange={(v) => updateSetting('chat', 'maxContentWidth', v)}
        />
      </SettingsItem>
    </div>
  )
}
