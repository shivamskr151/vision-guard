import type { NavItem } from '@/types'

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', path: '/', icon: 'overview' },
  { id: 'anomaly', label: 'Anomaly Detection', path: '/anomaly', icon: 'anomaly' },
  { id: 'registry', label: 'Asset Registry', path: '/registry', icon: 'registry' },
  {
    id: 'inspections',
    label: 'Asset Inspections',
    path: '/inspections',
    icon: 'inspections',
    subItems: [
      { id: 'inspections-overview', label: 'Overview', path: '/inspections' },
      { id: 'inspections-reports', label: 'Reports', path: '/inspections/reports' },
    ],
  },
]

export const PLATFORM_TITLE = 'Vision-Based Asset Intelligence Platform'
