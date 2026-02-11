import { cn } from '@/lib/utils'

interface ProgressIndicatorProps {
  currentStep: 1 | 2 | 3
}

export function ProgressIndicator({ currentStep }: ProgressIndicatorProps): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            step === currentStep
              ? 'w-6 bg-primary'
              : step < currentStep
                ? 'w-1.5 bg-primary/60'
                : 'w-1.5 bg-border'
          )}
        />
      ))}
    </div>
  )
}
