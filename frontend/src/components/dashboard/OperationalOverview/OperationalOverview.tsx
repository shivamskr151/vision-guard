import type { TimeRange } from '@/types'
import styles from './OperationalOverview.module.css'

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
]

interface OperationalOverviewProps {
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
  children: React.ReactNode
}

export function OperationalOverview({
  timeRange,
  onTimeRangeChange,
  children,
}: OperationalOverviewProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titles}>
          <h1>Operational Overview</h1>
          <p className={styles.subtitle}>Executive snapshot and facility status</p>
        </div>
        <div className={styles.timeFilters} role="tablist" aria-label="Time range">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={timeRange === opt.value}
              className={[styles.timeBtn, timeRange === opt.value ? styles.timeBtnActive : ''].filter(Boolean).join(' ')}
              onClick={() => onTimeRangeChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>
      {children}
    </div>
  )
}
