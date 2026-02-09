import type { AnomalyEvent, AnomalyEventSeverity } from '@/types'
import styles from './AnomalyEventFeed.module.css'

const severityClass = {
  critical: styles.severityCritical,
  high: styles.severityHigh,
  medium: styles.severityMedium,
  low: styles.severityLow,
} as Record<AnomalyEventSeverity, string>

export function AnomalyEventFeed({ events }: { events: AnomalyEvent[] }) {
  return (
    <div className={styles.feed} role="list">
      {events.map((event) => (
        <article key={event.id} className={styles.card} role="listitem">
          <div className={styles.previewBox} aria-hidden>
            <span className={styles.previewPlaceholder} />
          </div>
          <div className={styles.cardBody}>
            <div className={styles.cardHeader}>
              <span className={[styles.severityBadge, severityClass[event.severity]].join(' ')}>
                {event.severity.charAt(0).toUpperCase() + event.severity.slice(1)}
              </span>
              <span className={styles.timeAgo}>{event.timeAgo}</span>
            </div>
            <div className={styles.eventType}>{event.type}</div>
            <p className={styles.description}>{event.description}</p>
            <div className={styles.details}>
              <div className={styles.detailsRow}>
                <span className={styles.detailsLabel}>Asset:</span>
                <span className={styles.detailsValue}>{event.asset}</span>
              </div>
              <div className={styles.detailsRow}>
                <span className={styles.detailsLabel}>Camera:</span>
                <span className={styles.detailsValue}>{event.camera}</span>
              </div>
              <div className={styles.detailsRow}>
                <span className={styles.detailsLabel}>Confidence:</span>
                <span className={styles.detailsValue}>{event.confidence}%</span>
              </div>
              <div className={styles.detailsRow}>
                <span className={styles.detailsLabel}>Timestamp:</span>
                <span className={styles.detailsValue}>{event.timestamp}</span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
