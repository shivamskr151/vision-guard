import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar/Sidebar'
import { useSocket } from '@/context/SocketContext'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const { isConnected } = useSocket()
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }))

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className={styles.layout}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <Sidebar systemStatus={{ operational: isConnected, lastUpdated: currentTime }} />
      <div className={styles.main}>
        <main className={styles.content} id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

