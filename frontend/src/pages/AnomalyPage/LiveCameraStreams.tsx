import type { CameraStream } from '@/types'
import styles from './LiveCameraStreams.module.css'

function IconCamera() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function IconPause() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

function IconExpand() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  )
}

export function LiveCameraStreams({ cameras }: { cameras: CameraStream[] }) {
  return (
    <div className={styles.grid} role="list">
      {cameras.map((cam) => (
        <article key={cam.id} className={styles.card} role="listitem">
          <div className={styles.cardHeader}>
            <span className={styles.cardHeaderIcon} aria-hidden>
              <IconCamera />
            </span>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cam.name}
            </span>
            <div className={styles.cardHeaderActions}>
              <button type="button" aria-label="Pause">
                <IconPause />
              </button>
              <button type="button" aria-label="Expand">
                <IconExpand />
              </button>
            </div>
          </div>
          <div className={styles.preview}>
            {!cam.isLive && <span>No signal</span>}
            {cam.hasAnomaly && (
              <>
                <span className={styles.anomalyBanner}>ANOMALY DETECTED</span>
                {cam.currentAnomaly && (
                  <span className={styles.anomalyTypeBadge}>{cam.currentAnomaly}</span>
                )}
              </>
            )}
            {cam.isLive && (
              <span className={styles.liveBadge}>
                <span className={styles.liveDot} aria-hidden />
                LIVE
              </span>
            )}
          </div>
          {(cam.assetName ?? cam.model ?? cam.currentAnomaly) && (
            <div className={styles.cardFooter}>
              {cam.assetName && (
                <div className={styles.cardFooterRow}>
                  <span className={styles.cardFooterLabel}>Linked Asset: </span>
                  {cam.assetName}
                </div>
              )}
              {cam.model && (
                <div className={styles.cardFooterRow}>
                  <span className={styles.cardFooterLabel}>Model: </span>
                  {cam.model}
                </div>
              )}
              {cam.currentAnomaly && (
                <div className={styles.cardFooterRow}>
                  <span className={styles.cardFooterLabel}>Current Anomaly: </span>
                  {cam.currentAnomaly}
                </div>
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  )
}
