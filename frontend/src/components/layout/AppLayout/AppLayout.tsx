import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar/Sidebar'
import styles from './AppLayout.module.css'

export function AppLayout() {
  return (
    <div className={styles.layout}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <Sidebar />
      <div className={styles.main}>
        <main className={styles.content} id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
