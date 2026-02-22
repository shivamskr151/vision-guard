import type { CameraStream, AnomalyEvent, AnomalyEventSeverity } from '@/types'
import { useEffect, useRef } from 'react'
import styles from './CameraModal.module.css'

interface CameraModalProps {
    isOpen: boolean
    onClose: () => void
    camera: CameraStream | null
    events: AnomalyEvent[]
}

function IconCamera() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    )
}

function IconWarning() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    )
}

function IconClose() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    )
}

export function CameraModal({ isOpen, onClose, camera, events }: CameraModalProps) {
    const modalRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = ''
        }
    }, [isOpen, onClose])

    if (!isOpen || !camera) return null

    // Filter events related to this particular camera
    const cameraEvents = events.filter(e => e.camera === camera.name)
    // For UI representation of active anomaly
    const hasActiveAnomaly = camera.hasAnomaly || cameraEvents.length > 0
    const activeAnomalyCount = cameraEvents.length

    const getSeverityClass = (severity: AnomalyEventSeverity) => {
        switch (severity) {
            case 'critical': return styles.critical
            case 'high': return styles.high
            case 'medium': return styles.medium
            case 'low': return styles.low
            default: return ''
        }
    }

    // Placeholder image for video feed to match the UI visual style in the image
    // Transmission lines sunset image
    const feedImage = "https://images.unsplash.com/photo-1549216068-d65cbcd8fbc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"

    return (
        <div className={styles.modalOverlay} onClick={(e) => {
            // close on overlay click
            if (e.target === e.currentTarget) onClose()
        }}>
            <div className={styles.modalContent} ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="camera-modal-title">

                {/* Header */}
                <div className={styles.modalHeader}>
                    <div className={styles.headerLeft}>
                        <div className={styles.cameraIcon}>
                            <IconCamera />
                        </div>
                        <div className={styles.titleGroup}>
                            <h2 id="camera-modal-title" className={styles.title}>{camera.name}</h2>
                            <p className={styles.subtitle}>
                                {camera.model} • {camera.assetName}
                            </p>
                        </div>
                    </div>

                    <div className={styles.headerRight}>
                        {camera.isLive && (
                            <div className={styles.liveBadge}>
                                <span className={styles.liveDot} />
                                LIVE
                            </div>
                        )}
                        {hasActiveAnomaly && (
                            <div className={styles.anomalyBadge}>
                                <IconWarning />
                                {activeAnomalyCount > 0 ? `${activeAnomalyCount} Active Anomalies` : '1 Active Anomaly'}
                            </div>
                        )}
                        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
                            <IconClose />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className={styles.modalBody}>

                    {/* Main Video Feed Area */}
                    <div className={styles.videoSection}>
                        <img
                            src={feedImage}
                            alt={`Live feed from ${camera.name}`}
                            className={styles.videoFeed}
                        />
                    </div>

                    {/* Sidebar / Event Feed */}
                    <div className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>
                            <h3 className={styles.sidebarTitle}>Camera Event Feed</h3>
                        </div>
                        <div className={styles.eventFeed}>
                            {cameraEvents.length > 0 ? (
                                cameraEvents.map((evt) => (
                                    <div key={evt.id} className={styles.eventCard}>
                                        <img
                                            src={feedImage}
                                            alt="Event snapshot"
                                            className={styles.eventImage}
                                        />
                                        <div className={styles.eventContent}>
                                            <div className={styles.eventHeader}>
                                                <span className={`${styles.severityBadge} ${getSeverityClass(evt.severity)}`}>
                                                    {evt.severity}
                                                </span>
                                                <span className={styles.timeAgo}>{evt.timeAgo}</span>
                                            </div>
                                            <h4 className={styles.eventType}>{evt.type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</h4>
                                            <p className={styles.eventDesc}>{evt.description}</p>
                                            <div className={styles.confidenceRow}>
                                                <span className={styles.confidenceLabel}>Confidence:</span>
                                                <span className={styles.confidenceValue}>
                                                    {Math.round(evt.confidence * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.emptyState}>
                                    No recent events for this camera.
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
