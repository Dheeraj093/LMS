import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Card, Divider, IconButton, Stack, Tooltip, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined'
import api from '../../api/client'
import useApi from '../../components/ui/useApi'
import { Async, EmptyState, PageHeader } from '../../components/ui'
import { useAuth, ROLE } from '../../auth/AuthContext'
import { fonts } from '../../theme'
import { DeadlineRow, EventChip, TYPE_INFO, dayKey, legendItems, toneColors } from './CalendarParts'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_IN_CELL = 3

// The 6 weeks (Monday first) that cover the month, so the grid always has the same height.
function gridDays(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7))
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

// Assignment and quiz deadlines. Month grid on desktop, agenda list on phones.
export default function CalendarPage() {
  const { user } = useAuth()
  const staff = user?.role === ROLE.TEACHER || user?.role === ROLE.ADMIN
  const navigate = useNavigate()
  const theme = useTheme()
  const t = theme.palette.lms
  const phone = useMediaQuery(theme.breakpoints.down('md'))
  const today = new Date()
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(null) // day key whose "+N more" was opened

  const days = useMemo(() => gridDays(month), [month])
  const from = dayKey(days[0])
  const to = dayKey(days[days.length - 1])
  const { data, loading, error, reload } = useApi(() => api.get('/calendar', { params: { from, to } }).then((r) => r.data), [from, to])

  const byDay = useMemo(() => {
    const map = {}
    ;(data || []).forEach((e) => { (map[String(e.date).slice(0, 10)] ||= []).push(e) })
    return map
  }, [data])

  const todayKey = dayKey(today)
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const move = (n) => { setSelected(null); setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1)) }
  const goToday = () => { setSelected(null); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)) }
  const open = (e) => e.link && navigate(e.link)

  // Agenda (phones): only days of this month that have deadlines.
  const monthPrefix = dayKey(month).slice(0, 7)
  const agendaDays = Object.keys(byDay).filter((k) => k.startsWith(monthPrefix)).sort()
  const monthCount = agendaDays.reduce((n, k) => n + byDay[k].length, 0)

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle={staff ? 'Due dates of your assignments and quizzes, with how many students submitted.' : 'Your assignment due dates and quiz closing times.'}
      />
      <Card sx={{ mb: 2.5 }}>
        <Stack direction="row" alignItems="center" gap={1} px={{ xs: 1.5, sm: 2 }} py={1.25} flexWrap="wrap">
          <Tooltip title="Previous month"><IconButton aria-label="Previous month" onClick={() => move(-1)}><ChevronLeftRoundedIcon /></IconButton></Tooltip>
          <Tooltip title="Next month"><IconButton aria-label="Next month" onClick={() => move(1)}><ChevronRightRoundedIcon /></IconButton></Tooltip>
          <Typography variant="h3" component="h2" sx={{ flex: 1, minWidth: 140, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>{monthLabel}</Typography>
          <Button variant="outlined" size="small" onClick={goToday}>Today</Button>
        </Stack>
        <Divider />
        <Legend staff={staff} />
      </Card>

      <Async loading={loading && !data} error={error} onRetry={reload}>
        {data && (phone ? (
          <Card>
            {monthCount === 0 ? (
              <EmptyState icon={EventAvailableOutlinedIcon} title={`No deadlines in ${monthLabel}`}
                description="Assignment due dates and quiz closing times show up here." />
            ) : (
              <Box px={2} py={1}>
                {agendaDays.map((k, i) => {
                  const d = new Date(`${k}T00:00:00`)
                  return (
                    <Box key={k}>
                      {i > 0 && <Divider sx={{ my: 0.5 }} />}
                      <Stack direction="row" alignItems="center" gap={1} pt={1.25} pb={0.25}>
                        <Typography fontWeight={700} fontSize="0.85rem" color={k === todayKey ? 'primary' : 'text.primary'}>
                          {d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
                        </Typography>
                        {k === todayKey && <Box component="span" sx={{ fontSize: '0.7rem', fontWeight: 700, color: t.accent, bgcolor: t.accentSoft, borderRadius: '999px', px: 1 }}>Today</Box>}
                      </Stack>
                      {byDay[k].map((e) => <DeadlineRow key={`${e.type}-${e.id}`} event={e} staff={staff} showDate={false} onClick={() => open(e)} />)}
                    </Box>
                  )
                })}
              </Box>
            )}
          </Card>
        ) : (
          <Card sx={{ overflow: 'hidden', opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: `1px solid ${t.line}`, bgcolor: t.sunk }}>
              {WEEKDAYS.map((w) => (
                <Typography key={w} textAlign="center" py={1} fontSize="0.72rem" fontWeight={700} color="text.disabled" letterSpacing="0.06em" textTransform="uppercase">{w}</Typography>
              ))}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
              {days.map((d, i) => {
                const k = dayKey(d)
                const events = byDay[k] || []
                const inMonth = d.getMonth() === month.getMonth()
                const isToday = k === todayKey
                const expanded = selected === k
                const visible = expanded ? events : events.slice(0, MAX_IN_CELL)
                return (
                  <Box key={k}
                    sx={{
                      minHeight: 118, p: 0.75, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5,
                      borderRight: (i % 7) < 6 ? `1px solid ${t.line}` : 'none', borderBottom: i < 35 ? `1px solid ${t.line}` : 'none',
                      bgcolor: isToday ? t.accentSoft : inMonth ? 'transparent' : t.sunk,
                    }}>
                    <Box sx={{ alignSelf: 'flex-start', minWidth: 26, height: 26, px: 0.5, borderRadius: '999px', display: 'grid', placeItems: 'center',
                      bgcolor: isToday ? t.accent : 'transparent', color: isToday ? '#fff' : inMonth ? 'text.primary' : 'text.disabled',
                      fontFamily: fonts.display, fontWeight: 600, fontSize: '0.85rem' }}>
                      {d.getDate()}
                    </Box>
                    {visible.map((e) => <EventChip key={`${e.type}-${e.id}`} event={e} staff={staff} onClick={() => open(e)} />)}
                    {events.length > MAX_IN_CELL && (
                      <Box component="button" type="button" onClick={() => setSelected(expanded ? null : k)}
                        sx={{ all: 'unset', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: t.accent, px: 0.75, '&:hover': { textDecoration: 'underline' } }}>
                        {expanded ? 'Show less' : `+${events.length - MAX_IN_CELL} more`}
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Box>
            {(data || []).length === 0 && (
              <Typography textAlign="center" color="text.disabled" fontSize="0.88rem" py={1.5} borderTop={`1px solid ${t.line}`}>
                No deadlines in these weeks.
              </Typography>
            )}
          </Card>
        ))}
      </Async>
    </>
  )
}

// Explains the colors: bar on the left = type, background = status.
function Legend({ staff }) {
  const t = useTheme().palette.lms
  return (
    <Stack direction="row" gap={{ xs: 1.5, sm: 2.5 }} flexWrap="wrap" px={{ xs: 2, sm: 2.5 }} py={1.25}>
      {Object.entries(TYPE_INFO).map(([type, info]) => (
        <Stack key={type} direction="row" alignItems="center" gap={0.75}>
          <Box sx={{ width: 4, height: 16, borderRadius: '2px', bgcolor: info.color(t) }} />
          <Typography fontSize="0.8rem" fontWeight={600}>{info.label}</Typography>
        </Stack>
      ))}
      <Box sx={{ width: '1px', bgcolor: t.line, display: { xs: 'none', sm: 'block' } }} />
      {legendItems(staff).map((l) => {
        const [fg, bg] = toneColors(t, l.tone)
        return (
          <Stack key={l.label} direction="row" alignItems="center" gap={0.75}>
            <Box sx={{ width: 14, height: 14, borderRadius: '4px', bgcolor: bg, border: `1.5px solid ${fg}` }} />
            <Typography fontSize="0.8rem" color="text.secondary">{l.label}</Typography>
          </Stack>
        )
      })}
    </Stack>
  )
}
