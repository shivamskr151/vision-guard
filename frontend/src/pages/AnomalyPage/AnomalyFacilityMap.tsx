import type { MapRegion, AnomalyMapMarker } from '@/types'
import styles from './AnomalyFacilityMap.module.css'

function IconCamera({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function IconWarning({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

interface AnomalyFacilityMapProps {
  regions: MapRegion[]
  markers: AnomalyMapMarker[]
}

export function AnomalyFacilityMap({ regions, markers }: AnomalyFacilityMapProps) {
  return (
    <div className={styles.mapContainer}>
      <div className={styles.mapGrid} aria-hidden />
      <div className={styles.regions}>
        {regions.map((region) => (
          <div
            key={region.id}
            className={styles.region}
            style={{
              left: `${region.x}%`,
              top: `${region.y}%`,
              width: `${region.width}%`,
              height: `${region.height}%`,
            }}
            role="img"
            aria-label={`Region: ${region.label}`}
          >
            <span className={styles.regionLabel}>{region.label}</span>
          </div>
        ))}
      </div>
      <div className={styles.markers}>
        {markers.map((marker) => (
          <div
            key={marker.id}
            className={styles.marker}
            style={{
              left: `${marker.x}%`,
              top: `${marker.y}%`,
            }}
            role="img"
            aria-label={marker.type === 'camera' ? 'Active camera' : 'Anomaly hotspot'}
          >
            {marker.type === 'camera' ? (
              <span className={styles.markerCamera}>
                <span className={styles.markerCameraInner} aria-hidden />
                <IconCamera size={14} />
              </span>
            ) : (
              <div className={styles.markerHotspotWrap}>
                <span className={styles.markerHotspotPulse} aria-hidden />
                <span className={styles.markerHotspotPulse2} aria-hidden />
                {marker.hotspotIcon === 'warning' ? (
                  <span className={styles.markerHotspotWarning}>
                    <IconWarning size={14} />
                  </span>
                ) : (
                  <span className={styles.markerHotspot}>
                    <IconCamera size={12} />
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className={styles.legend} role="list" aria-label="Map legend">
        <div className={styles.legendTitle}>Map Legend</div>
        <div className={styles.legendItems}>
          <div className={styles.legendItem} role="listitem">
            <span className={styles.legendIconCamera} aria-hidden>
              <span className={styles.legendIconCameraDot} />
              <IconCamera size={12} />
            </span>
            Active Camera
          </div>
          <div className={styles.legendItem} role="listitem">
            <span className={styles.legendIconHotspot} aria-hidden>
              <IconCamera size={10} />
            </span>
            Anomaly Camera
          </div>
        </div>
      </div>
    </div>
  )
}
