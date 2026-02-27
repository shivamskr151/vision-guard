import { useState, useCallback } from 'react'
import { AnomalyFilters } from './AnomalyFilters'
import { AnomalyDashboardOverview } from './AnomalyDashboardOverview'
import { LiveCameraStreams } from './LiveCameraStreams'
import { AnomalyEventFeed } from './AnomalyEventFeed'
import { AnomalyFacilityMap } from './AnomalyFacilityMap'
import styles from './AnomalyPage.module.css'
import { useAnomalyData } from '@/hooks/useAnomalyData'

function IconWarning() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function AnomalyPage() {
  const [filters, setFilters] = useState({
    severity: '',
    type: '',
    asset: '',
    camera: '',
    status: '',
  })

  // Pass filters to hook for server-side aggregation
  const { kpiCards, events, mapMarkers, mapRegions, cameraStreams, filterOptions, loading, error } = useAnomalyData(filters)
  // Filter Logic
  const filteredEvents = events.filter(e => {
    if (filters.severity && e.severity !== filters.severity) return false
    if (filters.type && e.type !== filters.type) return false
    if (filters.asset && e.asset !== filters.asset) return false
    if (filters.camera && e.camera !== filters.camera) return false
    return true
  })

  // Dynamic KPI Calculation - REMOVED
  // We now trust the backend to provide accurate aggregate stats via getStats()
  // The 'kpiCards' from useAnomalyData are already populated with these server-side values.

  // Filter Cameras
  const filteredCameras = cameraStreams.filter(c => {
    if (filters.camera && c.name !== filters.camera) return false
    if (filters.asset && c.assetName !== filters.asset) return false
    // If filtering by severity/type, we could restrict to cameras with those anomalies,
    // but often users want to see the feed regardless.
    // Let's refine: If specific event filters (severity/type) are active, 
    // maybe we implicitly prioritize cameras involved in those events?
    // For now, simple asset/camera filtering is safest and most predictable.
    return true
  })

  // Derived counts
  const activeEventsCount = kpiCards.find(c => c.id === 'total')?.value || '0'
  const liveCamerasCount = filteredCameras.filter(c => c.isLive).length

  // Filter map markers to only show those related to filtered events (or all cameras if no event filter)
  const filteredMapMarkers = mapMarkers.filter(m => {
    if (m.type === 'camera') {
      // Only show cameras that match the camera filter
      if (filters.camera) return m.id === `cam-${filters.camera}` // Assuming ID convention or map marker structure
      // Actually, we don't have easy link from map marker to camera name except ID?
      // Let's leave map markers logic as is for now, or refine if needed.
      return true
    }
    // It's a hotspot/anomaly marker. ID is `am-{id}`
    const eventId = m.id.replace('am-', '')
    // Check if this event ID is in our filtered events (need to handle string/number mismatch if any)
    return filteredEvents.some(e => e.id.toString() == eventId)
  })

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  if (loading) return <div className="p-8 text-center">Loading anomaly data...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderTop}>
          <div>
            <h1 className={styles.pageTitle}>Anomaly Detection</h1>
            <p className={styles.pageSubtitle}>Real-time vision-based defect monitoring</p>
          </div>
          <div className={styles.statusRow}>
            <div className={[styles.statusItem, styles.statusItemLive].join(' ')}>
              <span className={styles.statusDotGreen} aria-hidden />
              <span>{liveCamerasCount} Cameras Live</span>
            </div>
            <div className={[styles.statusItem, styles.statusItemEvents].join(' ')}>
              <span className={styles.statusIconRed} aria-hidden>
                <IconWarning />
              </span>
              <span>{activeEventsCount} Active Events</span>
            </div>
            <div className={styles.statusItem}>
              <span style={{ fontSize: '12px', color: '#666' }}>
                (Displaying {filteredEvents.length} of {activeEventsCount})
              </span>
            </div>
          </div>
        </div>
        <AnomalyFilters events={events} filters={filters} onFilterChange={handleFilterChange} filterOptions={filterOptions} />
      </header>

      <section className={styles.section} aria-labelledby="anomaly-dashboard-title">
        <h2 id="anomaly-dashboard-title" className={styles.sectionTitle}>
          Dashboard Overview
        </h2>
        <AnomalyDashboardOverview cards={kpiCards} />
      </section>

      <section className={styles.section} aria-labelledby="cameras-title">
        <div className={styles.twoCol}>
          <div>
            <h2 id="cameras-title" className={styles.sectionTitle}>
              Live Camera Streams
            </h2>
            <p className={styles.sectionSubtitle}>
              Click any camera to expand view
            </p>
            <div className={styles.cameraStreamsScroll} aria-label="Live camera streams list">
              <LiveCameraStreams cameras={filteredCameras} events={events} />
            </div>
          </div>
          <div>
            <h2 id="events-title" className={styles.sectionTitle}>
              Anomaly Event Feed
            </h2>
            <div className={styles.eventFeedScroll} aria-label="Anomaly event feed">
              <AnomalyEventFeed events={filteredEvents} />
            </div>
          </div>
        </div>
      </section>

      <section className={[styles.section, styles.sectionLast].join(' ')} aria-labelledby="anomaly-map-title">
        <h2 id="anomaly-map-title" className={styles.sectionTitle}>
          Facility Map
        </h2>
        <p className={styles.sectionSubtitle}>
          Real-time anomaly hotspot visualization
        </p>
        <AnomalyFacilityMap regions={mapRegions} markers={filteredMapMarkers} />
      </section>
    </div>
  )
}
