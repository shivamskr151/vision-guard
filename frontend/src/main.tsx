import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import App from './App'
import { SocketProvider } from '@/context/SocketContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <SocketProvider>
        <App />
      </SocketProvider>
    </ErrorBoundary>
  </StrictMode>,
)
