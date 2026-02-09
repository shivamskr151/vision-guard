import { apiGet } from './client'
import type { KPICardData, MapRegion, MapMarker, MapLegendItem } from '@/types'

export async function getDashboardKpis(): Promise<KPICardData[]> {
  return apiGet<KPICardData[]>('dashboard/kpis')
}

export async function getDashboardMapRegions(): Promise<MapRegion[]> {
  return apiGet<MapRegion[]>('dashboard/map/regions')
}

export async function getDashboardMapMarkers(): Promise<MapMarker[]> {
  return apiGet<MapMarker[]>('dashboard/map/markers')
}

export async function getDashboardMapLegend(): Promise<MapLegendItem[]> {
  return apiGet<MapLegendItem[]>('dashboard/map/legend')
}
