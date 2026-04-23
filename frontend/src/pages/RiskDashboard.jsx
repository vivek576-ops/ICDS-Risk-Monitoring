import { AlertTriangle } from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useFetch } from '../hooks/useFetch'
import KpiCard from '../components/ui/KpiCard'
import PageHeader from '../components/ui/PageHeader'
import ChartTooltip from '../components/charts/ChartTooltip'

const RISK_COLORS = {
  low: '#3fb950', moderate: '#f0a03a', high: '#f85149', critical: '#a371f7'
}
const RISK_ORDER = ['low', 'moderate', 'high', 'critical']

// Custom pie label
function PieLabel({ cx, cy, midAngle, outerRadius, percent, name }) {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 28
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="var(--text-secondary)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  )
}

export default function RiskDashboard() {
  const { data: dist,    loading: distLoad    } = useFetch('/dashboard/risk/distribution')
  const { data: domain,  loading: domainLoad  } = useFetch('/dashboard/risk/by-domain')
  const { data: ageData, loading: ageLoad     } = useFetch('/dashboard/risk/by-age')

  // Build pie data
  const pieData = RISK_ORDER.map(level => {
    const found = (Array.isArray(dist) ? dist : []).find(d => d.level === level)
    return { name: level.charAt(0).toUpperCase() + level.slice(1), value: found?.count || 0, percentage: found?.percentage || 0, color: RISK_COLORS[level] }
  })

  const totalScreened = pieData.reduce((s, d) => s + d.value, 0)

  // Build domain bar data
  const domainData = Array.isArray(domain) ? domain : []

  // Build age table data
  const ageRows = Array.isArray(ageData) ? ageData : []

  return (
    <div className="fade-in">
      <PageHeader
        title="Risk Stratification"
        subtitle="Multi-domain developmental risk distribution across age bands"
        icon={AlertTriangle}
        color="#f85149"
      />

      {/* ── KPI summary row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {RISK_ORDER.map(level => {
          const found = (Array.isArray(dist) ? dist : []).find(d => d.level === level)
          return (
            <div key={level} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: RISK_COLORS[level] }} />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginBottom: 6 }}>
                {level}
              </p>
              <p style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-mono)', color: RISK_COLORS[level], lineHeight: 1 }}>
                {distLoad ? '—' : (found?.count ?? 0).toLocaleString()}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                {distLoad ? '' : `${found?.percentage ?? 0}% of screened`}
              </p>
            </div>
          )
        })}
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16, marginBottom: 24 }}>

        {/* Pie Chart */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Risk Distribution</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>
            {totalScreened.toLocaleString()} children screened
          </p>
          {distLoad ? (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" labelLine={false} label={<PieLabel />}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="var(--bg-card)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val, name) => [val.toLocaleString(), name]} contentStyle={{ background: 'var(--bg-card-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
                {pieData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{d.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: d.color, fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>{d.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Domain Delay Bar Chart */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Domain-Wise Delay Burden</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>Percentage of screened children with delays per domain</p>
          {domainLoad ? (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={domainData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={80} />
                <Tooltip content={<ChartTooltip formatter={v => `${v}%`} />} />
                <Bar dataKey="delayPercent" name="Delay %" radius={[0,4,4,0]}>
                  {domainData.map((entry, i) => (
                    <Cell key={i} fill={
                      entry.delayPercent > 20 ? '#f85149' :
                      entry.delayPercent > 15 ? '#f0a03a' : '#2f81f7'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Age Band Table ── */}
      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Age-Band Risk Distribution</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Screened children and risk percentage by age group</p>
        </div>
        {ageLoad ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Age Band', 'Children Screened', 'At Risk', 'Risk %', 'Risk Visual'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ageRows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{row.ageBand}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{(row.screened || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{(row.atRisk || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: row.riskPercent > 18 ? 'var(--red)' : row.riskPercent > 12 ? 'var(--amber)' : 'var(--green)' }}>
                        {row.riskPercent}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: 120 }}>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-hover)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(row.riskPercent * 3, 100)}%`, borderRadius: 3, background: row.riskPercent > 18 ? 'var(--red)' : row.riskPercent > 12 ? 'var(--amber)' : 'var(--green)', transition: 'width 0.8s ease' }} />
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
