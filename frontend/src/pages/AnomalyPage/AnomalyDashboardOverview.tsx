import type { AnomalyKpiCard } from '@/types'
import styles from './AnomalyDashboardOverview.module.css'

const variantClass = {
  total: styles.cardTotal,
  critical: styles.cardCritical,
  affected: styles.cardAffected,
  cameras: styles.cardCameras,
} as Record<AnomalyKpiCard['variant'], string>

function CardIcon({ variant }: { variant: AnomalyKpiCard['variant'] }) {
  const size = 24
  const color = variant === 'cameras' ? 'currentColor' : 'white'
  switch (variant) {
    case 'total':
    case 'critical':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'affected':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      )
    case 'cameras':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      )
    default:
      return null
  }
}

export function AnomalyDashboardOverview({ cards }: { cards: AnomalyKpiCard[] }) {
  return (
    <div className={styles.grid} role="list">
      {cards.map((card) => (
        <div key={card.id} className={styles.cardWrap} role="listitem">
          <article className={[styles.card, variantClass[card.variant]].join(' ')}>
            <h3 className={styles.title}>{card.title}</h3>
            <span className={styles.value}>{card.value}</span>
            <span className={styles.icon} aria-hidden>
              <CardIcon variant={card.variant} />
            </span>
          </article>
        </div>
      ))}
    </div>
  )
}
