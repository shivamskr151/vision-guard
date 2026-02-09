import { Link } from 'react-router-dom'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  return (
    <div className={styles.page} role="main">
      <h1 className={styles.code}>404</h1>
      <h2 className={styles.title}>Page not found</h2>
      <p className={styles.subtitle}>
        The page you’re looking for doesn’t exist or has been moved.
      </p>
      <Link to="/" className={styles.link}>
        Back to Overview
      </Link>
    </div>
  )
}
