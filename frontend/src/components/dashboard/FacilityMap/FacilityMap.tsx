import { useState } from 'react'
import { IconCamera } from '@/components/ui/Icons'
import type { MapRegion, MapMarker, MapLegendItem, MapFilterId } from '@/types'
import styles from './FacilityMap.module.css'

interface FacilityMapProps {
  regions: MapRegion[]
  markers: MapMarker[]
  legendItems: MapLegendItem[]
  filterOptions: readonly { id: MapFilterId; label: string }[]
}

export function FacilityMap({
  regions,
  markers,
  legendItems,
  filterOptions,
}: FacilityMapProps) {
  const [activeFilters, setActiveFilters] = useState<Set<MapFilterId>>(
    () => new Set(filterOptions.map((f) => f.id))
  )

  const toggleFilter = (id: MapFilterId) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className={styles.section} aria-labelledby="facility-map-title">
      <div className={styles.header}>
        <div>
          <h2 id="facility-map-title" className={styles.title}>
            Facility Map
          </h2>
          <p className={styles.subtitle}>
            Real-time spatial overview of assets and cameras
          </p>
        </div>
        <div className={styles.filters} role="group" aria-label="Map filters">
          {filterOptions.map((opt) => (
            <label key={opt.id} className={styles.checkbox}>
              <input
                type="checkbox"
                checked={activeFilters.has(opt.id)}
                onChange={() => toggleFilter(opt.id)}
                aria-label={opt.label}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

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
              aria-label={getMarkerAriaLabel(marker)}
            >
              {/* Anomaly Hotspot Layer */}
              {activeFilters.has('anomalyHotspots') && marker.hasAnomaly && (
                <div className={styles.anomalyHotspot} />
              )}

              {/* Asset Health Layer */}
              {activeFilters.has('assetHealth') && marker.assetStatus && (
                <span
                  className={[
                    styles.markerAsset,
                    styles[`marker${marker.assetStatus.charAt(0).toUpperCase()}${marker.assetStatus.slice(1)}`],
                  ].join(' ')}
                />
              )}

              {/* Inspection Due Layer */}
              {activeFilters.has('inspectionDue') && marker.inspectionDue && (
                <span className={styles.markerInspectionDue} />
              )}

              {/* Camera Icon Layer */}
              {marker.hasCamera && (
                <span className={styles.markerCamera}>
                  <IconCamera size={12} />
                </span>
              )}

              {/* Asset Label */}
              <span className={styles.markerLabel}>{marker.name}</span>
            </div>
          ))}
        </div>
        <div className={styles.legend} role="list" aria-label="Map legend">
          {legendItems.map((item) => (
            <div key={item.id} className={styles.legendItem} role="listitem">
              <span
                className={[
                  styles.legendIcon,
                  item.type === 'camera'
                    ? styles.legendIconCamera
                    : item.type === 'good'
                      ? styles.legendIconGood
                      : item.type === 'warning'
                        ? styles.legendIconWarning
                        : item.type === 'critical'
                          ? styles.legendIconCritical
                          : styles.legendIconInspection,
                ].join(' ')}
                aria-hidden
              >
                {item.type === 'camera' && <IconCamera size={12} />}
              </span>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function getMarkerAriaLabel(marker: MapMarker): string {
  if (marker.type === 'camera') return 'Active camera'
  if (marker.inspectionDue) return 'Inspection due'
  if (marker.assetStatus) return `Asset: ${marker.assetStatus}`
  return 'Asset'
}
