import styles from './AnomalyPage.module.css'
import type { AnomalyEvent } from '@/types'

function IconFilter() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

interface AnomalyFiltersProps {
  events: AnomalyEvent[]
  filters: {
    severity: string
    type: string
    asset: string
    camera: string
    status: string
  }
  onFilterChange: (key: string, value: string) => void
}

export function AnomalyFilters({ events, filters, onFilterChange }: AnomalyFiltersProps) {
  // Derive unique values for filters
  const severities = Array.from(new Set(events.map(e => e.severity))).sort()
  const types = Array.from(new Set(events.map(e => e.type))).sort()
  const assets = Array.from(new Set(events.map(e => e.asset))).sort()
  const cameras = Array.from(new Set(events.map(e => e.camera))).sort()

  return (
    <div className={styles.filtersRow} role="group" aria-label="Anomaly filters">
      <span className={styles.filterIcon} aria-hidden>
        <IconFilter />
      </span>
      <span className={styles.filterLabel}>Filters:</span>

      <select
        className={styles.filterSelect}
        aria-label="Filter by Severity"
        value={filters.severity}
        onChange={(e) => onFilterChange('severity', e.target.value)}
      >
        <option value="">All Severities</option>
        {severities.map(s => (
          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
        ))}
      </select>

      <select
        className={styles.filterSelect}
        aria-label="Filter by Type"
        value={filters.type}
        onChange={(e) => onFilterChange('type', e.target.value)}
      >
        <option value="">All Types</option>
        {types.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <select
        className={styles.filterSelect}
        aria-label="Filter by Asset"
        value={filters.asset}
        onChange={(e) => onFilterChange('asset', e.target.value)}
      >
        <option value="">All Assets</option>
        {assets.map(a => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      <select
        className={styles.filterSelect}
        aria-label="Filter by Camera"
        value={filters.camera}
        onChange={(e) => onFilterChange('camera', e.target.value)}
      >
        <option value="">All Cameras</option>
        {cameras.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  )
}
