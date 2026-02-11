import { useCallback } from 'react'
import { AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useOnboarding } from '@/hooks/useOnboarding'
import { ProgressIndicator } from './ProgressIndicator'
import { Step1CLISetup } from './Step1CLISetup'
import { Step2Auth } from './Step2Auth'
import { Step3ProjectSetup } from './Step3ProjectSetup'

interface OnboardingWizardProps {
  onComplete: (projectPath: string) => void
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps): JSX.Element {
  const { currentStep, steps, nextStep, prevStep, updateStep, completeOnboarding } = useOnboarding()

  const handleStep1Complete = useCallback(
    (version: string) => {
      updateStep(1, { cliInstalled: true, cliVersion: version })
    },
    [updateStep]
  )

  const handleStep2Complete = useCallback(
    (accountInfo: string | null) => {
      updateStep(2, { authenticated: true, accountInfo })
    },
    [updateStep]
  )

  const handleStep3Complete = useCallback(
    (projectPath: string) => {
      updateStep(3, { projectSelected: true, projectPath })
      completeOnboarding()
      onComplete(projectPath)
    },
    [updateStep, completeOnboarding, onComplete]
  )

  const canGoNext =
    (currentStep === 1 && steps[1].cliInstalled) ||
    (currentStep === 2 && steps[2].authenticated)

  return (
    <div className="flex h-screen flex-col items-center justify-center px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <ProgressIndicator currentStep={currentStep} />

        <div className="w-full min-h-[360px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <Step1CLISetup key="step1" onComplete={handleStep1Complete} />
            )}
            {currentStep === 2 && (
              <Step2Auth key="step2" onComplete={handleStep2Complete} />
            )}
            {currentStep === 3 && (
              <Step3ProjectSetup key="step3" onComplete={handleStep3Complete} />
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        {currentStep < 3 && (
          <div className="flex w-full items-center justify-between">
            <div>
              {currentStep > 1 && (
                <Button variant="ghost" size="sm" onClick={prevStep} className="gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  Назад
                </Button>
              )}
            </div>
            <Button size="sm" onClick={nextStep} disabled={!canGoNext} className="gap-1">
              Далее
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {currentStep === 3 && (
          <div className="flex w-full items-center justify-start">
            <Button variant="ghost" size="sm" onClick={prevStep} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Назад
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground/50">
          Шаг {currentStep} из 3
        </p>
      </div>
    </div>
  )
}
