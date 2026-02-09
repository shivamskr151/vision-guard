import { KPICard } from '@/components/dashboard/KPICard/KPICard'
import type { KPICardData } from '@/types'
import styles from './DashboardOverview.module.css'

interface DashboardOverviewProps {
  cards: KPICardData[]
}

export function DashboardOverview({ cards }: DashboardOverviewProps) {
  return (
    <section className={styles.section} aria-labelledby="dashboard-overview-title">
      <h2 id="dashboard-overview-title" className={styles.title}>
        Dashboard Overview
      </h2>
      <div className={styles.grid} role="list">
        {cards.map((card) => (
          <div key={card.id} role="listitem">
            <KPICard
              id={card.id}
              variant={card.variant}
              title={card.title}
              value={card.value}
              description={card.description}
              trend={card.trend}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
