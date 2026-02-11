import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Paintbrush, MessageSquare, Bot, Database } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { AppearanceSection } from './sections/AppearanceSection'
import { ChatSection } from './sections/ChatSection'
import { ModelSection } from './sections/ModelSection'
import { DataSection } from './sections/DataSection'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClearHistory: () => Promise<void>
}

const sections = [
  { id: 'appearance', label: 'Внешний вид', icon: Paintbrush },
  { id: 'chat', label: 'Чат', icon: MessageSquare },
  { id: 'model', label: 'Модель', icon: Bot },
  { id: 'data', label: 'Данные', icon: Database }
] as const

type SectionId = (typeof sections)[number]['id']

export function SettingsDialog({ open, onOpenChange, onClearHistory }: SettingsDialogProps): JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId>('appearance')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px] max-h-[min(520px,85vh)] h-auto p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg">Настройки</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Left navigation */}
          <nav className="w-[160px] shrink-0 border-r border-border py-3 px-2">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  activeSection === id
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>

          {/* Right panel */}
          <ScrollArea className="flex-1">
            <div className="px-6 py-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeSection === 'appearance' && <AppearanceSection />}
                  {activeSection === 'chat' && <ChatSection />}
                  {activeSection === 'model' && <ModelSection />}
                  {activeSection === 'data' && <DataSection onClearHistory={onClearHistory} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
