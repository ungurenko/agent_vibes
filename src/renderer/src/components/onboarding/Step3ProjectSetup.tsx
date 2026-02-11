import { useState } from 'react'
import { motion } from 'motion/react'
import { Sparkles, MessageSquare, Zap, GitBranch, FolderOpen, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Step3ProjectSetupProps {
  onComplete: (projectPath: string) => void
}

const features = [
  {
    icon: MessageSquare,
    title: 'Чат с кодом',
    description: 'Задавайте вопросы о проекте'
  },
  {
    icon: Zap,
    title: 'Генерация кода',
    description: 'Создавайте и редактируйте файлы'
  },
  {
    icon: GitBranch,
    title: 'Git-интеграция',
    description: 'Коммиты, ветки, PR'
  }
]

export function Step3ProjectSetup({ onComplete }: Step3ProjectSetupProps): JSX.Element {
  const [projectPath, setProjectPath] = useState<string | null>(null)

  const handleSelectFolder = async (): Promise<void> => {
    const folder = await window.dialog.selectFolder()
    if (folder) {
      setProjectPath(folder)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-6"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold">Всё готово!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Выберите проект и начните работу
        </p>
      </div>

      <div className="grid w-full grid-cols-3 gap-2">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="flex flex-col items-center gap-2 rounded-xl border border-border/60 p-3 text-center"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium">{title}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full">
        {!projectPath ? (
          <Button onClick={handleSelectFolder} variant="outline" className="w-full gap-2">
            <FolderOpen className="h-4 w-4" />
            Выбрать папку проекта
          </Button>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/5 p-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <p className="text-sm truncate font-mono">{projectPath}</p>
          </div>
        )}
      </div>

      {projectPath && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <Button onClick={() => onComplete(projectPath)} className="w-full">
            Начать работу
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}
