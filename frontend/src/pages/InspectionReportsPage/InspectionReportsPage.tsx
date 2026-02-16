import { useState, useEffect } from 'react'
import { config } from '@/config'
import {
  STATUS_FILTER_OPTIONS,
} from '@/data/inspectionConstants'
import type { InspectionReportRow } from '@/types'
import styles from './InspectionReportsPage.module.css'
import { Pagination } from '@/components/ui/Pagination'

function IconFilter({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

function IconDownload({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function IconEye({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconCheck({ className, size = 12 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconX({ className, size = 12 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconMinus({ className, size = 12 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function StatusBadge({ status }: { status: InspectionReportRow['status'] }) {
  const variant =
    status === 'pass' ? 'pass' : status === 'fail' ? 'fail' : 'partial'
  const classMap = {
    pass: styles.statusPass,
    fail: styles.statusFail,
    partial: styles.statusPartial,
  }
  const labelMap = { pass: 'Pass', fail: 'Fail', partial: 'Partial' }
  const Icon = status === 'pass' ? IconCheck : status === 'fail' ? IconX : IconMinus
  return (
    <span className={`${styles.statusBadge} ${classMap[variant]}`}>
      <Icon size={12} />
      {labelMap[variant]}
    </span>
  )
}

export function InspectionReportsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [reports, setReports] = useState<InspectionReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const LIMIT = 10

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${config.API_URL}/inspections/reports?page=${currentPage}&limit=${LIMIT}&status=${statusFilter}`)
        if (res.ok) {
          const result = await res.json()
          setReports(result.data || [])
          setTotalPages(result.totalPages || 1)
        }
      } catch (error) {
        console.error('Error fetching reports:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [currentPage, statusFilter])


  // Backend handles filtering now
  const filteredReports = reports

  const handleExport = () => {
    if (filteredReports.length === 0) {
      alert('No reports to export.')
      return
    }

    const csvRows = [
      ['Asset Name', 'Date', 'Type', 'Status', 'Defects', 'Inspector', 'Duration'],
    ]

    filteredReports.forEach((report) => {
      csvRows.push([
        report.assetName,
        report.inspectionDate,
        report.inspectionType,
        report.status,
        String(report.defects || 'None'),
        report.inspector,
        String(report.duration),
      ])
    })

    const csvContent =
      'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'inspection_history_report.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Inspection Reports</h1>
          <p className={styles.subtitle}>Audit-ready inspection history and documentation</p>
        </div>
        <button type="button" className={styles.exportBtn} onClick={handleExport}>
          <IconDownload size={18} />
          Export Reports
        </button>
      </header>

      <div className={styles.filterBar}>
        <span className={styles.filterIcon} aria-hidden>
          <IconFilter size={18} />
        </span>
        <span className={styles.filterLabel}>Filter by Status:</span>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setCurrentPage(1)
          }}
          aria-label="Filter reports by status"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Asset Name</th>
              <th>Inspection Date</th>
              <th>Inspection Type</th>
              <th>Status</th>
              <th>Defects</th>
              <th>Inspector</th>
              <th>Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
            ) : filteredReports.length > 0 ? (
              filteredReports.map((row) => (
                <tr key={row.id}>
                  <td>{row.assetName}</td>
                  <td>{row.inspectionDate}</td>
                  <td>{row.inspectionType}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td
                    className={
                      row.status === 'fail'
                        ? styles.defectsFail
                        : row.status === 'partial'
                          ? styles.defectsPartial
                          : undefined
                    }
                  >
                    {row.defects}
                  </td>
                  <td>{row.inspector}</td>
                  <td>{row.duration}</td>
                  <td>
                    <button type="button" className={styles.viewReportBtn} onClick={() => alert(`Viewing report for ${row.assetName}`)}>
                      <IconEye size={16} />
                      View Report
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>No reports found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        loading={loading}
      />

    </div>
  )
}
