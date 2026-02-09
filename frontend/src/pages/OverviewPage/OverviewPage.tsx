import { useState, useCallback } from 'react'
import { OperationalOverview } from '@/components/dashboard/OperationalOverview/OperationalOverview'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview/DashboardOverview'
import { FacilityMap } from '@/components/dashboard/FacilityMap/FacilityMap'
import type { TimeRange } from '@/types'
import { useDashboardData } from '@/hooks/useDashboardData'


export function OverviewPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('live')
  const { kpiCards, mapMarkers, mapRegions, mapFilters, mapLegend, loading, error } = useDashboardData()

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range)
  }, [])

  if (loading) return <div className="p-8 text-center">Loading dashboard data...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>

  return (
    <OperationalOverview
      timeRange={timeRange}
      onTimeRangeChange={handleTimeRangeChange}
    >
      <DashboardOverview cards={kpiCards} />
      <FacilityMap
        regions={mapRegions}
        markers={mapMarkers}
        legendItems={mapLegend}
        filterOptions={mapFilters}
      />

    </OperationalOverview>
  )
}
