import { Suspense } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, homeFor } from './AuthContext'
import AppShell from '../components/layout/AppShell'
import { Loading } from '../components/ui'

// Logged-in pages. roles = which roles may open them; others go to their own home page.
export function RequireRole({ roles, bare = false }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />
  return bare ? <Outlet /> : <AppShell><Suspense fallback={<Loading />}><Outlet /></Suspense></AppShell>
}

// Login / register pages: a logged-in user goes straight to their home page.
export function GuestOnly({ children }) {
  const { user } = useAuth()
  return user ? <Navigate to={homeFor(user.role)} replace /> : children
}
