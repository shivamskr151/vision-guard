import { Component, type ErrorInfo, type ReactNode } from 'react'
import styles from './ErrorBoundary.module.css'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = (): void => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className={styles.root} role="alert">
          <div className={styles.card}>
            <h1 className={styles.title}>Something went wrong</h1>
            <p className={styles.message}>
              An unexpected error occurred. You can try reloading the page.
            </p>
            <p className={styles.detail}>{this.state.error.message}</p>
            <button type="button" className={styles.button} onClick={this.handleReload}>
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
