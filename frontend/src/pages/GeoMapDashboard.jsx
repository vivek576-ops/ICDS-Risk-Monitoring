import { useState, useEffect, useRef } from 'react'
import { Map, Filter, BarChart2, AlertTriangle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { useFetch } from '../hooks/useFetch'
import PageHeader from '../components/ui/PageHeader'
import ChartTooltip from '../components/charts/ChartTooltip'

const RISK_COLORS = {
  low: '#3fb950', moderate: '#f0a03a', high: '#f85149', critical: '#a371f7'
}

// Risk to circle size
const RISK_RADIUS = { low: 7, moderate: 9, high: 12, critical: 15 }

// Leaflet map component — loaded dynamically to avoid SSR issues
function LeafletMap({ centres, filter }) {
  const mapRef     = useRef(null)
  const leafletRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    // Load Leaflet from CDN (already in index.html)
    if (typeof window === 'undefined') return

    const L = window.L
    if (!L) return

    // Init map once
    if (!leafletRef.current) {
      leafletRef.current = L.map(mapRef.current, {
        center: [15.9129, 79.7400], // Andhra Pradesh center
        zoom: 7,
        zoomControl: true,
      })

      // Dark tile layer (CartoDB Dark Matter)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(leafletRef.current)
    }

    // Clear old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    if (!centres?.length) return

    // Filter centres
    const filtered = centres.filter(c => {
      if (filter.riskLevel && c.riskLevel !== filter.riskLevel) return false
      if (filter.district  && c.district  !== filter.district)  return false
      return true
    })

    // Add circle markers
    filtered.forEach(centre => {
      const color  = RISK_COLORS[centre.riskLevel] || '#8b949e'
      const radius = RISK_RADIUS[centre.riskLevel] || 8

      const marker = L.circleMarker(
        [parseFloat(centre.latitude), parseFloat(centre.longitude)],
        {
          radius,
          fillColor:   color,
          color:       color,
          weight:      1.5,
          opacity:     0.9,
          fillOpacity: 0.55,
        }
      )

      marker.bindPopup(`
        <div style="font-family:'DM Sans',sans-serif;min-width:180px;padding:4px">
          <div style="font-weight:700;font-size:13px;margin-bottom:6px">${centre.name}</div>
          <div style="font-size:11px;color:#8b949e;margin-bottom:4px">${centre.district} · ${centre.mandal}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            <span style="font-size:11px;color:#8b949e">Risk Level:</span>
            <span style="font-size:11px;font-weight:700;color:${color};text-transform:capitalize">${centre.riskLevel}</span>
          </div>
          <div style="font-size:11px;color:#8b949e">
            Coverage: <strong style="color:#e6edf3">${centre.screeningCoverage}%</strong>
          </div>
          <div style="font-size:11px;color:#8b949e">
            Risk Score: <strong style="color:${color}">${centre.riskScore}</strong>
          </div>
          <div style="font-size:11px;color:#8b949e;margin-top:4px">
            Code: <span style="font-family:monospace;color:#e6edf3">${centre.centreCode}</span>
          </div>
        </div>
      `, { maxWidth: 220 })

      marker.addTo(leafletRef.current)
      markersRef.current.push(marker)
    })

    return () => {}
  }, [centres, filter])

  // Override Leaflet popup style to match dark theme
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .leaflet-popup-content-wrapper {
        background: #161b22 !important;
        border: 1px solid #30363d !important;
        border-radius: 8px !important;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        color: #e6edf3 !important;
      }
      .leaflet-popup-tip { background: #161b22 !important; }
      .leaflet-popup-close-button { color: #8b949e !important; }
      .leaflet-control-zoom a {
        background: #161b22 !important;
        border-color: #30363d !important;
        color: #e6edf3 !important;
      }
      .leaflet-control-zoom a:hover { background: #21262d !important; }
      .leaflet-control-attribution {
        background: rgba(22,27,34,0.8) !important;
        color: #484f58 !important;
        font-size: 10px !important;
      }
      .leaflet-control-attribution a { color: #484f58 !important; }
    `
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '100%', borderRadius: 'var(--radius)', zIndex: 0 }}
    />
  )
}

// ─── Main Component ───
export default function GeoMapDashboard() {
  const [filter, setFilter] = useState({ riskLevel: '', district: '' })

  const { data: centres, loading: centreLoad } = useFetch('/dashboard/geo/centres')
  const { data: distRisk, loading: distLoad  } = useFetch('/dashboard/geo/district-risk')

  // Counts by risk level
  const centreList = Array.isArray(centres)  ? centres  : []
  const distList   = Array.isArray(distRisk) ? distRisk : []

  const riskCounts = ['low','moderate','high','critical'].reduce((acc, level) => {
    acc[level] = centreList.filter(c => c.riskLevel === level).length
    return acc
  }, {})

  const filtered = centreList.filter(c => {
    if (filter.riskLevel && c.riskLevel !== filter.riskLevel) return false
    if (filter.district  && c.district  !== filter.district)  return false
    return true
  })

  const AP_DISTRICTS = [
    'Visakhapatnam','Guntur','Krishna','Nellore','Kurnool',
    'Eluru','Kakinada','Anantapur','Prakasam','Kadapa',
    'Vizianagaram','Srikakulam','Chittoor',
  ]

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', gap: 0 }}>

      <PageHeader
        title="Geo-Analytic Risk Map"
        subtitle="District · Mandal · Village level AWC heatmap — Andhra Pradesh"
        icon={Map}
        color="#1abc9c"
      >
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={filter.riskLevel}
            onChange={e => setFilter(f => ({ ...f, riskLevel: e.target.value }))}
            style={{ fontSize: 12, minWidth: 130 }}
          >
            <option value="">All Risk Levels</option>
            <option value="low">🟢 Low</option>
            <option value="moderate">🟡 Moderate</option>
            <option value="high">🔴 High</option>
            <option value="critical">🟣 Critical</option>
          </select>
          <select
            value={filter.district}
            onChange={e => setFilter(f => ({ ...f, district: e.target.value }))}
            style={{ fontSize: 12, minWidth: 150 }}
          >
            <option value="">All Districts</option>
            {AP_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button
            className="btn btn-ghost"
            onClick={() => setFilter({ riskLevel: '', district: '' })}
            style={{ fontSize: 12 }}
          >
            Clear
          </button>
        </div>
      </PageHeader>

      {/* ── Risk Level Summary Badges ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {['low','moderate','high','critical'].map(level => (
          <button
            key={level}
            onClick={() => setFilter(f => ({ ...f, riskLevel: f.riskLevel === level ? '' : level }))}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 20,
              border: `1px solid ${RISK_COLORS[level]}${filter.riskLevel === level ? 'ff' : '44'}`,
              background: filter.riskLevel === level ? RISK_COLORS[level] + '22' : 'transparent',
              cursor: 'pointer', transition: 'all 0.15s',
              fontFamily: 'var(--font-body)',
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLORS[level] }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: RISK_COLORS[level], textTransform: 'capitalize' }}>{level}</span>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {riskCounts[level] || 0}
            </span>
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Showing</span>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {filtered.length}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>of {centreList.length} centres</span>
        </div>
      </div>

      {/* ── Main content: Map + Sidebar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, flex: 1, minHeight: 0 }}>

        {/* MAP */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative', minHeight: 400 }}>
          {centreLoad ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <div className="spinner" />
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading AWC locations…</p>
            </div>
          ) : (
            <LeafletMap centres={centreList} filter={filter} />
          )}

          {/* Map legend overlay */}
          <div style={{
            position: 'absolute', bottom: 16, left: 16, zIndex: 1000,
            background: 'rgba(22,27,34,0.92)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '10px 14px',
            backdropFilter: 'blur(8px)',
          }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Risk Level
            </p>
            {[
              ['low', 'Low Risk', '7px'],
              ['moderate', 'Moderate', '9px'],
              ['high', 'High Risk', '12px'],
              ['critical', 'Critical', '15px'],
            ].map(([level, label, size]) => (
              <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <div style={{ width: size, height: size, borderRadius: '50%', background: RISK_COLORS[level], opacity: 0.8, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SIDEBAR PANEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>

          {/* District Risk Scores Chart */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <BarChart2 size={14} color="var(--text-muted)" />
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Top High-Risk Districts</h3>
            </div>
            {distLoad ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={distList.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} domain={[0, 100]} />
                  <YAxis type="category" dataKey="district" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} width={70} />
                  <Tooltip content={<ChartTooltip formatter={v => [`${v} / 100`, 'Risk Score']} />} />
                  <Bar dataKey="riskScore" name="Risk Score" radius={[0, 3, 3, 0]}>
                    {distList.slice(0, 8).map((entry, i) => (
                      <Cell key={i} fill={
                        entry.riskScore >= 80 ? '#a371f7' :
                        entry.riskScore >= 65 ? '#f85149' :
                        entry.riskScore >= 50 ? '#f0a03a' : '#3fb950'
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Filtered Centre List */}
          <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertTriangle size={14} color="var(--text-muted)" />
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {filter.riskLevel ? `${filter.riskLevel.charAt(0).toUpperCase() + filter.riskLevel.slice(1)} Risk Centres` : 'All Centres'}
              </h3>
            </div>
            <div style={{ overflow: 'auto', flex: 1 }}>
              {filtered.slice(0, 20).map((c, i) => (
                <div key={i} style={{
                  padding: '8px 10px', borderRadius: 'var(--radius)',
                  marginBottom: 4, background: 'var(--bg-card-2)',
                  borderLeft: `3px solid ${RISK_COLORS[c.riskLevel] || '#8b949e'}`,
                  transition: 'background 0.15s', cursor: 'default',
                }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseOut={e => e.currentTarget.style.background = 'var(--bg-card-2)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.name}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                        {c.district} · {c.mandal}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: RISK_COLORS[c.riskLevel] }}>
                        {c.riskScore}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      Coverage: <span style={{ color: 'var(--text-secondary)' }}>{c.screeningCoverage}%</span>
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      Enroll: <span style={{ color: 'var(--text-secondary)' }}>{c.currentEnrollment}</span>
                    </span>
                  </div>
                </div>
              ))}
              {filtered.length > 20 && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                  + {filtered.length - 20} more centres. Use filters to narrow down.
                </p>
              )}
              {filtered.length === 0 && !centreLoad && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                  No centres match current filters.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
