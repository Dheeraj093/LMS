import { homeFor, ROLE } from '../../auth/AuthContext'

// Notification links from the backend, mapped to pages of this app.
export function resolveLink(link, role) {
  if (!link) return homeFor(role)
  if (link === '/dashboard') return homeFor(role)
  let m = link.match(/^\/courses\/(\d+)$/)
  if (m) return role === ROLE.STUDENT ? `/catalog/${m[1]}` : `/teacher/courses/${m[1]}`
  m = link.match(/^\/assignments\/(\d+)\/submissions$/)
  if (m) return `/teacher/assignments/${m[1]}`
  return link
}
