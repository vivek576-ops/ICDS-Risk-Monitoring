import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import ScreeningDashboard from './pages/ScreeningDashboard'
import RiskDashboard from './pages/RiskDashboard'
import ReferralDashboard from './pages/ReferralDashboard'
import GeoMapDashboard from './pages/GeoAnalyticsDashboard'
import WorkforceDashboard from './pages/WorkforceDashboard'
import NotFound from './pages/NotFound'

// Protected route wrapper
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/screening" replace />
  }

  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/screening" replace /> : <LoginPage />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/screening" replace />} />
        <Route path="screening" element={
          <ProtectedRoute roles={['admin', 'cdpo', 'supervisor']}>
            <ScreeningDashboard />
          </ProtectedRoute>
        } />
        <Route path="risk" element={
          <ProtectedRoute roles={['admin', 'cdpo', 'supervisor']}>
            <RiskDashboard />
          </ProtectedRoute>
        } />
        <Route path="referrals" element={
          <ProtectedRoute roles={['admin', 'cdpo', 'supervisor', 'aww']}>
            <ReferralDashboard />
          </ProtectedRoute>
        } />
        <Route path="geo" element={
          <ProtectedRoute roles={['admin', 'cdpo', 'supervisor']}>
            <GeoMapDashboard />
          </ProtectedRoute>
        } />
        <Route path="workforce" element={
          <ProtectedRoute roles={['admin', 'cdpo']}>
            <WorkforceDashboard />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
