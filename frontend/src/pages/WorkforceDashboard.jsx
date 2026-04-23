import { Users, Award, BookOpen, TrendingUp } from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useFetch } from '../hooks/useFetch'
import KpiCard from '../components/ui/KpiCard'
import PageHeader from '../components/ui/PageHeader'

const TRAINING_COLORS = ['#2f81f7', '#1abc9c', '#f0a03a']
const ROLE_COLORS = {
  CDPO: '#2f81f7', Supervisor: '#1abc9c', AWW: '#a371f7',
  ANM: '#f0a03a', ASHA: '#f85149',
}

function PieLabel({ cx, cy, midAngle, outerRadius, percent }) {
  if (percent < 0.06) return null
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 24
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="var(--text-secondary)" textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central" fontSize={11}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function WorkforceDashboard() {
  const { data, loading } = useFetch('/dashboard/workforce/summary')

  const matrix = data?.capacityMatrix || []
  const modes  = data?.trainingModeDistribution || {}

  // Summary KPIs
  const totalWorkers  = matrix.reduce((s, r) => s + (r.total  || 0), 0)
  const totalTrained  = matrix.reduce((s, r) => s + (r.trained || 0), 0)
  const trainedPct    = totalWorkers > 0 ? Math.round((totalTrained / totalWorkers) * 100) : 0
  const awwRow        = matrix.find(r => r.role === 'AWW')
  const awwPct        = awwRow?.percentage || 0

  const modeData = [
    { name: 'Physical', value: modes.physical || 0, color: '#2f81f7' },
    { name: 'Virtual',  value: modes.virtual  || 0, color: '#1abc9c' },
    { name: 'Hybrid',   value: modes.hybrid   || 0, color: '#f0a03a' },
  ]

  // Parent digital access (PPT Slide 8 - static from PPT stats)
  const accessData = [
    { name: 'Smartphone', value: 54, color: '#2f81f7' },
    { name: 'Keypad Phone', value: 32, color: '#f0a03a' },
    { name: 'No Phone / Shared', value: 14, color: '#f85149' },
  ]

  return (
    <div className="fade-in">
      <PageHeader
        title="Workforce & System Performance"
        subtitle="Training coverage, capacity metrics and parent digital access"
        icon={Users}
        color="#f0a03a"
      />

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard
          title="Total Workforce" icon={Users} color="#2f81f7"
          value={loading ? '—' : totalWorkers.toLocaleString()}
          subtitle="CDPOs, Supervisors, AWWs, ANMs, ASHAs"
          loading={loading}
        />
        <KpiCard
          title="Training Completed" icon={Award} color="#1abc9c"
          value={loading ? '—' : `${trainedPct}%`}
          subtitle={`${totalTrained.toLocaleString()} workers trained`}
          loading={loading}
        />
        <KpiCard
          title="AWW Training Rate" icon={BookOpen} color="#a371f7"
          value={loading ? '—' : `${awwPct}%`}
          subtitle="Anganwadi Workers trained"
          loading={loading}
        />
        <KpiCard
          title="Training Modes" icon={TrendingUp} color="#f0a03a"
          value={loading ? '—' : '3'}
          subtitle="Physical · Virtual · Hybrid"
          loading={loading}
        />
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* Training Mode Pie */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Training Mode Distribution</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>How workforce was trained</p>
          {loading ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={modeData} cx="50%" cy="50%" innerRadius={45} outerRadius={72}
                    dataKey="value" labelLine={false} label={<PieLabel />}>
                    {modeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="var(--bg-card)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{ background: 'var(--bg-card-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {modeData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{d.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: d.color, fontFamily: 'var(--font-mono)' }}>{d.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Parent Digital Access Pie */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Parent Digital Access</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Device access among enrolled parents</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={accessData} cx="50%" cy="50%" innerRadius={45} outerRadius={72}
                dataKey="value" labelLine={false} label={<PieLabel />}>
                {accessData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="var(--bg-card)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{ background: 'var(--bg-card-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {accessData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{d.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: d.color, fontFamily: 'var(--font-mono)' }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Training % Bar by Role */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Training % by Role</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Percentage trained per role type</p>
          {loading ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={matrix} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="role" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={72} />
                <Tooltip formatter={(v) => [`${v}%`, 'Trained']} contentStyle={{ background: 'var(--bg-card-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="percentage" name="Trained %" radius={[0, 4, 4, 0]}>
                  {matrix.map((entry, i) => (
                    <Cell key={i} fill={ROLE_COLORS[entry.role] || '#2f81f7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Capacity Matrix Table ── */}
      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Workforce Capacity Matrix</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Total workforce vs trained count per role</p>
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Role', 'Total', 'Trained', 'Untrained', 'Training %', 'Progress'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => {
                  const color = ROLE_COLORS[row.role] || '#2f81f7'
                  const pct   = row.percentage || 0
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{row.role}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {(row.total || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {(row.trained || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                        {((row.total || 0) - (row.trained || 0)).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: pct >= 90 ? 'var(--green)' : pct >= 75 ? 'var(--amber)' : 'var(--red)' }}>
                          {pct}%
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', minWidth: 140 }}>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-hover)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: color, transition: 'width 0.8s ease' }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
