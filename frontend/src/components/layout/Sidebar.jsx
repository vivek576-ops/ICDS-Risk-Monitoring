import { NavLink, useNavigate } from 'react-router-dom'
import { BarChart2, AlertTriangle, GitPullRequest, Map, Users, LogOut, Activity } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/screening', icon: BarChart2,      label: 'Screening',  roles: ['admin','cdpo','supervisor'] },
  { to: '/risk',      icon: AlertTriangle,  label: 'Risk',        roles: ['admin','cdpo','supervisor'] },
  { to: '/referrals', icon: GitPullRequest, label: 'Referrals',   roles: ['admin','cdpo','supervisor','aww'] },
  { to: '/geo',       icon: Map,            label: 'Geo Map',     roles: ['admin','cdpo','supervisor'] },
  { to: '/workforce', icon: Users,          label: 'Workforce',   roles: ['admin','cdpo'] },
]

const ROLE_COLORS = {
  admin: '#2f81f7', cdpo: '#1abc9c', supervisor: '#f0a03a',
  aww: '#a371f7', anm: '#3fb950', asha: '#f85149', parent: '#8b949e',
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const visibleNav = NAV.filter(n => n.roles.includes(user?.role))
  const roleColor = ROLE_COLORS[user?.role] || '#8b949e'

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      flexShrink: 0,
    }}>

      {/* ── Brand ── */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #1abc9c, #2f81f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>ICDS</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.2 }}>Risk Monitor</div>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {visibleNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 'var(--radius)',
              marginBottom: 2,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-hover)' : 'transparent',
              transition: 'all 0.15s',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── User ── */}
      <div style={{ padding: '12px 12px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px', borderRadius: 'var(--radius)', marginBottom: 8,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: roleColor + '22',
            border: `1.5px solid ${roleColor}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: roleColor,
            flexShrink: 0,
          }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </div>
            <div style={{
              fontSize: 10, color: roleColor, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              {user?.role}
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '7px' }}>
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
