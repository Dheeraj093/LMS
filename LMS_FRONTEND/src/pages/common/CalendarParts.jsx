import { Box, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined'
import { parseDate } from '../../utils/format'

// Shared pieces for deadlines from GET /calendar: colors, labels, a chip for the month grid and a row for lists.
// Type decides the colored bar on the left (assignment = accent, quiz = teal);
// status decides the background (to do = amber, done = green, missed or closed = red, closed for teachers = grey).

export const TYPE_INFO = {
  ASSIGNMENT_DUE: { label: 'Assignment', icon: AssignmentOutlinedIcon, color: (t) => t.accent },
  QUIZ_DUE: { label: 'Quiz', icon: QuizOutlinedIcon, color: (t) => t.teal },
}

export const STATUS_LABEL = {
  PENDING: 'To do', OPEN: 'Open', SUBMITTED: 'Submitted', LATE: 'Submitted late', GRADED: 'Graded', DONE: 'Done',
  MISSING: 'Missing', CLOSED: 'Closed', DRAFT: 'Draft',
}

// Teachers see OPEN / CLOSED / DRAFT (with counts); students see their own progress.
export function statusTone(status, staff) {
  if (['SUBMITTED', 'LATE', 'GRADED', 'DONE'].includes(status)) return 'ok'
  if (status === 'MISSING') return 'bad'
  if (status === 'CLOSED') return staff ? 'muted' : 'bad'
  if (status === 'DRAFT') return 'muted'
  return staff ? 'accent' : 'warn' // PENDING / OPEN
}

export function toneColors(t, tone) {
  return {
    ok: [t.ok, t.okSoft], bad: [t.bad, t.badSoft], warn: [t.warn, t.warnSoft], accent: [t.accent, t.accentSoft], muted: [t.muted, t.sunk],
  }[tone]
}

// What the legend explains, per role.
export function legendItems(staff) {
  return staff
    ? [{ tone: 'accent', label: 'Open' }, { tone: 'muted', label: 'Closed or draft' }]
    : [{ tone: 'warn', label: 'To do' }, { tone: 'ok', label: 'Done' }, { tone: 'bad', label: 'Missed or closed' }]
}

export const timeOf = (value) => parseDate(value)?.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) ?? ''

// Compact chip inside a month grid cell.
export function EventChip({ event, staff, onClick }) {
  const t = useTheme().palette.lms
  const info = TYPE_INFO[event.type] || TYPE_INFO.ASSIGNMENT_DUE
  const [fg, bg] = toneColors(t, statusTone(event.status, staff))
  const tip = `${info.label}: ${event.title} · ${timeOf(event.date)} · ${STATUS_LABEL[event.status] || event.status}${event.detail ? ` · ${event.detail}` : ''}`
  return (
    <Box component="button" type="button" onClick={onClick} title={tip}
      sx={{
        all: 'unset', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', cursor: 'pointer',
        bgcolor: bg, color: t.ink, borderLeft: `3px solid ${info.color(t)}`, borderRadius: '6px', px: 0.75, py: 0.25,
        fontSize: '0.74rem', fontWeight: 600, lineHeight: 1.45, '&:hover': { filter: 'brightness(0.96)' },
        '&:focus-visible': { outline: `2px solid ${t.accent}`, outlineOffset: 1 },
      }}>
      <Box component="span" sx={{ color: fg, fontWeight: 700, flexShrink: 0 }}>{timeOf(event.date)}</Box>
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</Box>
    </Box>
  )
}

// One deadline as a list row (agenda on phones, dashboard panel).
export function DeadlineRow({ event, staff, onClick, showDate = true }) {
  const t = useTheme().palette.lms
  const info = TYPE_INFO[event.type] || TYPE_INFO.ASSIGNMENT_DUE
  const Icon = info.icon
  const [fg, bg] = toneColors(t, statusTone(event.status, staff))
  const d = parseDate(event.date)
  return (
    <Stack direction="row" alignItems="center" gap={1.5} onClick={onClick} role="link" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      sx={{ py: 1.25, px: 1, mx: -1, borderRadius: '10px', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, minWidth: 0 }}>
      {showDate ? (
        <Box sx={{ width: 44, flexShrink: 0, textAlign: 'center', borderRadius: '10px', border: `1px solid ${t.line}`, py: 0.5 }}>
          <Typography fontSize="0.65rem" fontWeight={700} color="text.disabled" textTransform="uppercase" lineHeight={1.2}>
            {d?.toLocaleDateString(undefined, { month: 'short' })}
          </Typography>
          <Typography fontSize="1.05rem" fontWeight={700} lineHeight={1.2}>{d?.getDate()}</Typography>
        </Box>
      ) : (
        <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: 'action.hover', color: info.color(t), display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon sx={{ fontSize: 19 }} />
        </Box>
      )}
      <Box flex={1} minWidth={0}>
        <Stack direction="row" alignItems="center" gap={0.75} minWidth={0}>
          {showDate && <Icon sx={{ fontSize: 16, color: info.color(t), flexShrink: 0 }} />}
          <Typography fontWeight={600} fontSize="0.9rem" noWrap>{event.title}</Typography>
        </Stack>
        <Typography fontSize="0.78rem" color="text.secondary" noWrap>
          {[info.label, event.courseTitle, timeOf(event.date), event.detail].filter(Boolean).join(' · ')}
        </Typography>
      </Box>
      <Box component="span" sx={{ flexShrink: 0, fontSize: '0.72rem', fontWeight: 700, color: fg, bgcolor: bg, borderRadius: '999px', px: 1, py: 0.25, whiteSpace: 'nowrap' }}>
        {STATUS_LABEL[event.status] || event.status}
      </Box>
    </Stack>
  )
}

// YYYY-MM-DD in local time (the backend sends local date-times, so the first 10 characters are the day).
export function dayKey(date) {
  const pad = (x) => String(x).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
