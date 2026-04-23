import { useState } from 'react'
import { BarChart2, Users, Target, Flag, RefreshCw } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useFetch } from '../hooks/useFetch'
import KpiCard from '../components/ui/KpiCard'
import PageHeader from '../components/ui/PageHeader'
import ChartTooltip from '../components/charts/ChartTooltip'

const YEAR = new Date().getFullYear()

export default function ScreeningDashboard() {
  const [district, setDistrict] = useState('')

  const { data: kpis,   loading: kpiLoad,   refetch: refetchKpi }   = useFetch('/dashboard/screening/kpis',        district ? { district } : {})
  const { data: trend,  loading: trendLoad                        }  = useFetch('/dashboard/screening/monthly-trend', { year: YEAR, ...(district ? { district } : {}) })
  const { data: byDist, loading: distLoad                         }  = useFetch('/dashboard/screening/by-district')

  function refresh() { refetchKpi() }

  const trendData = Array.isArray(trend) ? trend : []
  const distData  = Array.isArray(byDist) ? byDist : []

  return (
    <div className="fade-in">
      <PageHeader
        title="Screening & Coverage"
        subtitle="Real-time AWC screening coverage across Andhra Pradesh"
        icon={BarChart2}
        color="#2f81f7"
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={district} onChange={e => setDistrict(e.target.value)} style={{ fontSize: 12, minWidth: 160 }}>
            <option value="">All Districts</option>
            {['Visakhapatnam','Guntur','Krishna','Nellore','Kurnool','Eluru','Kakinada','Anantapur','Prakasam','Kadapa','Vizianagaram','Srikakulam','Chittoor'].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <button className="btn btn-ghost" onClick={refresh} style={{ padding: '8px 10px' }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </PageHeader>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard
          title="Children Screened" icon={Users} color="#2f81f7"
          value={kpiLoad ? '—' : (kpis?.childrenScreened ?? 0).toLocaleString()}
          subtitle={`of ${(kpis?.totalEnrolled ?? 0).toLocaleString()} enrolled`}
          loading={kpiLoad}
        />
        <KpiCard
          title="Active Centres" icon={Target} color="#1abc9c"
          value={kpiLoad ? '—' : (kpis?.activeCentres ?? 0).toLocaleString()}
          subtitle="Anganwadi Centres"
          loading={kpiLoad}
        />
        <KpiCard
          title="Screening Coverage" icon={BarChart2} color="#f0a03a"
          value={kpiLoad ? '—' : `${kpis?.screeningCoverage ?? 0}%`}
          subtitle="of enrolled children"
          loading={kpiLoad}
        />
        <KpiCard
          title="Children Flagged" icon={Flag} color="#f85149"
          value={kpiLoad ? '—' : `${kpis?.childrenFlagged ?? 0}%`}
          subtitle={`${(kpis?.flaggedCount ?? 0).toLocaleString()} high/critical`}
          loading={kpiLoad}
        />
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* Monthly Trend */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Monthly Screening Trend</h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Screened vs Flagged · {YEAR}</p>
            </div>
          </div>
          {trendLoad ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gScreened" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2f81f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2f81f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gFlagged" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f85149" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f85149" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="screened" name="Screened" stroke="#2f81f7" fill="url(#gScreened)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="flagged"  name="Flagged"  stroke="#f85149" fill="url(#gFlagged)"  strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Screened vs Flagged Bar */}
        <div className="card">
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Monthly Comparison</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Side-by-side bar view · {YEAR}</p>
          </div>
          {trendLoad ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="screened" name="Screened" fill="#2f81f7" radius={[2,2,0,0]} />
                <Bar dataKey="flagged"  name="Flagged"  fill="#f85149" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── District Table ── */}
      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>AWC Performance by District</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Coverage and risk breakdown per district</p>
        </div>
        {distLoad ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['District', 'AWCs', 'Coverage %', 'Risk %', 'Coverage Bar'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {distData.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {row.district}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {row.awcCount ?? '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: row.coverage >= 80 ? 'var(--green)' : row.coverage >= 65 ? 'var(--amber)' : 'var(--red)' }}>
                        {row.coverage}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: row.riskPercent <= 10 ? 'var(--green)' : row.riskPercent <= 18 ? 'var(--amber)' : 'var(--red)' }}>
                        {row.riskPercent}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: 120 }}>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-hover)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${row.coverage}%`, borderRadius: 3, background: row.coverage >= 80 ? 'var(--green)' : row.coverage >= 65 ? 'var(--amber)' : 'var(--red)', transition: 'width 0.8s ease' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
