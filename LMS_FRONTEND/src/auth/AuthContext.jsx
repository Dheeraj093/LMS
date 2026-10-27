import { createContext, useContext, useMemo, useState, useCallback } from 'react'
import api, { storage } from '../api/client'

const AuthContext = createContext(null)

export const ROLE = { ADMIN: 'ADMIN', TEACHER: 'TEACHER', STUDENT: 'STUDENT' }

// Role ids in the database: 1 admin, 2 teacher, 3 student.
const ROLE_BY_ID = { 1: ROLE.ADMIN, 2: ROLE.TEACHER, 3: ROLE.STUDENT }

export function normalizeRole(roleName, roleId) {
  if (roleName) {
    const r = String(roleName).toUpperCase().replace(/^ROLE_/, '')
    if (ROLE[r]) return r
  }
  return ROLE_BY_ID[roleId] || ROLE.STUDENT
}

export function homeFor(role) {
  if (role === ROLE.ADMIN) return '/admin'
  if (role === ROLE.TEACHER) return '/teacher'
  return '/student'
}

function toUser(data) {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: normalizeRole(data.roleName, data.role ?? data.roleId),
    status: data.status,
    avatarUrl: data.avatarUrl,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (storage.getToken() ? storage.getUser() : null))

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const u = toUser(res.data)
    storage.save(res.data.token, u)
    storage.setTokens(null, res.data.refreshToken)
    setUser(u)
    return u
  }, [])

  // No token comes back when the email must be confirmed first (verify: true)
  // or when a teacher waits for admin approval.
  const register = useCallback(async (form) => {
    const res = await api.post('/auth/register', form)
    if (res.data.token) {
      const u = toUser(res.data)
      storage.save(res.data.token, u)
      storage.setTokens(null, res.data.refreshToken)
      setUser(u)
      return { user: u, pending: false }
    }
    return { user: null, pending: true, verify: res.data.emailVerified === false, message: res.data.message, email: res.data.email }
  }, [])

  // Tells the backend to cancel this device's refresh token, then forgets everything locally.
  const logout = useCallback(() => {
    const refreshToken = storage.getRefreshToken()
    if (refreshToken) api.post('/auth/logout', { refreshToken }).catch(() => {})
    storage.clear()
    setUser(null)
  }, [])

  // After profile changes or a password change (which returns a new token and refresh token).
  const refresh = useCallback((data, token) => {
    const u = toUser({ ...user, ...data, roleName: data.roleName || user?.role })
    storage.save(token || storage.getToken(), u)
    if (data.refreshToken) storage.setTokens(null, data.refreshToken)
    setUser(u)
  }, [user])

  const value = useMemo(() => ({ user, login, register, logout, refresh }), [user, login, register, logout, refresh])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
