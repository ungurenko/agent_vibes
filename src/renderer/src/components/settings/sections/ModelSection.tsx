import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useSettings } from '@/hooks/useSettings'
import { SettingsItem } from '../SettingsItem'
import type { ModelAlias } from '@/types/claude'

export function ModelSection(): JSX.Element {
  const { settings, updateSetting } = useSettings()

  return (
    <div className="space-y-2">
      <SettingsItem label="Модель по умолчанию" description="Модель Claude для новых чатов">
        <Select
          value={settings.model.default}
          onValueChange={(v) => updateSetting('model', 'default', v as ModelAlias)}
        >
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sonnet">Sonnet 4.5</SelectItem>
            <SelectItem value="opus">Opus 4.6</SelectItem>
            <SelectItem value="haiku">Haiku 4.5</SelectItem>
          </SelectContent>
        </Select>
      </SettingsItem>

      <div className="py-3">
        <p className="text-sm font-medium mb-1.5">System prompt</p>
        <p className="text-[13px] text-muted-foreground mb-2.5">
          Дополнительные инструкции для Claude при каждом запросе
        </p>
        <Textarea
          value={settings.model.systemPrompt}
          onChange={(e) => updateSetting('model', 'systemPrompt', e.target.value)}
          placeholder="Например: Отвечай кратко и по делу. Используй русский язык."
          className="min-h-[100px] text-sm resize-none"
        />
      </div>
    </div>
  )
}
