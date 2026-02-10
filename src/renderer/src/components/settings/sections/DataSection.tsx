import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsItem } from '../SettingsItem'

interface DataSectionProps {
  onClearHistory: () => Promise<void>
}

export function DataSection({ onClearHistory }: DataSectionProps): JSX.Element {
  const [confirming, setConfirming] = useState(false)
  const [clearing, setClearing] = useState(false)

  const handleClear = async (): Promise<void> => {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
      return
    }
    setClearing(true)
    await onClearHistory()
    setClearing(false)
    setConfirming(false)
  }

  return (
    <div className="space-y-2">
      <SettingsItem
        label="Очистить историю"
        description="Удалить все сессии чатов безвозвратно"
      >
        <Button
          variant={confirming ? 'destructive' : 'outline'}
          size="sm"
          className="text-sm h-9"
          onClick={handleClear}
          disabled={clearing}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {clearing ? 'Удаление...' : confirming ? 'Подтвердить?' : 'Очистить'}
        </Button>
      </SettingsItem>

      <SettingsItem label="Путь к данным" description="Расположение файлов приложения">
        <code className="text-[13px] text-muted-foreground bg-muted rounded px-2 py-1">
          ~/.vibes-agent/
        </code>
      </SettingsItem>
    </div>
  )
}
