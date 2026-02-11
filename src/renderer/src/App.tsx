import { useState, useCallback, useEffect } from 'react'
import { LayoutGroup, MotionConfig } from 'motion/react'
import { useClaude } from '@/hooks/useClaude'
import { useProject } from '@/hooks/useProject'

import { useSettings } from '@/hooks/useSettings'
import { useSessions } from '@/hooks/useSessions'
import { useSkills } from '@/hooks/useSkills'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { Sidebar } from '@/components/Sidebar'
import { ChatWindow } from '@/components/ChatWindow'
import { InputArea } from '@/components/InputArea'
import { ToolActivity } from '@/components/ToolActivity'
import { StatusBar } from '@/components/StatusBar'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { Play, MoreHorizontal } from 'lucide-react'
import type { ModelAlias, AttachedImage, SkillInfo } from '@/types/claude'

export function App(): JSX.Element {
  const { messages, status, totalCost, currentTools, sendMessage, stopGeneration, switchSession, removeSessionCache, clearAllCache, resetStatusToIdle, approvePlan, rejectPlan } =
    useClaude()
  const { projectDir, projectName, selectProject, setProjectDir } = useProject()

  const { settings } = useSettings()
  const { sessions, activeSessionId, addSession, updateSession, removeSession, selectSession, clearAllSessions } =
    useSessions()
  const { onboardingDone, completeOnboarding } = useOnboarding()
  const { skills, activeSkillIds, activeSkills, activeSkillsContent, toggleSkill, deactivateSkill, clearActiveSkills } = useSkills()
  const [planModeEnabled, setPlanModeEnabled] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [model, setModel] = useState<ModelAlias>(() => settings.model.default)

  // Sync model with settings when loaded
  useEffect(() => {
    setModel(settings.model.default)
  }, [settings.model.default])

  const handleModelChange = useCallback((newModel: ModelAlias) => {
    setModel(newModel)
  }, [])

  const handleSend = useCallback(
    (text: string, images: AttachedImage[] = []) => {
      if (!projectDir) return

      // Complete onboarding on first message
      if (!onboardingDone) {
        completeOnboarding()
      }

      // Create session if none active
      if (!activeSessionId) {
        const sessionId = crypto.randomUUID()
        const title = text || 'Image attachment'
        addSession({
          id: sessionId,
          title: title.length > 40 ? title.slice(0, 40) + '...' : title,
          projectName: projectName || 'Unknown',
          projectDir,
          messageCount: 1,
          totalCost: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
        switchSession(sessionId)
      } else {
        updateSession(activeSessionId, {
          messageCount: messages.length + 1,
          totalCost
        })
      }

      sendMessage(text, projectDir, images.length > 0 ? images : undefined, model, settings.model.systemPrompt || undefined, planModeEnabled, activeSkillsContent || undefined)
    },
    [projectDir, sendMessage, model, activeSessionId, addSession, updateSession, switchSession, projectName, messages.length, totalCost, onboardingDone, completeOnboarding, settings.model.systemPrompt, planModeEnabled, activeSkillsContent]
  )

  const handleSuggestion = useCallback(
    (text: string) => {
      if (!projectDir) return
      handleSend(text)
    },
    [projectDir, handleSend]
  )

  const handleApprovePlan = useCallback((messageId: string) => {
    if (!projectDir) return
    approvePlan(messageId, projectDir, model, settings.model.systemPrompt || undefined)
  }, [projectDir, approvePlan, model, settings.model.systemPrompt])

  const handleRejectPlan = useCallback((messageId: string) => {
    rejectPlan(messageId)
  }, [rejectPlan])

  const handleNewChat = useCallback(() => {
    setPlanModeEnabled(false)
    clearActiveSkills()
    switchSession(null)
    selectSession(null)
  }, [switchSession, selectSession, clearActiveSkills])

  const handleSelectSession = useCallback((id: string | null) => {
    switchSession(id)
    selectSession(id)
  }, [switchSession, selectSession])

  const handleDeleteSession = useCallback((id: string) => {
    removeSessionCache(id)
    removeSession(id)
  }, [removeSessionCache, removeSession])

  const handleRenameSession = useCallback((id: string, title: string) => {
    updateSession(id, { title })
  }, [updateSession])

  const handleClearHistory = useCallback(async () => {
    await window.data.clearHistory()
    clearAllSessions()
    clearAllCache()
    switchSession(null)
  }, [clearAllSessions, clearAllCache, switchSession])

  const isProcessing = status === 'thinking' || status === 'executing'

  // Auto-reset done → idle after 3 seconds
  useEffect(() => {
    if (status !== 'done') return
    const timer = setTimeout(resetStatusToIdle, 3000)
    return () => clearTimeout(timer)
  }, [status, resetStatusToIdle])

  // Auto-collapse sidebar on narrow window
  useEffect(() => {
    const handleResize = (): void => {
      if (window.innerWidth < 900) {
        setSidebarCollapsed(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewChat: handleNewChat,
    onToggleSidebar: () => setSidebarCollapsed((prev) => !prev),
    onFocusInput: () => {
      const textarea = document.querySelector('textarea')
      textarea?.focus()
    },
    onSelectProject: selectProject,
    onStopGeneration: stopGeneration,
    onOpenSettings: () => setSettingsOpen(true),
    isProcessing
  })

  const showOnboarding = !onboardingDone

  if (showOnboarding) {
    return (
      <MotionConfig reducedMotion="user">
        <OnboardingWizard
          onComplete={(path) => {
            setProjectDir(path)
            completeOnboarding()
          }}
        />
      </MotionConfig>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
    <LayoutGroup>
      <div className="flex h-screen font-sans">
        {/* Sidebar */}
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          collapsed={sidebarCollapsed}
          projectDir={projectDir}
          onNewChat={handleNewChat}
          onSelectThread={(session) => {
            if (session.projectDir && session.projectDir !== projectDir) {
              setProjectDir(session.projectDir)
            }
            handleSelectSession(session.id)
          }}
          onDeleteSession={handleDeleteSession}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          onRenameSession={handleRenameSession}
          onOpenSettings={() => setSettingsOpen(true)}
          onSelectProject={setProjectDir}
        />

        {/* Main content area */}
        <div className="flex flex-1 flex-col">
          {/* Header bar */}
          <header
            className="flex shrink-0 items-center justify-between bg-background border-b border-border px-4"
            style={{ paddingTop: 38, minHeight: 38 + 48 }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {(() => {
                const activeSession = sessions.find(s => s.id === activeSessionId)
                return activeSession ? (
                  <>
                    <span className="truncate text-sm font-medium">{activeSession.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{projectName}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">{projectName || 'Vibes Agent'}</span>
                )
              })()}
            </div>
            <div className="flex items-center gap-1">
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Play className="h-4 w-4" />
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Chat area */}
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            <ChatWindow
              messages={messages}
              status={status}
              projectName={projectName}
              onSuggestion={handleSuggestion}
              onApprovePlan={handleApprovePlan}
              onRejectPlan={handleRejectPlan}
              isProcessing={isProcessing}
            />

            {/* Tool activity overlay */}
            {currentTools.length > 0 && (
              <div className="border-t border-border px-4 py-2">
                <div className="mx-auto max-w-3xl">
                  <ToolActivity tools={currentTools} />
                </div>
              </div>
            )}

            {/* Input area */}
            <InputArea
              onSend={handleSend}
              disabled={!projectDir}
              isProcessing={isProcessing}
              onStop={stopGeneration}
              onSelectProject={selectProject}
              planModeEnabled={planModeEnabled}
              onTogglePlanMode={() => setPlanModeEnabled(prev => !prev)}
              skills={skills}
              activeSkills={activeSkills}
              activeSkillIds={activeSkillIds}
              onToggleSkill={toggleSkill}
              onDeactivateSkill={deactivateSkill}
              model={model}
              onModelChange={handleModelChange}
            />
          </div>

          {/* Status bar */}
          <StatusBar
            status={status}
            totalCost={totalCost}
          />
        </div>
      </div>

      {/* Settings modal */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onClearHistory={handleClearHistory}
      />
    </LayoutGroup>
    </MotionConfig>
  )
}

export default App
