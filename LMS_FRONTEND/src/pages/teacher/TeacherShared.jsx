import { useState } from 'react'
import { Box, Card, InputAdornment, Stack, TextField, Tooltip, IconButton, Typography, AvatarGroup } from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import api from '../../api/client'
import useApi from '../../components/ui/useApi'
import { UserAvatar } from '../../components/ui'
import { fonts } from '../../theme'

// Helpers shared by the teacher quiz / question / assignment / group pages.

// Loads the courses this user may manage and returns { courses, courseName(id) }.
export function useCourses() {
  const { data, loading, error } = useApi(() => api.get('/courses').then((r) => r.data), [])
  const courses = data || []
  const byId = new Map(courses.map((c) => [c.id, c]))
  return { courses, loading, error, courseName: (id) => (id ? byId.get(id)?.title || `Course #${id}` : 'No course') }
}

// Search box with an icon, used above lists.
export function SearchField({ value, onChange, placeholder = 'Search', sx }) {
  return (
    <TextField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      sx={{ maxWidth: { sm: 280 }, ...sx }}
      InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" color="action" /></InputAdornment> }}
    />
  )
}

// A card that holds a toolbar row and a table (like the admin users mockup).
export function TableCard({ toolbar, children }) {
  return (
    <Card sx={{ overflow: 'hidden' }}>
      {toolbar && (
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between"
          sx={{ px: { xs: 2, sm: 2.5 }, py: 2, borderBottom: 1, borderColor: 'divider' }}>
          {toolbar}
        </Stack>
      )}
      {children}
    </Card>
  )
}

// Copy a text to the clipboard with a small tick after copying.
export function CopyButton({ text, title = 'Copy', size = 'small' }) {
  const [done, setDone] = useState(false)
  const copy = async (e) => {
    e?.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard can be blocked (http, old browser). Fall back to a hidden textarea.
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* ignore */ }
      ta.remove()
    }
    setDone(true)
    setTimeout(() => setDone(false), 1500)
  }
  return (
    <Tooltip title={done ? 'Copied' : title}>
      <IconButton size={size} onClick={copy} aria-label={title}>
        {done ? <CheckRoundedIcon fontSize="small" color="success" /> : <ContentCopyRoundedIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  )
}

// Join code in a mono pill with a copy button.
export function JoinCode({ code }) {
  if (!code) return <Typography color="text.disabled" fontSize="0.85rem">-</Typography>
  return (
    <Stack direction="row" alignItems="center" gap={0.25}>
      <Box component="code" sx={{ fontFamily: fonts.mono, fontWeight: 700, letterSpacing: '0.06em' }}>{code}</Box>
      <CopyButton text={code} title="Copy join code" />
    </Stack>
  )
}

// Overlapping member avatars.
export function MemberAvatars({ members = [], max = 5, size = 28 }) {
  if (!members.length) return <Typography color="text.disabled" fontSize="0.85rem">No members yet</Typography>
  return (
    <AvatarGroup max={max} sx={{ justifyContent: 'flex-end', '& .MuiAvatar-root': { width: size, height: size, fontSize: size * 0.38, borderColor: 'background.paper' } }}>
      {members.map((m) => (
        <Tooltip key={m.id} title={m.name}><Box component="span"><UserAvatar name={m.name} src={m.avatarUrl} size={size} /></Box></Tooltip>
      ))}
    </AvatarGroup>
  )
}

// Small label + value used in summary strips.
export function MiniStat({ label, value, tone }) {
  return (
    <Box>
      <Typography fontSize="0.75rem" fontWeight={700} color="text.disabled" textTransform="uppercase" letterSpacing="0.06em">{label}</Typography>
      <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, fontSize: '1.4rem', color: tone }}>{value}</Typography>
    </Box>
  )
}

// Makes a random join code of 6 letters/digits (no 0/O/1/I to avoid confusion).
export function randomJoinCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < length; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

// Sticky-ish action bar at the bottom of long forms.
export function FormActions({ children }) {
  return (
    <Stack direction="row" gap={1} justifyContent="flex-end" flexWrap="wrap" mt={3}>
      {children}
    </Stack>
  )
}

// The body PUT /quiz/{id} needs, built from a quiz we already have (used to unpublish).
export function quizToRequest(q, patch = {}) {
  return {
    title: q.title, description: q.description, passingMarks: q.passingMarks ?? 0, published: q.published,
    timeLimitInMinutes: q.timeLimitInMinutes, questionsIdList: q.questionIds || [], courseId: q.courseId,
    maxAttempts: q.maxAttempts, audience: q.audience || 'ALL', groupIds: q.groupIds || [], joinCode: q.joinCode || null,
    ...patch,
  }
}
