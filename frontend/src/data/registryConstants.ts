import type { RegistryTabId, CustomFieldItem, InspectionChecklistItem } from '@/types'

export const REGISTRY_TABS: { id: RegistryTabId; label: string }[] = [
    { id: 'asset-list', label: 'Asset List' },
    { id: 'schema-builder', label: 'Schema Builder' },
    { id: 'inspection-templates', label: 'Inspection Templates' },
]

export const CUSTOM_FIELDS_INITIAL: CustomFieldItem[] = []
export const INSPECTION_CHECKLIST_INITIAL: InspectionChecklistItem[] = []
