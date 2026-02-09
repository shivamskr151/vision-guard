import styles from './PlaceholderPage.module.css'

interface PlaceholderPageProps {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>This section is not implemented yet.</p>
    </div>
  )
}
