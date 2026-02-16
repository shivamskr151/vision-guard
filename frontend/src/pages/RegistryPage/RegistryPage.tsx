import { useState, useEffect } from 'react'
import type { RegistryTabId, RegistryAsset, AssetStatus, SchemaLibraryItem, CustomFieldItem, InspectionTemplateItem, InspectionChecklistItem } from '@/types'
import { REGISTRY_TABS, CUSTOM_FIELDS_INITIAL, INSPECTION_CHECKLIST_INITIAL } from '@/data/registryConstants'
import styles from './RegistryPage.module.css'
import { AssetFormModal } from './AssetFormModal'
import { config } from '@/config'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'

const healthClass = {
  good: styles.healthGood,
  warning: styles.healthWarning,
  critical: styles.healthCritical,
} as Record<AssetStatus, string>

const healthLabel: Record<AssetStatus, string> = {
  good: 'Good',
  warning: 'Warning',
  critical: 'Critical',
}

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconLocation() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function IconCamera() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function IconDelete() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function IconSchema() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="2" width="14" height="18" rx="1.5" fill="currentColor" opacity="0.4" />
      <rect x="6" y="4" width="14" height="18" rx="1.5" fill="currentColor" opacity="0.65" />
      <rect x="8" y="6" width="14" height="18" rx="1.5" fill="currentColor" />
    </svg>
  )
}

function IconTemplate() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M14 2v6h6" fill="currentColor" fillOpacity="0.7" stroke="none" />
      <rect x="7" y="11" width="10" height="1.5" rx="0.5" fill="currentColor" fillOpacity="0.35" stroke="none" />
      <rect x="7" y="14.5" width="10" height="1.5" rx="0.5" fill="currentColor" fillOpacity="0.35" stroke="none" />
      <rect x="7" y="18" width="6" height="1.5" rx="0.5" fill="currentColor" fillOpacity="0.35" stroke="none" />
    </svg>
  )
}

function SchemaLibrarySection({ schemas }: { schemas: SchemaLibraryItem[] }) {
  return (
    <section className={styles.schemaSection} aria-labelledby="schema-library-title">
      <div>
        <h2 id="schema-library-title" className={styles.schemaSectionTitle}>
          Schema Library
        </h2>
        <p className={styles.schemaSectionDesc}>
          Available schemas for different asset types. Select a schema when creating a new asset.
        </p>
      </div>
      <div className={styles.schemaGrid} role="list">
        {schemas.map((schema) => (
          <article key={schema.id} className={styles.schemaCard} role="listitem">
            <div className={styles.schemaCardTop}>
              <span className={styles.schemaCardIcon} aria-hidden>
                <IconSchema />
              </span>
              <h3 className={styles.schemaCardTitle}>{schema.title}</h3>
              <span className={styles.schemaCardFields}>{schema.fieldCount} fields</span>
            </div>
            <p className={styles.schemaCardDesc}>{schema.description}</p>
            <div className={styles.schemaCardTags}>
              {schema.tags.map((tag) => (
                <span key={tag} className={styles.schemaTag}>
                  {tag}
                </span>
              ))}
            </div>
            <div className={styles.schemaCardFooter}>
              <p className={styles.schemaCardCreated}>Created: {schema.created}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

const FIELD_TYPES = ['Text', 'Number', 'Date', 'Boolean'] as const

function CustomFieldSchemaSection({
  fields,
  onFieldsChange,
}: {
  fields: CustomFieldItem[]
  onFieldsChange: (fields: CustomFieldItem[]) => void
}) {
  const updateField = (id: string, updates: Partial<CustomFieldItem>) => {
    onFieldsChange(
      fields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    )
  }

  const removeField = (id: string) => {
    onFieldsChange(fields.filter((f) => f.id !== id))
  }

  const addField = () => {
    onFieldsChange([
      ...fields,
      {
        id: String(Date.now()),
        label: '',
        type: 'Text',
        required: false,
      },
    ])
  }

  const handleSaveSchema = () => {
    fetch(`${config.API_URL}/assets/schemas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Schema', // TODO: Add title input to UI
        description: 'Custom schema',
        fieldCount: fields.length,
        tags: [],
        created: new Date().toLocaleDateString(),
        fields: {
          create: fields.map(f => ({
            label: f.label,
            type: f.type,
            required: f.required
          }))
        }
      })
    })
      .then(res => res.json())
      .then(() => {
        alert('Schema saved!')
        onFieldsChange([]) // Reset
      })
      .catch(console.error)
  }

  return (
    <section className={styles.schemaSection} aria-labelledby="custom-field-title">
      <div className={styles.schemaSectionHeader}>
        <div>
          <h2 id="custom-field-title" className={styles.schemaSectionTitle}>
            Custom Field Schema
          </h2>
        </div>
        <button type="button" className={styles.addFieldBtn} onClick={addField}>
          <IconPlus />
          Add Field
        </button>
      </div>
      <div className={styles.customFieldsList}>
        {fields.map((field) => (
          <div key={field.id} className={styles.customFieldRow}>
            <input
              type="text"
              className={styles.customFieldInput}
              value={field.label}
              onChange={(e) => updateField(field.id, { label: e.target.value })}
              placeholder="Field name"
              aria-label="Field name"
            />
            <select
              className={styles.customFieldSelect}
              value={field.type}
              onChange={(e) => updateField(field.id, { type: e.target.value })}
              aria-label="Field type"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label className={styles.customFieldRequired}>
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(field.id, { required: e.target.checked })}
                aria-label="Required"
              />
              Required
            </label>
            <button
              type="button"
              className={styles.customFieldDelete}
              onClick={() => removeField(field.id)}
              aria-label={`Remove ${field.label || 'field'}`}
            >
              <IconDelete />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className={styles.saveSchemaBtn} onClick={handleSaveSchema}>
        Save Schema
      </button>
    </section>
  )
}

function InspectionTemplateLibrarySection({ templates }: { templates: InspectionTemplateItem[] }) {
  return (
    <section className={styles.templateSection} aria-labelledby="template-library-title">
      <h2 id="template-library-title" className={styles.templateSectionTitle}>
        Inspection Template Library
      </h2>
      <p className={styles.templateSectionDesc}>
        Available inspection templates for different asset types. Assign templates when creating a new asset.
      </p>
      <div className={styles.templateGrid} role="list">
        {templates.map((t) => (
          <article key={t.id} className={styles.templateCard} role="listitem">
            <div className={styles.templateCardTop}>
              <span className={styles.templateCardIcon} aria-hidden>
                <IconTemplate />
              </span>
              <h3 className={styles.templateCardTitle}>{t.title}</h3>
              <span className={styles.templateCardMeta}>
                {t.questionCount} questions • ~{t.durationMinutes} min
              </span>
            </div>
            <p className={styles.templateCardDesc}>{t.description}</p>
            <div className={styles.templateCardTags}>
              {t.tags.map((tag) => (
                <span key={tag} className={styles.templateTag}>
                  {tag}
                </span>
              ))}
            </div>
            <dl className={styles.templateCardDetails}>
              <dt>Frequency:</dt>
              <dd>{t.frequencyDays === 0 ? 'On demand' : `Every ${t.frequencyDays} days`}</dd>
              <dt>Mandatory Checks:</dt>
              <dd>{t.mandatoryChecks}/{t.mandatoryTotal}</dd>
              <dt>Created:</dt>
              <dd>{t.created}</dd>
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}

function InspectionTemplateConfigSection({
  frequency,
  duration,
  checklist,
  onFrequencyChange,
  onDurationChange,
  onChecklistChange,
}: {
  frequency: number
  duration: number
  checklist: InspectionChecklistItem[]
  onFrequencyChange: (v: number) => void
  onDurationChange: (v: number) => void
  onChecklistChange: (items: InspectionChecklistItem[]) => void
}) {
  const updateItem = (id: string, updates: Partial<InspectionChecklistItem>) => {
    onChecklistChange(
      checklist.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  const removeItem = (id: string) => {
    onChecklistChange(checklist.filter((item) => item.id !== id))
  }

  const addQuestion = () => {
    onChecklistChange([
      ...checklist,
      { id: String(Date.now()), text: '', mandatory: false, passFailCondition: false },
    ])
  }

  const handleSaveTemplate = () => {
    fetch(`${config.API_URL}/assets/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Template', // TODO: Add title input
        description: 'Created via Registry',
        questionCount: checklist.length,
        durationMinutes: duration,
        tags: [],
        frequencyDays: frequency,
        mandatoryChecks: checklist.filter(i => i.mandatory).length,
        mandatoryTotal: checklist.length,
        created: new Date().toLocaleDateString(),
        checklist: {
          create: checklist.map(i => ({
            text: i.text,
            mandatory: i.mandatory,
            passFailCondition: i.passFailCondition
          }))
        }
      })
    })
      .then(res => res.json())
      .then(() => {
        alert('Template saved!')
        onChecklistChange([])
      })
      .catch(console.error)
  }

  return (
    <section className={styles.templateSection} aria-labelledby="template-config-title">
      <h2 id="template-config-title" className={styles.templateSectionTitle}>
        Inspection Template Configuration
      </h2>
      <div className={styles.configSection}>
        <div className={styles.configRow}>
          <div className={styles.configField}>
            <label className={styles.configLabel} htmlFor="inspection-frequency">
              Inspection Frequency (days)
            </label>
            <input
              id="inspection-frequency"
              type="number"
              className={styles.configInput}
              value={frequency}
              onChange={(e) => onFrequencyChange(Number(e.target.value) || 0)}
              min={0}
              aria-label="Inspection frequency in days"
            />
          </div>
          <div className={styles.configField}>
            <label className={styles.configLabel} htmlFor="expected-duration">
              Expected Duration (minutes)
            </label>
            <input
              id="expected-duration"
              type="number"
              className={styles.configInput}
              value={duration}
              onChange={(e) => onDurationChange(Number(e.target.value) || 0)}
              min={0}
              aria-label="Expected duration in minutes"
            />
          </div>
        </div>
        <div>
          <h3 className={styles.checklistTitle}>Inspection Checklist</h3>
          <div className={styles.checklistList}>
            {checklist.map((item) => (
              <div key={item.id} className={styles.checklistRow}>
                <input
                  type="text"
                  className={styles.checklistInput}
                  value={item.text}
                  onChange={(e) => updateItem(item.id, { text: e.target.value })}
                  placeholder="Question or check item"
                  aria-label="Checklist item"
                />
                <div className={styles.checklistCheckboxes}>
                  <label className={styles.checklistCheckbox}>
                    <input
                      type="checkbox"
                      checked={item.mandatory}
                      onChange={(e) => updateItem(item.id, { mandatory: e.target.checked })}
                      aria-label="Mandatory"
                    />
                    Mandatory
                  </label>
                  <label className={styles.checklistCheckbox}>
                    <input
                      type="checkbox"
                      checked={item.passFailCondition}
                      onChange={(e) => updateItem(item.id, { passFailCondition: e.target.checked })}
                      aria-label="Pass/Fail Condition"
                    />
                    Pass/Fail Condition
                  </label>
                </div>
                <button
                  type="button"
                  className={styles.checklistDelete}
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.text || 'item'}`}
                >
                  <IconDelete />
                </button>
              </div>
            ))}
          </div>
          <div className={styles.addQuestionWrap}>
            <button type="button" className={styles.addQuestionBtn} onClick={addQuestion}>
              <IconPlus />
              Add Question
            </button>
          </div>
        </div>
        <div className={styles.saveTemplateWrap}>
          <button type="button" className={styles.saveTemplateBtn} onClick={handleSaveTemplate}>
            Save Template
          </button>
        </div>
      </div>
    </section>
  )
}

function AssetListTable({ assets, onEdit, onDelete }: { assets: RegistryAsset[], onEdit: (asset: RegistryAsset) => void, onDelete: (id: string | number) => void }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Asset ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>
              <span className={styles.thIcon} aria-hidden><IconLocation /></span>
              Zone
            </th>
            <th>Health Status</th>
            <th>
              <span className={styles.thIcon} aria-hidden><IconCamera /></span>
              Linked Cameras
            </th>
            <th>Criticality</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id}>
              <td className={styles.assetId}>{asset.assetId}</td>
              <td className={styles.name}>{asset.name}</td>
              <td>{asset.type}</td>
              <td>
                <span className={styles.zoneCell}>
                  <span className={styles.zoneIcon} aria-hidden>
                    <IconLocation />
                  </span>
                  {asset.zone}
                </span>
              </td>
              <td>
                <span className={[styles.healthBadge, healthClass[asset.healthStatus]].join(' ')}>
                  {healthLabel[asset.healthStatus]}
                </span>
              </td>
              <td>
                <span className={styles.camerasCell}>
                  <span className={styles.cameraIcon} aria-hidden>
                    <IconCamera />
                  </span>
                  {asset.linkedCameras}
                </span>
              </td>
              <td>
                <div className={styles.criticalityCell}>
                  <div className={styles.criticalityBar}>
                    <div
                      className={styles.criticalityFill}
                      style={{ width: `${(asset.criticality / asset.criticalityMax) * 100}%` }}
                      role="progressbar"
                      aria-valuenow={asset.criticality}
                      aria-valuemin={0}
                      aria-valuemax={asset.criticalityMax}
                    />
                  </div>
                  <span className={styles.criticalityScore}>
                    {asset.criticality}/{asset.criticalityMax}
                  </span>
                </div>
              </td>
              <td>
                <div className={styles.actionsCell}>
                  <button type="button" className={styles.actionBtn} onClick={() => onEdit(asset)} aria-label={`Edit ${asset.name}`}>
                    <IconEdit />
                  </button>
                  <button type="button" className={styles.actionBtn} onClick={() => onDelete(asset.id)} aria-label={`Delete ${asset.name}`}>
                    <IconDelete />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function RegistryPage() {
  const [activeTab, setActiveTab] = useState<RegistryTabId>('asset-list')
  const [customFields, setCustomFields] = useState<CustomFieldItem[]>(CUSTOM_FIELDS_INITIAL)
  const [inspectionFrequency, setInspectionFrequency] = useState(30)
  const [inspectionDuration, setInspectionDuration] = useState(30)
  const [inspectionChecklist, setInspectionChecklist] = useState<InspectionChecklistItem[]>(INSPECTION_CHECKLIST_INITIAL)
  const [schemas, setSchemas] = useState<SchemaLibraryItem[]>([])
  const [templates, setTemplates] = useState<InspectionTemplateItem[]>([])

  const {
    data: assets,
    loading,
    currentPage,
    totalPages,
    goToPage: setCurrentPage,
    refresh: fetchAssets
  } = usePagination<RegistryAsset>(`${config.API_URL}/assets`, { limit: 10 });

  // Config State
  const [assetTypes, setAssetTypes] = useState<string[]>([])
  const [zones, setZones] = useState<string[]>([])
  const [, setHealthStatuses] = useState<AssetStatus[]>([])

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<RegistryAsset | null>(null)



  useEffect(() => {
    // Fetch system config on mount
    fetch(`${config.API_URL}/assets/config`)
      .then(res => res.json())
      .then(data => {
        setAssetTypes(data.assetTypes || [])
        setZones(data.zones || [])
        setHealthStatuses(data.healthStatuses || [])
      })
      .catch(console.error)

    // Pre-fetch Schemas and Templates for the "Create Asset" modal
    fetch(`${config.API_URL}/assets/schemas`).then(res => res.json()).then(setSchemas).catch(console.error)
    fetch(`${config.API_URL}/assets/templates`).then(res => res.json()).then(setTemplates).catch(console.error)
  }, [])

  useEffect(() => {
    if (activeTab === 'asset-list') {
      fetchAssets()
    } else if (activeTab === 'schema-builder') {
      fetch(`${config.API_URL}/assets/schemas`)
        .then(res => res.json())
        .then(setSchemas)
        .catch(console.error)
    } else if (activeTab === 'inspection-templates') {
      fetch(`${config.API_URL}/assets/templates`)
        .then(res => res.json())
        .then(setTemplates)
        .catch(console.error)
    }
  }, [activeTab, currentPage])

  const handleCreate = () => {
    setEditingAsset(null)
    setIsModalOpen(true)
    // Refresh schemas to ensure we have the latest fields
    fetch(`${config.API_URL}/assets/schemas`)
      .then(res => res.json())
      .then(setSchemas)
      .catch(console.error)
  }

  const handleEdit = (asset: RegistryAsset) => {
    setEditingAsset(asset)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string | number) => {
    if (!confirm('Are you sure you want to delete this asset?')) return

    fetch(`${config.API_URL}/assets/${id}`, {
      method: 'DELETE',
    })
      .then(() => {
        fetchAssets()
      })
      .catch(console.error)
  }

  const handleSave = async (assetData: Partial<RegistryAsset>) => {
    const url = editingAsset
      ? `${config.API_URL}/assets/${editingAsset.id}`
      : `${config.API_URL}/assets`

    const method = editingAsset ? 'PATCH' : 'POST'

    // Remove ID from body if creating/updating to avoid schema conflicts
    const body = { ...assetData }
    if (editingAsset) {
      delete (body as any).id
      delete (body as any).createdAt
      delete (body as any).updatedAt
    }

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to save asset');
        }
        return res.json();
      })
      .then(() => {
        setIsModalOpen(false)
        fetchAssets()
      })
      .catch((err) => {
        console.error(err)
        alert(`Error: ${err.message}`)
      })
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Asset Registry</h1>
            <p className={styles.subtitle}>Define and manage asset master data</p>
          </div>
          <button type="button" className={styles.createBtn} onClick={handleCreate}>
            <IconPlus />
            Create Asset
          </button>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Registry sections">
          {REGISTRY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              className={[styles.tab, activeTab === tab.id ? styles.tabActive : ''].filter(Boolean).join(' ')}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.tabPanel}>
        {activeTab === 'asset-list' && (
          <div id="panel-asset-list" role="tabpanel" aria-labelledby="tab-asset-list">
            {loading && assets.length === 0 ? <div>Loading assets...</div> : (
              <>
                <AssetListTable
                  assets={assets}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  loading={loading}
                />
              </>
            )}
          </div>
        )}
        {activeTab === 'schema-builder' && (
          <div id="panel-schema-builder" role="tabpanel" aria-labelledby="tab-schema-builder" className={styles.schemaBuilder}>
            {loading ? <div>Loading schemas...</div> : <SchemaLibrarySection schemas={schemas} />}
            <CustomFieldSchemaSection fields={customFields} onFieldsChange={setCustomFields} />
          </div>
        )}
        {activeTab === 'inspection-templates' && (
          <div id="panel-inspection-templates" role="tabpanel" aria-labelledby="tab-inspection-templates" className={styles.inspectionTemplates}>
            {loading ? <div>Loading templates...</div> : <InspectionTemplateLibrarySection templates={templates} />}
            <InspectionTemplateConfigSection
              frequency={inspectionFrequency}
              duration={inspectionDuration}
              checklist={inspectionChecklist}
              onFrequencyChange={setInspectionFrequency}
              onDurationChange={setInspectionDuration}
              onChecklistChange={setInspectionChecklist}
            />
          </div>
        )}
      </div>

      <AssetFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingAsset}
        assetTypes={assetTypes}
        zones={zones}
        schemas={schemas}
        templates={templates}
      />
    </div>
  )
}
