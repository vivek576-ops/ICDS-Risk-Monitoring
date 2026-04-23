import { useState, useEffect, useRef } from 'react'
import { MapPin, BarChart2, RefreshCw, Layers } from 'lucide-react'
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
const RISK_RADIUS = { low: 8, moderate: 10, high: 13, critical: 16 }

// ── Leaflet map rendered imperatively (avoids SSR issues) ──
function LeafletMap({ centres, filter }) {
  const mapRef     = useRef(null)
  const mapObjRef  = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    // Dynamically load leaflet
    const L = window.L
    if (!L || !mapRef.current) return

    // Init map once
    if (!mapObjRef.current) {
      mapObjRef.current = L.map(mapRef.current, {
        center: [15.9, 79.7],
        zoom: 7,
        zoomControl: true,
        attributionControl: false,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoDB',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(mapObjRef.current)
    }

    // Clear existing markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Add new markers
    const filtered = filter
      ? centres.filter(c => c.riskLevel === filter)
      : centres

    filtered.forEach(centre => {
      const lat = parseFloat(centre.latitude)
      const lng = parseFloat(centre.longitude)
      if (isNaN(lat) || isNaN(lng)) return

      const color  = RISK_COLORS[centre.riskLevel]  || '#8b949e'
      const radius = RISK_RADIUS[centre.riskLevel]   || 8

      const marker = L.circleMarker([lat, lng], {
        radius,
        fillColor: color,
        color: color,
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.55,
      })

      marker.bindPopup(`
        <div style="font-family: 'DM Sans', sans-serif; min-width: 180px;">
          <div style="font-weight: 700; font-size: 13px; color: #e6edf3; margin-bottom: 6px;">
            ${centre.name}
          </div>
          <div style="font-size: 11px; color: #8b949e; margin-bottom: 8px;">
            ${centre.mandal}, ${centre.district}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <div style="background: ${color}18; border-radius: 6px; padding: 6px; text-align: center;">
              <div style="font-size: 10px; color: #8b949e; text-transform: uppercase;">Risk</div>
              <div style="font-size: 12px; font-weight: 700; color: ${color}; text-transform: capitalize;">${centre.riskLevel}</div>
            </div>
            <div style="background: #30363d30; border-radius: 6px; padding: 6px; text-align: center;">
              <div style="font-size: 10px; color: #8b949e; text-transform: uppercase;">Coverage</div>
              <div style="font-size: 12px; font-weight: 700; color: #e6edf3;">${parseFloat(centre.screeningCoverage || 0).toFixed(1)}%</div>
            </div>
            <div style="background: #30363d30; border-radius: 6px; padding: 6px; text-align: center;">
              <div style="font-size: 10px; color: #8b949e; text-transform: uppercase;">Risk Score</div>
              <div style="font-size: 12px; font-weight: 700; color: #e6edf3;">${parseFloat(centre.riskScore || 0).toFixed(1)}</div>
            </div>
            <div style="background: #30363d30; border-radius: 6px; padding: 6px; text-align: center;">
              <div style="font-size: 10px; color: #8b949e; text-transform: uppercase;">Enrolled</div>
              <div style="font-size: 12px; font-weight: 700; color: #e6edf3;">${centre.currentEnrollment || 0}</div>
            </div>
          </div>
          <div style="font-size: 10px; color: #484f58; margin-top: 6px; font-family: 'DM Mono', monospace;">${centre.centreCode}</div>
        </div>
      `, {
        maxWidth: 220,
        className: 'icds-popup',
      })

      marker.addTo(mapObjRef.current)
      markersRef.current.push(marker)
    })

  }, [centres, filter])

  return (
    <>
      <style>{`
        .leaflet-popup-content-wrapper {
          background: #161b22 !important;
          border: 1px solid #30363d !important;
          border-radius: 10px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
          color: #e6edf3 !important;
        }
        .leaflet-popup-tip { background: #161b22 !important; }
        .leaflet-popup-close-button { color: #8b949e !important; }
        .leaflet-control-zoom a {
          background: #161b22 !important;
          color: #e6edf3 !important;
          border-color: #30363d !important;
        }
        .leaflet-control-zoom a:hover { background: #21262d !important; }
      `}</style>
      <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-lg)' }} />
    </>
  )
}

export default function GeoAnalyticsDashboard() {
  const [riskFilter,    setRiskFilter]    = useState('')
  const [districtFilter, setDistrictFilter] = useState('')

  const { data: centres,  loading: centresLoad,  refetch } = useFetch('/dashboard/geo/centres',
    { ...(riskFilter ? { riskLevel: riskFilter } : {}), ...(districtFilter ? { district: districtFilter } : {}) }
  )
  const { data: distRisk, loading: distRiskLoad } = useFetch('/dashboard/geo/district-risk')

  const centreList = Array.isArray(centres)  ? centres  : []
  const distData   = Array.isArray(distRisk) ? distRisk : []

  // Count by risk level
  const riskCounts = centreList.reduce((acc, c) => {
    acc[c.riskLevel] = (acc[c.riskLevel] || 0) + 1
    return acc
  }, {})

  const leafletLoaded = typeof window !== 'undefined' && window.L

  return (
    <div className="fade-in">
      {/* Load Leaflet script */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        onLoad={() => {}}
      />

      <PageHeader
        title="Geo-Analytic Risk Map"
        subtitle="District / Mandal / Village-level AWC risk heatmap — Andhra Pradesh"
        icon={MapPin}
        color="#a371f7"
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)} style={{ fontSize: 12, minWidth: 150 }}>
            <option value="">All Districts</option>
            {['Visakhapatnam','Guntur','Krishna','Nellore','Kurnool','Eluru','Kakinada','Anantapur','Prakasam','Kadapa','Vizianagaram','Srikakulam','Chittoor'].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} style={{ fontSize: 12 }}>
            <option value="">All Risk Levels</option>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button className="btn btn-ghost" onClick={refetch} style={{ padding: '8px 10px' }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </PageHeader>

      {/* ── Risk Level Summary ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {['low','moderate','high','critical'].map(level => {
          const count = riskCounts[level] || 0
          const color = RISK_COLORS[level]
          return (
            <button
              key={level}
              onClick={() => setRiskFilter(riskFilter === level ? '' : level)}
              style={{
                background: riskFilter === level ? color + '22' : 'var(--bg-card)',
                border: `1px solid ${riskFilter === level ? color + '66' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)', padding: '12px 16px',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                  {level}
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                {centresLoad ? '—' : count}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-body)' }}>AWCs</div>
            </button>
          )
        })}
      </div>

      {/* ── Map + Chart ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>

        {/* Map */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 480 }}>
          {centresLoad ? (
            <div style={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <div className="spinner" />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading {centreList.length} AWC markers…</span>
            </div>
          ) : (
            <MapWrapper centres={centreList} filter={riskFilter} />
          )}
        </div>

        {/* District risk bar chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Top High-Risk Districts</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Average risk score (0–100)</p>
          </div>
          {distRiskLoad ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={distData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis type="category" dataKey="district" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} width={90} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="riskScore" name="Risk Score" radius={[0, 4, 4, 0]}>
                  {distData.map((entry, i) => (
                    <Cell key={i} fill={
                      entry.riskScore >= 75 ? '#a371f7' :
                      entry.riskScore >= 60 ? '#f85149' :
                      entry.riskScore >= 45 ? '#f0a03a' : '#3fb950'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>MAP LEGEND</span>
          </div>
          {Object.entries(RISK_COLORS).map(([level, color]) => (
            <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: RISK_RADIUS[level] * 1.5, height: RISK_RADIUS[level] * 1.5,
                borderRadius: '50%', background: color, opacity: 0.8,
              }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                {level} risk
              </span>
            </div>
          ))}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {centreList.length} centres shown · Click marker for details · Scroll to zoom
          </span>
        </div>
      </div>
    </div>
  )
}

// Wrapper that dynamically loads Leaflet script then renders the map
function MapWrapper({ centres, filter }) {
  const [ready, setReady] = useState(!!window.L)

  useEffect(() => {
    if (window.L) { setReady(true); return }
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setReady(true)
    document.head.appendChild(script)
  }, [])

  if (!ready) return (
    <div style={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  return <div style={{ height: 480 }}><LeafletMap centres={centres} filter={filter} /></div>
}
