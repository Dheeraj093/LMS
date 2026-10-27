import axios from 'axios'

// Backend address. Set VITE_API_URL in a .env file to change it.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

const TOKEN_KEY = 'lms.token'
const REFRESH_KEY = 'lms.refresh'
const USER_KEY = 'lms.user'

export const storage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (token, refreshToken) => {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
  },
  getUser: () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
  },
  save: (token, user) => {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
  },
}

const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  const token = storage.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// The access token lives only 30 minutes. When a call answers 401, ask for a new one with the
// refresh token (once, shared by all calls that failed at the same time) and repeat the call.
// If that also fails (logged out elsewhere, password changed, account blocked), go to the login page.
let refreshing = null

export function refreshAccessToken() {
  const refreshToken = storage.getRefreshToken()
  if (!refreshToken) return Promise.reject(new Error('No refresh token'))
  if (!refreshing) {
    refreshing = axios.post(`${API_URL}/auth/refresh`, { refreshToken })
      .then((res) => {
        storage.setTokens(res.data.token, res.data.refreshToken)
        return res.data.token
      })
      .finally(() => { refreshing = null })
  }
  return refreshing
}

const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/register', '/auth/change-password']

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config || {}
    const url = config.url || ''
    if (error.response?.status === 401 && storage.getToken() && !NO_REFRESH.some((p) => url.includes(p))) {
      if (!config._retried && storage.getRefreshToken()) {
        try {
          const token = await refreshAccessToken()
          config._retried = true
          config.headers = { ...config.headers, Authorization: `Bearer ${token}` }
          return api(config)
        } catch {
          // fall through to logout
        }
      }
      storage.clear()
      window.location.assign('/login?expired=1')
    }
    return Promise.reject(error)
  },
)

// ws://.../ws/notifications?token=... for live notifications.
export function notificationSocketUrl() {
  return `${API_URL.replace(/^http/, 'ws')}/ws/notifications?token=${encodeURIComponent(storage.getToken() || '')}`
}

// The message to show for a failed request. The backend sends { message, errors }.
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors)[0]
    if (first) return `${data.message ? data.message + ': ' : ''}${first}`
  }
  if (data?.message) return data.message
  if (error?.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running?'
  return fallback
}

export function fieldErrors(error) {
  return error?.response?.data?.errors || {}
}

// File links from the backend are relative ("/files/5/content?token=...").
export function fileUrl(url) {
  if (!url) return null
  if (/^https?:\/\//.test(url)) return url
  return API_URL + (url.startsWith('/') ? url : '/' + url)
}

// Upload one file. purpose: COURSE_THUMBNAIL, AVATAR, LESSON_VIDEO, LESSON_PDF, ASSIGNMENT_FILE
export async function uploadFile(file, purpose, onProgress) {
  const form = new FormData()
  form.append('file', file)
  form.append('purpose', purpose)
  const res = await api.post('/files', form, {
    onUploadProgress: (e) => onProgress && e.total && onProgress(Math.round((e.loaded * 100) / e.total)),
  })
  return res.data
}

// Download a report (Excel or PDF) from the backend and save it. The token goes in the header, so a plain link would not work.
export async function downloadFile(path, fallbackName, params) {
  let res
  try {
    res = await api.get(path, { params, responseType: 'blob' })
  } catch (error) {
    // Errors also arrive as a blob here; turn them back into JSON so errorMessage() can read them.
    const data = error.response?.data
    if (data instanceof Blob) {
      try { error.response.data = JSON.parse(await data.text()) } catch { /* keep the blob */ }
    }
    throw error
  }
  const header = res.headers['content-disposition'] || ''
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(header)
  const name = match ? decodeURIComponent(match[1] || match[2]) : fallbackName
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return name
}

export default api
