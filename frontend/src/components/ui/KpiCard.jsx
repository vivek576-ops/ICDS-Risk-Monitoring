export default function KpiCard({ title, value, subtitle, icon: Icon, color = '#2f81f7', loading }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginBottom: 8 }}>
            {title}
          </p>
          {loading ? (
            <div style={{ width: 80, height: 32, borderRadius: 4, background: 'var(--bg-hover)', animation: 'pulse 1.5s ease infinite' }} />
          ) : (
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
              {value}
            </p>
          )}
          {subtitle && (
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
              {loading ? '' : subtitle}
            </p>
          )}
        </div>

        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {Icon && <Icon size={20} color={color} />}
        </div>
      </div>
    </div>
  )
}
