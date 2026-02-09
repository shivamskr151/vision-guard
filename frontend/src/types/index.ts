/** Navigation and layout */

export interface NavSubItem {
  id: string
  label: string
  path: string
}

export interface NavItem {
  id: string
  label: string
  path: string
  icon: 'overview' | 'anomaly' | 'registry' | 'inspections'
  subItems?: NavSubItem[]
}

export interface SystemStatus {
  operational: boolean
  lastUpdated: string
}

/** Dashboard KPIs */

export type KPICardVariant =
  | 'assets'
  | 'due'
  | 'overdue'
  | 'anomalies'
  | 'compliance'
  | 'risk'

export interface KPICardData {
  id: string
  variant: KPICardVariant
  title: string
  value: string
  description: string
  trend?: {
    value: string
    positive: boolean
  }
}

/** Facility map */

export type AssetStatus = 'good' | 'warning' | 'critical'

export type MapFilterId = 'assetHealth' | 'inspectionDue' | 'anomalyHotspots'

export interface MapRegion {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
}

export interface MapMarker {
  id: string
  regionId?: string
  x: number
  y: number
  name: string
  type: 'camera' | 'asset'
  assetStatus?: AssetStatus
  inspectionDue?: boolean
  hasAnomaly?: boolean
  hasCamera?: boolean
}

export interface MapLegendItem {
  id: string
  label: string
  type: 'camera' | AssetStatus | 'inspectionDue'
}

/** Time range filter */

export type TimeRange = 'live' | 'today' | 'week'

/** Anomaly Detection page */

export interface AnomalyKpiCard {
  id: string
  title: string
  value: string
  variant: 'total' | 'critical' | 'affected' | 'cameras'
}

export interface CameraStream {
  id: string
  name: string
  hasAnomaly: boolean
  assetName?: string
  model?: string
  currentAnomaly?: string
  isLive?: boolean
}

export type AnomalyEventSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface AnomalyEvent {
  id: string | number
  severity: AnomalyEventSeverity
  type: string
  description: string
  asset: string
  confidence: number
  camera: string
  timestamp: string
  timeAgo: string
}

export interface AnomalyMapMarker {
  id: string
  regionId: string
  x: number
  y: number
  type: 'camera' | 'hotspot'
  /** For hotspots: 'camera' (default) or 'warning' (triangle with exclamation) */
  hotspotIcon?: 'camera' | 'warning'
}

/** Asset Registry page */

export type RegistryTabId = 'asset-list' | 'schema-builder' | 'inspection-templates'

export interface RegistryAsset {
  id: string
  assetId: string
  name: string
  type: string
  zone: string
  healthStatus: AssetStatus
  linkedCameras: number
  criticality: number
  criticalityMax: number
  customData?: Record<string, any>
  lastInspectionDate?: string
  inspectionFrequency?: number
  assignedTemplates?: string[] // IDs of assigned templates
}

export interface SchemaLibraryItem {
  id: string
  title: string
  description: string
  fieldCount: number
  tags: string[]
  created: string
  fields?: CustomFieldItem[] // Fields are now optionally included
}

export interface CustomFieldItem {
  id: string
  label: string
  type: string
  required: boolean
  options?: string[]
}

export interface InspectionTemplateItem {
  id: string
  title: string
  description: string
  questionCount: number
  durationMinutes: number
  tags: string[]
  frequencyDays: number
  mandatoryChecks: number
  mandatoryTotal: number
  created: string
}

export interface InspectionChecklistItem {
  id: string
  text: string
  mandatory: boolean
  passFailCondition: boolean
}

/** Inspections Overview page */

export interface InspectionKpiCard {
  id: string
  title: string
  value: string
  subtitle: string
  variant: 'due' | 'overdue' | 'completed' | 'duration' | 'sla'
}

export interface InspectionDueTimelinePoint {
  date: string
  label: string
  count: number
}

export interface ZoneCoverageItem {
  zone: string
  percentage: number
}

export interface ComplianceTrendPoint {
  month: string
  value: number
}

export interface AssetTypeDistributionItem {
  type: string
  percentage: number
  color: string
}

export interface UpcomingInspectionRow {
  id: string
  assetName: string
  type: string
  zone: string
  dueDate: string
  daysUntilDue: string
  status: 'overdue' | 'urgent' | 'due'
}

export interface InspectionMapZone {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
}

export interface InspectionMapPoint {
  id: string
  regionId: string
  x: number
  y: number
  type: 'camera' | 'inspectionDue'
}

/** Inspection Reports page */

export interface InspectionReportRow {
  id: string
  assetName: string
  inspectionDate: string
  inspectionType: string
  status: 'pass' | 'fail' | 'partial'
  defects: number
  inspector: string
  duration: string
}
