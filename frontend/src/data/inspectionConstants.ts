import type { InspectionReportRow } from '@/types'

export const INSPECTION_REPORTS: InspectionReportRow[] = [
  {
    id: '1',
    assetName: 'Primary Motor 1A',
    inspectionDate: '20/01/2026',
    inspectionType: 'Routine',
    status: 'pass',
    defects: 0,
    inspector: 'Vision System Alpha',
    duration: '25 min',
  },
  {
    id: '2',
    assetName: 'Cooling Pump CP-7',
    inspectionDate: '15/01/2026',
    inspectionType: 'Routine',
    status: 'fail',
    defects: 2,
    inspector: 'Vision System Beta',
    duration: '35 min',
  },
  {
    id: '3',
    assetName: 'Storage Tank T-101',
    inspectionDate: '18/01/2026',
    inspectionType: 'Compliance',
    status: 'pass',
    defects: 0,
    inspector: 'Vision System Gamma',
    duration: '45 min',
  },
  {
    id: '4',
    assetName: 'Heat Exchanger HX-12',
    inspectionDate: '19/01/2026',
    inspectionType: 'Vision-Automated',
    status: 'pass',
    defects: 0,
    inspector: 'Vision System Delta',
    duration: '30 min',
  },
  {
    id: '5',
    assetName: 'Control Valve V-23',
    inspectionDate: '22/01/2026',
    inspectionType: 'Routine',
    status: 'partial',
    defects: 1,
    inspector: 'Vision System Alpha',
    duration: '28 min',
  },
]

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'partial', label: 'Partial' },
]
