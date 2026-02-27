import React, { useState, useEffect, useMemo } from 'react';
import { useSocket } from '@/context/SocketContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import styles from './InspectionsPage.module.css';
import { config } from '@/config';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';

// --- Icons ---
const DownloadIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);
const PlusIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const CalendarIcon = ({ size = 20, color = 'currentColor', style }: { size?: number; color?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);
const AlertTriangleIcon = ({ size = 20, color = 'currentColor', style }: { size?: number; color?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
);
const CheckCircleIcon = ({ size = 20, color = 'currentColor', style }: { size?: number; color?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);
const ActivityIcon = ({ size = 20, color = 'currentColor', style }: { size?: number; color?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
);
const TrendingUpIcon = ({ size = 20, color = 'currentColor', style }: { size?: number; color?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
);
const CameraIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
);


// ... imports ...

export const InspectionsPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  const {
    data: upcomingInspections,
    loading: loadingUpcoming,
    currentPage,
    totalPages,
    goToPage: setCurrentPage,
    refresh: refreshUpcoming
  } = usePagination<any>(`${config.API_URL}/inspections/upcoming`, { limit: 10 });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    assetId: '',
    scheduledDate: '',
    type: 'Routine'
  });

  useEffect(() => {
    const fetchDashboardAndAssets = async () => {
      try {
        setLoadingDashboard(true);
        const [dashboardRes, assetsRes] = await Promise.all([
          fetch(`${config.API_URL}/inspections/dashboard`),
          fetch(`${config.API_URL}/assets`)
        ]);

        if (dashboardRes.ok) {
          setDashboardData(await dashboardRes.json());
        }

        if (assetsRes.ok) {
          const result = await assetsRes.ok ? await assetsRes.json() : { data: [] };
          setAssets(result.data || []);
        }
      } catch (error) {
        console.error("Error fetching inspection data:", error);
      } finally {
        setLoadingDashboard(false);
      }
    };

    fetchDashboardAndAssets();
  }, []);

  const loading = loadingDashboard || loadingUpcoming;


  const { lastTelemetry, lastAnomaly, lastInspectionStats } = useSocket();

  // Real-time updates for Map Markers from Telemetry
  useEffect(() => {
    if (!lastTelemetry || !dashboardData) return;

    setDashboardData((prev: any) => {
      if (!prev || !prev.mapData) return prev;
      return {
        ...prev,
        mapData: prev.mapData.map((point: any) => {
          if (point.name === lastTelemetry.assetId) {
            return {
              ...point,
              healthStatus: lastTelemetry.status,
            };
          }
          return point;
        })
      };
    });
  }, [lastTelemetry]);

  // Real-time updates for Map Markers & KPIs from Anomaly
  useEffect(() => {
    if (!lastAnomaly || !dashboardData) return;

    setDashboardData((prev: any) => {
      if (!prev || !prev.mapData) return prev;
      return {
        ...prev,
        mapData: prev.mapData.map((point: any) => {
          if (point.name === lastAnomaly.assetId) {
            return {
              ...point,
              hasAnomaly: !lastAnomaly.isResolved
            };
          }
          return point;
        }),
        kpi: {
          ...prev.kpi,
          overdue: !lastAnomaly.isResolved ? (prev.kpi.overdue || 0) + 1 : prev.kpi.overdue,
        }
      };
    });
  }, [lastAnomaly]);

  useEffect(() => {
    if (!lastInspectionStats || !dashboardData) return;

    setDashboardData((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        // Override graph data with real-time stats from ES
        timeline: lastInspectionStats.timeline || prev.timeline,
        zoneCoverage: lastInspectionStats.zoneCoverage || prev.zoneCoverage,
        complianceTrend: lastInspectionStats.complianceTrend || prev.complianceTrend,
        typeDistribution: lastInspectionStats.typeDistribution || prev.typeDistribution
      };
    });
  }, [lastInspectionStats]);

  const handleExport = () => {
    if (!dashboardData) return;

    // Prepare CSV content
    const kpiData = dashboardData.kpi;
    const csvRows = [
      ['Metric', 'Value'],
      ['Due Inspections', kpiData.due],
      ['Overdue Inspections', kpiData.overdue],
      ['Completed Inspections', kpiData.completed],
      ['SLA Compliance', `${kpiData.sla}%`],
      ['Avg Duration', `${Math.round(kpiData.averageDuration / 60)} min`],
      [],
      ['Upcoming Inspections'],
      ['Asset Name', 'Type', 'Zone', 'Due Date', 'Status']
    ];

    upcomingInspections.forEach(insp => {
      csvRows.push([
        insp.assetName,
        insp.type,
        insp.zone,
        new Date(insp.dueDate).toLocaleDateString(),
        insp.status
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8,"
      + csvRows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inspection_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assetId || !formData.scheduledDate) return;

    try {
      const response = await fetch(`${config.API_URL}/inspections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetId: formData.assetId,
          scheduledDate: formData.scheduledDate,
          type: formData.type,
          status: 'scheduled'
        }),
      });

      if (response.ok) {
        setIsModalOpen(false);
        setFormData({ assetId: '', scheduledDate: '', type: 'Routine' });
        // Refresh data immediately
        refreshUpcoming();
      } else {
        alert('Failed to schedule inspection');
      }
    } catch (error) {
      console.error('Error scheduling inspection:', error);
      alert('Error scheduling inspection');
    }
  };


  // ... (KPI Logic remains same)
  const kpiData = dashboardData?.kpi || { due: 0, overdue: 0, completed: 0, sla: 0, averageDuration: 0 };
  const timelineData = useMemo(() => dashboardData?.timeline || [], [dashboardData]);
  const zoneCoverageData = useMemo(() => dashboardData?.zoneCoverage || [], [dashboardData]);
  const typeDistributionData = useMemo(() => dashboardData?.typeDistribution || [], [dashboardData]);
  const complianceTrendData = useMemo(() => dashboardData?.complianceTrend || [], [dashboardData]);

  if (loading && !dashboardData) {
    return <div className={styles.loadingContainer}>Loading dashboard data...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Inspection Overview</h1>
          <p className={styles.subtitle}>Workflow monitoring and compliance tracking</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.secondaryButton} onClick={handleExport}>
            <DownloadIcon /> Export Report
          </button>
          <button className={styles.primaryButton} onClick={() => setIsModalOpen(true)}>
            <PlusIcon /> Schedule Inspection
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        {/* ... (Existing KPI Cards) ... */}
        <div className={`${styles.kpiCard} ${styles.kpiDue}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel} style={{ color: 'rgba(255,255,255,0.8)' }}>Assets Due for Inspection</span>
            <CalendarIcon style={{ position: 'absolute', top: '2px', right: '0px', color: 'rgba(255,255,255,0.8)' }} />
          </div>
          <div className={styles.kpiValue}>{kpiData.due}</div>
          <div className={styles.kpiSubtitle} style={{ marginTop: '4px' }}>Within 7 days</div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiOverdue}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel} style={{ color: 'rgba(255,255,255,0.8)' }}>Assets Overdue</span>
            <AlertTriangleIcon style={{ position: 'absolute', top: '2px', right: '0px', color: 'rgba(255,255,255,0.8)' }} />
          </div>
          <div className={styles.kpiValue}>{kpiData.overdue}</div>
          <div className={styles.kpiSubtitle} style={{ marginTop: '4px' }}>Immediate action required</div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiCompleted}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel} style={{ color: 'rgba(255,255,255,0.8)' }}>Completed Inspections</span>
            <CheckCircleIcon style={{ position: 'absolute', top: '2px', right: '0px', color: 'rgba(255,255,255,0.8)' }} />
          </div>
          <div className={styles.kpiValue}>{kpiData.completed}</div>
          <div className={styles.kpiSubtitle} style={{ marginTop: '4px' }}>Out of {Number(kpiData.completed) + Number(kpiData.due)} scheduled</div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiDuration}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel} style={{ color: 'rgba(255,255,255,0.8)' }}>Average Duration</span>
            <ActivityIcon style={{ position: 'absolute', top: '2px', right: '0px', color: 'rgba(255,255,255,0.8)' }} />
          </div>
          <div className={styles.kpiValue}>{Math.round(kpiData.averageDuration / 60)} min</div>
          <div className={styles.kpiSubtitle} style={{ marginTop: '4px' }}>Per inspection</div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiSla}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel} style={{ color: 'rgba(255,255,255,0.8)' }}>SLA Compliance</span>
            <TrendingUpIcon style={{ position: 'absolute', top: '2px', right: '0px', color: 'rgba(255,255,255,0.8)' }} />
          </div>
          <div className={styles.kpiValue}>{kpiData.sla}%</div>
          <div className={styles.kpiSubtitle} style={{ marginTop: '4px' }}>vs. Target 90%</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Inspection Due Timeline</h3>
          <p className={styles.chartSubtitle}>Upcoming inspections over next 30 days.</p>
          <div style={{ height: '250px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData}>
                <defs>
                  <linearGradient id="colorDue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(4px)' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="count" fill="url(#colorDue)" radius={[4, 4, 0, 0]} name="Inspections" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Zone-wise Inspection Coverage</h3>
          <p className={styles.chartSubtitle}>Compliance percentage by facility zone.</p>
          <div style={{ height: '250px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneCoverageData} layout="vertical" margin={{ left: 0 }}>
                <defs>
                  <linearGradient id="colorCoverage" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
                <YAxis dataKey="zone" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={90} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(4px)' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="percentage" fill="url(#colorCoverage)" radius={[0, 4, 4, 0]} name="Coverage" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Compliance Trend</h3>
          <p className={styles.chartSubtitle}>Monthly inspection compliance percentage.</p>
          <div style={{ height: '250px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={complianceTrendData}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(4px)' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ fill: '#1f2937', stroke: '#8b5cf6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Asset Type Inspection Distribution</h3>
          <p className={styles.chartSubtitle}>Breakdown by asset category.</p>
          <div style={{ width: '100%' }}>
            <div style={{ height: '220px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {typeDistributionData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(4px)' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '10px' }}>
              {typeDistributionData.map((entry: any, index: number) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: '#9ca3af' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color, marginRight: '6px', boxShadow: `0 0 8px ${entry.color}66` }}></span>
                  {entry.type}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tables & Map (unchanged) */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Upcoming Scheduled Inspections</h2>
        <p className={styles.sectionSubtitle}>Assets requiring inspection within the next 7 days.</p>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Asset Name</th>
              <th>Type</th>
              <th>Zone</th>
              <th>Due Date</th>
              <th>Days Until Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {upcomingInspections.map((inspection) => (
              <tr key={inspection.id}>
                <td className={styles.assetName}>
                  {inspection.assetName}
                </td>
                <td>{inspection.type}</td>
                <td>{inspection.zone}</td>
                <td>{new Date(inspection.dueDate).toLocaleDateString()}</td>
                <td>{inspection.daysUntilDue} days</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles[inspection.status === 'urgent' ? 'statusUrgent' : inspection.status === 'overdue' ? 'statusOverdue' : 'statusDue']}`}>
                    {inspection.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
            {upcomingInspections.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>No upcoming inspections found.</td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          loading={loading}
        />
      </div>

      <div className={styles.sectionHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 className={styles.sectionTitle}>Inspection Map</h2>
          <div className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            LIVE
          </div>
        </div>
        <p className={styles.sectionSubtitle}>Visual overview of inspection status by facility zone.</p>
      </div>
      <div className={styles.mapContainer}>
        <div className={styles.mapGrid} aria-hidden />
        <div className={styles.mapRegions}>
          {(dashboardData?.mapZones || []).map((zone: any) => (
            <div
              key={zone.id}
              className={styles.mapRegion}
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`,
              }}
            >
              <span className={styles.mapRegionLabel}>{zone.label}</span>
            </div>
          ))}
        </div>
        <div className={styles.markers}>
          {(dashboardData?.mapData || []).map((point: any) => (
            <div
              key={point.id}
              className={styles.marker}
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
              }}
              title={`${point.name} (${point.healthStatus || 'N/A'})`}
            >
              {/* Camera Icon Layer */}
              {point.hasCamera && (
                <span className={styles.markerCamera}>
                  <CameraIcon size={12} />
                </span>
              )}

              {/* Inspection Due Layer */}
              {point.inspectionDue && (
                <span className={styles.markerInspectionDue}>
                  <span className={styles.markerPulse} />
                  <AlertTriangleIcon size={10} color="#1c1917" />
                </span>
              )}

              {/* Asset Health Layer */}
              {point.healthStatus && point.healthStatus !== 'good' && (
                <span className={`${styles.markerStatus} ${styles[`marker${point.healthStatus.charAt(0).toUpperCase()}${point.healthStatus.slice(1)}`]}`} />
              )}

              {/* Asset Name Label */}
              <span className={styles.markerLabel}>{point.name}</span>
            </div>
          ))}
        </div>
        <div className={styles.mapLegend}>
          <div className={styles.mapLegendTitle}>Map Legend</div>
          <div className={styles.mapLegendItems}>
            <div className={styles.mapLegendItem}>
              <span className={styles.legendIconCamera}><CameraIcon size={12} /></span>
              Active Camera
            </div>
            <div className={styles.mapLegendItem}>
              <span className={styles.legendIconDue}><AlertTriangleIcon size={10} color="#1c1917" /></span>
              Inspection Due
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Schedule New Inspection</h2>
            <form onSubmit={handleScheduleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Asset</label>
                <select
                  className={styles.formSelect}
                  value={formData.assetId}
                  onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                  required
                >
                  <option value="">Select Asset</option>
                  {assets.map(asset => (
                    <option key={asset.id} value={asset.id}>{asset.name} ({asset.type})</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Scheduled Date</label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Inspection Type</label>
                <select
                  className={styles.formSelect}
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="Routine">Routine Check</option>
                  <option value="Compliance">Compliance Audit</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Safety">Safety Inspection</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.submitButton}>Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default InspectionsPage;
