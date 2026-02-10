import type { ReactNode } from 'react'

interface SettingsItemProps {
  label: string
  description?: string
  children: ReactNode
}

export function SettingsItem({ label, description, children }: SettingsItemProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-[13px] text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
