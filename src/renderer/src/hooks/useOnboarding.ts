import { useState, useEffect, useCallback } from 'react'

export interface StepState {
  1: { cliInstalled: boolean; cliVersion: string | null }
  2: { authenticated: boolean; accountInfo: string | null }
  3: { projectSelected: boolean; projectPath: string | null }
}

export function useOnboarding() {
  const [onboardingDone, setOnboardingDone] = useState(true) // Default true to avoid flash
  const [initialized, setInitialized] = useState(false)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [steps, setSteps] = useState<StepState>({
    1: { cliInstalled: false, cliVersion: null },
    2: { authenticated: false, accountInfo: null },
    3: { projectSelected: false, projectPath: null }
  })

  useEffect(() => {
    ;(async () => {
      const done = (await window.settings.get('onboardingDone')) as boolean | null
      setOnboardingDone(done === true)
      setInitialized(true)
    })()
  }, [])

  const updateStep = useCallback(<S extends 1 | 2 | 3>(step: S, data: Partial<StepState[S]>) => {
    setSteps((prev) => ({
      ...prev,
      [step]: { ...prev[step], ...data }
    }))
  }, [])

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev))
  }, [])

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev))
  }, [])

  const completeOnboarding = useCallback(() => {
    setOnboardingDone(true)
    window.settings.set('onboardingDone', true)
  }, [])

  return {
    onboardingDone,
    initialized,
    currentStep,
    steps,
    nextStep,
    prevStep,
    updateStep,
    completeOnboarding
  }
}
