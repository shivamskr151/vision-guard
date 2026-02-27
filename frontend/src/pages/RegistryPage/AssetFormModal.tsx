
import { useState, useEffect } from 'react'
import styles from './RegistryPage.module.css'
import type { RegistryAsset, SchemaLibraryItem, InspectionTemplateItem } from '@/types'

interface AssetFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (asset: Partial<RegistryAsset>) => void
    initialData?: RegistryAsset | null
    assetTypes: string[]
    zones: string[]

    schemas: SchemaLibraryItem[]
    templates: InspectionTemplateItem[]
}



function IconCheck() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    )
}

export function AssetFormModal({ isOpen, onClose, onSave, initialData, assetTypes, zones, schemas = [], templates = [] }: AssetFormModalProps) {
    const [formData, setFormData] = useState<Partial<RegistryAsset>>({
        assetId: '',
        name: '',
        type: '',
        zone: '',
        healthStatus: 'good',
        linkedCameras: 0,
        criticality: 5,
        criticalityMax: 10,
        customData: {},
        assignedTemplates: [],
        lastInspectionDate: '',
        inspectionFrequency: 30
    })

    const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null)
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([])

    // Load initial data
    useEffect(() => {
        if (initialData) {
            setFormData(initialData)
            // TODO: In a real app, we'd infer the schema from existing customData or metadata
            // For now, we assume editing might require re-selection or just manual override
            if (initialData.assignedTemplates) {
                setSelectedTemplateIds(initialData.assignedTemplates)
            }
        } else {
            setFormData({
                assetId: '', // Ideally auto-generated or user input
                name: '',
                type: assetTypes[0] || '',
                zone: zones[0] || '',
                healthStatus: 'good',
                linkedCameras: 0,
                criticality: 5,
                criticalityMax: 10,
                customData: {},
                lastInspectionDate: '',
                inspectionFrequency: 30
            })
            setSelectedSchemaId(null)
            setSelectedTemplateIds([])
        }
    }, [initialData, isOpen, assetTypes, zones])

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave({
            ...formData,
            assignedTemplates: selectedTemplateIds
        })
    }

    const selectedSchema = schemas.find(s => s.id === selectedSchemaId)

    // Helper to update custom field data
    const handleCustomFieldChange = (label: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            customData: {
                ...prev.customData,
                [label]: value
            }
        }))
    }

    const toggleTemplate = (id: string) => {
        setSelectedTemplateIds(prev =>
            prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
        )
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className={styles.modalHeader}>
                    <h2>{initialData ? 'Edit Asset' : 'Create New Asset'}</h2>
                    <button type="button" onClick={onClose} className={styles.closeBtn}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* SECTION 1: BASIC INFORMATION */}
                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>Basic Information</h3>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Asset Name <span className={styles.required}>*</span></label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="e.g., Primary Motor 1A"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Asset Type <span className={styles.required}>*</span></label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="" disabled>Select Type</option>
                                    {assetTypes.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Zone <span className={styles.required}>*</span></label>
                                <select
                                    value={formData.zone}
                                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                                >
                                    <option value="" disabled>Select Zone</option>
                                    {zones.map((z) => (
                                        <option key={z} value={z}>{z}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Criticality Score (1-10) <span className={styles.required}>*</span></label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={formData.criticality}
                                    onChange={(e) => setFormData({ ...formData, criticality: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Linked Cameras</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.linkedCameras}
                                    onChange={(e) => setFormData({ ...formData, linkedCameras: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Last Inspection Date</label>
                                <input
                                    type="date"
                                    value={formData.lastInspectionDate}
                                    onChange={(e) => setFormData({ ...formData, lastInspectionDate: e.target.value })}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Inspection Frequency (days)</label>
                                <input
                                    type="number"
                                    value={formData.inspectionFrequency}
                                    onChange={(e) => setFormData({ ...formData, inspectionFrequency: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: SELECT ASSET SCHEMA */}
                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>Select Asset Schema</h3>
                        <p className={styles.sectionDesc}>Choose a schema template to define custom fields for this asset type</p>

                        <div className={styles.schemaSelectionGrid}>
                            {schemas.map(schema => {
                                const isSelected = selectedSchemaId === schema.id
                                return (
                                    <div
                                        key={schema.id}
                                        className={`${styles.schemaSelectCard} ${isSelected ? styles.selected : ''}`}
                                        onClick={() => setSelectedSchemaId(schema.id)}
                                    >
                                        <div className={styles.schemaSelectHeader}>
                                            <h4>{schema.title}</h4>
                                            {isSelected && <div className={styles.checkBadge}><IconCheck /></div>}
                                        </div>
                                        <p>{schema.description}</p>
                                        <span className={styles.fieldCount}>{schema.fieldCount} custom fields</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* SECTION 3: CUSTOM FIELDS (DYNAMIC) */}
                    {selectedSchema && (
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionTitle}>Custom Fields for {selectedSchema.title}</h3>
                            <div className={styles.customFieldsGrid}>
                                {/* 
                                    Note: In a real app, 'schema.fields' would be available on the schema object. 
                                    Since we're using a simplified type locally, we might need to fetch full schema details 
                                    or assume 'fields' are attached if we updated the backend/type. 
                                    For now, let's mock the fields if they are missing from the type, 
                                    or rely on the fact that the backend returns them.
                                */}
                                {(selectedSchema as any).fields?.map((field: any) => (
                                    <div key={field.id} className={styles.formGroup}>
                                        <label>{field.label} {field.required && <span className={styles.required}>*</span>}</label>
                                        {field.type === 'Date' ? (
                                            <input
                                                type="date"
                                                onChange={(e) => handleCustomFieldChange(field.label, e.target.value)}
                                                value={formData.customData?.[field.label] || ''}
                                            />
                                        ) : field.type === 'Boolean' ? (
                                            <select
                                                onChange={(e) => handleCustomFieldChange(field.label, e.target.value === 'true')}
                                                value={String(formData.customData?.[field.label] || '')}
                                            >
                                                <option value="">Select...</option>
                                                <option value="true">Yes</option>
                                                <option value="false">No</option>
                                            </select>
                                        ) : field.type === 'Select' ? (
                                            <select
                                                onChange={(e) => handleCustomFieldChange(field.label, e.target.value)}
                                                value={formData.customData?.[field.label] || ''}
                                                required={field.required}
                                            >
                                                <option value="">Select {field.label}</option>
                                                {field.options?.map((opt: string) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                onChange={(e) => handleCustomFieldChange(field.label, e.target.value)}
                                                value={formData.customData?.[field.label] || ''}
                                            />
                                        )}
                                    </div>
                                ))}
                                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                    <label>Additional Notes</label>
                                    <textarea
                                        rows={3}
                                        onChange={(e) => handleCustomFieldChange('Additional Notes', e.target.value)}
                                        value={formData.customData?.['Additional Notes'] || ''}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 4: ASSIGN INSPECTION TEMPLATES */}
                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>Assign Inspection Templates</h3>
                        <p className={styles.sectionDesc}>Select one or more inspection templates for this asset</p>

                        <div className={styles.templateSelectionList}>
                            {templates.map(tmpl => {
                                const isSelected = selectedTemplateIds.includes(String(tmpl.id))
                                return (
                                    <div
                                        key={tmpl.id}
                                        className={`${styles.templateSelectRow} ${isSelected ? styles.selected : ''}`}
                                        onClick={() => toggleTemplate(String(tmpl.id))}
                                    >
                                        <div className={styles.templateSelectContent}>
                                            <h4>{tmpl.title}</h4>
                                            <p>{tmpl.description}</p>
                                            <div className={styles.templateMeta}>
                                                <span>{tmpl.questionCount} questions</span>
                                                <span>~{tmpl.durationMinutes} min</span>
                                                <span>Every {tmpl.frequencyDays} days</span>
                                            </div>
                                        </div>
                                        {isSelected && <div className={styles.checkBadge}><IconCheck /></div>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className={styles.formActions}>
                        <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                        <button type="submit" className={styles.submitBtn}>Create Asset</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
