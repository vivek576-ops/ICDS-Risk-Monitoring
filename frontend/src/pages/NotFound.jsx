import { useNavigate } from 'react-router-dom'
import { Activity } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: 'linear-gradient(135deg, #1abc9c, #2f81f7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Activity size={28} color="#fff" />
      </div>
      <h1 style={{ fontSize: 48, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>404</h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Page not found</p>
      <button className="btn btn-primary" onClick={() => navigate('/screening')}>
        Go to Dashboard
      </button>
    </div>
  )
}
