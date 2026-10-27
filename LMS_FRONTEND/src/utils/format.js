// Small helpers for showing dates, times and numbers.

export function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  // Backend sends LocalDateTime without a zone ("2026-10-11T14:03:00"); treat it as local time.
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const d = parseDate(value)
  return d ? d.toLocaleDateString(undefined, opts) : '-'
}

export function formatDateTime(value) {
  const d = parseDate(value)
  return d ? d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
}

export function shortDate(value) {
  return formatDate(value, { day: 'numeric', month: 'short' })
}

export function timeAgo(value) {
  const d = parseDate(value)
  if (!d) return 'Never'
  const s = Math.round((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'Just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const days = Math.round(h / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return formatDate(d)
}

export function hours(minutes) {
  const h = (minutes || 0) / 60
  return h >= 10 ? `${Math.round(h)}h` : `${h.toFixed(1)}h`
}

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?'
}

export function number(n) {
  return (n ?? 0).toLocaleString()
}

export function pct(n, digits = 0) {
  return `${Number(n || 0).toFixed(digits)}%`
}

export function fileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// For <input type="datetime-local"> (no seconds, local time).
export function toInputDateTime(value) {
  const d = parseDate(value)
  if (!d) return ''
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Back to the LocalDateTime format the backend reads.
export function fromInputDateTime(value) {
  return value ? (value.length === 16 ? value + ':00' : value) : null
}
