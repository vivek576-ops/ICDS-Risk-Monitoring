import { GitPullRequest, Clock, CheckCircle, AlertOctagon } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useFetch } from '../hooks/useFetch'
import KpiCard from '../components/ui/KpiCard'
import PageHeader from '../components/ui/PageHeader'
import ChartTooltip from '../components/charts/ChartTooltip'

const URGENCY_COLORS = { emergency: '#a371f7', urgent: '#f85149', routine: '#f0a03a' }
const STATUS_COLORS  = { pending: '#f0a03a', in_progress: '#2f81f7', completed: '#3fb950', overdue: '#f85149', cancelled: '#8b949e' }

const YEAR = new Date().getFullYear()

export default function ReferralDashboard() {
  const { data: kpis,  loading: kpiLoad  } = useFetch('/dashboard/referrals/kpis')
  const { data: monthly, loading: mLoad  } = useFetch('/dashboard/referrals/monthly', { year: YEAR })
  const { data: queue, loading: qLoad    } = useFetch('/referrals/urgency-queue')

  const monthlyData = Array.isArray(monthly) ? monthly : []
  const queueData   = Array.isArray(queue)   ? queue   : []

  return (
    <div className="fade-in">
      <PageHeader
        title="Referral & Action Support"
        subtitle="End-to-end referral lifecycle tracking with SLA monitoring"
        icon={GitPullRequest}
        color="#1abc9c"
      />

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard
          title="Children Referred" icon={GitPullRequest} color="#2f81f7"
          value={kpiLoad ? '—' : (kpis?.totalReferred ?? 0).toLocaleString()}
          subtitle="Total referrals created"
          loading={kpiLoad}
        />
        <KpiCard
          title="Completion Rate" icon={CheckCircle} color="#3fb950"
          value={kpiLoad ? '—' : `${kpis?.completionRate ?? 0}%`}
          subtitle="Referrals completed"
          loading={kpiLoad}
        />
        <KpiCard
          title="Avg. Flag → Referral" icon={Clock} color="#f0a03a"
          value={kpiLoad ? '—' : `${kpis?.avgFlagToReferralDays ?? 0}d`}
          subtitle="Average days to referral"
          loading={kpiLoad}
        />
        <KpiCard
          title="Overdue Referrals" icon={AlertOctagon} color="#f85149"
          value={kpiLoad ? '—' : (kpis?.overdueCount ?? 0).toLocaleString()}
          subtitle="Past SLA deadline"
          loading={kpiLoad}
        />
      </div>

      {/* ── Chart + Queue Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* Monthly Referral Chart */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Monthly Referral Status</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>Completed vs Pending · {YEAR}</p>
          {mLoad ? (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="completed" name="Completed" stackId="a" fill="#3fb950" radius={[0,0,0,0]} />
                <Bar dataKey="pending"   name="Pending"   stackId="a" fill="#f0a03a" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Summary stats */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>SLA Performance</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>Breakdown by urgency level</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            {[
              { label: 'Emergency', sla: '3-day SLA', color: '#a371f7', desc: 'Immediate specialist intervention' },
              { label: 'Urgent',    sla: '7-day SLA', color: '#f85149', desc: 'Specialist referral within week' },
              { label: 'Routine',   sla: '30-day SLA', color: '#f0a03a', desc: 'Scheduled follow-up' },
            ].map(item => (
              <div key={item.label} className="card-2" style={{ borderLeft: `3px solid ${item.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.desc}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: item.color, fontFamily: 'var(--font-mono)' }}>{item.sla}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Urgency Queue ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Urgency Queue</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Active referrals sorted by priority — Emergency → Urgent → Routine</p>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {queueData.length} active
          </span>
        </div>

        {qLoad ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : queueData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
            No active referrals in queue
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Ref Code', 'Child', 'Urgency', 'Status', 'Specialist', 'Days Open', 'SLA Deadline'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queueData.map((ref, i) => {
                  const urgColor  = URGENCY_COLORS[ref.urgency]  || '#8b949e'
                  const statColor = STATUS_COLORS[ref.status]    || '#8b949e'
                  const deadline  = ref.slaDeadline ? new Date(ref.slaDeadline).toLocaleDateString('en-IN') : '—'
                  const isOverdue = ref.status === 'overdue'
                  const childName = ref.childId?.name || 'Unknown'

                  return (
                    <tr key={i}
                      style={{ borderBottom: '1px solid var(--border-light)', background: isOverdue ? 'rgba(248,81,73,0.04)' : 'transparent' }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseOut={e => e.currentTarget.style.background = isOverdue ? 'rgba(248,81,73,0.04)' : 'transparent'}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {ref.referralCode}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{childName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ref.district}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className="badge" style={{ background: urgColor + '18', color: urgColor }}>
                          {ref.urgency}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className="badge" style={{ background: statColor + '18', color: statColor }}>
                          {ref.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {ref.referredTo || '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: ref.daysOpen > 7 ? 'var(--red)' : ref.daysOpen > 3 ? 'var(--amber)' : 'var(--green)' }}>
                          {ref.daysOpen}d
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: isOverdue ? 'var(--red)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {deadline}
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
