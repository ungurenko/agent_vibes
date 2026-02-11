import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-foreground">
          <h1 className="text-xl font-semibold">Что-то пошло не так</h1>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Произошла непредвиденная ошибка. Попробуйте перезапустить приложение.
          </p>
          {this.state.error && (
            <pre className="mt-2 max-w-lg overflow-auto rounded-lg bg-muted p-4 text-xs">
              {this.state.error.message}
            </pre>
          )}
          <button
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            onClick={() => window.location.reload()}
          >
            Перезагрузить
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
