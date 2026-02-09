import type { KPICardData } from '@/types'
import styles from './KPICard.module.css'

const variantClass = {
  assets: styles.cardAssets,
  due: styles.cardDue,
  overdue: styles.cardOverdue,
  anomalies: styles.cardAnomalies,
  compliance: styles.cardCompliance,
  risk: styles.cardRisk,
} as Record<KPICardData['variant'], string>

export function KPICard({ variant, title, value, description, trend }: KPICardData) {
  const cardClass = [styles.card, variantClass[variant]].join(' ')

  return (
    <article className={cardClass} aria-labelledby={`kpi-${variant}-value`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.icon} aria-hidden>
          <KPIIcon variant={variant} />
        </span>
      </div>
      <div className={styles.body}>
        <span id={`kpi-${variant}-value`} className={styles.value}>
          {value}
        </span>
        <p className={styles.description}>{description}</p>
        {trend && (
          <p className={[styles.trend, trend.positive ? styles.trendPositive : styles.trendNegative].join(' ')}>
            {trend.value}
          </p>
        )}
      </div>
    </article>
  )
}

function KPIIcon({ variant }: { variant: KPICardData['variant'] }) {
  const size = 28
  switch (variant) {
    case 'assets':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        </svg>
      )
    case 'due':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      )
    case 'overdue':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'anomalies':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      )
    case 'compliance':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    case 'risk':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    default:
      return null
  }
}
