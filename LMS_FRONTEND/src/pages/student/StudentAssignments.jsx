import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Card, CardActionArea, Stack, Tab, Tabs, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import api from '../../api/client'
import useApi from '../../components/ui/useApi'
import { PageHeader, EmptyState, Async, StatusChip, IconBadge } from '../../components/ui'
import { formatDateTime } from '../../utils/format'
import { fonts } from '../../theme'
import { dueInfo } from './studentShared'

const TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'To do' },
  { value: 'MISSING', label: 'Missing' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'GRADED', label: 'Graded' },
]

// Which tab a status belongs to (late submissions are listed with "Submitted").
const tabOf = (s) => (s === 'LATE' ? 'SUBMITTED' : s)

export default function StudentAssignments() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('ALL')
  const { data, loading, error, reload } = useApi(() => api.get('/assignment/my').then((r) => r.data), [])

  // To-do first (closest due date first), then the rest.
  const order = { PENDING: 0, MISSING: 1, SUBMITTED: 2, LATE: 2, GRADED: 3 }
  const all = [...(data || [])].sort((a, b) => (order[a.status] - order[b.status]) || String(a.dueDate).localeCompare(String(b.dueDate)))
  const list = tab === 'ALL' ? all : all.filter((a) => tabOf(a.status) === tab)
  const count = (v) => (v === 'ALL' ? all.length : all.filter((a) => tabOf(a.status) === v).length)

  return (
    <>
      <PageHeader title="Assignments" subtitle="Hand in your work and see your grades" />
      <Async loading={loading} error={error} onRetry={reload}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          {TABS.map((x) => <Tab key={x.value} value={x.value} label={`${x.label} (${count(x.value)})`} />)}
        </Tabs>
        {list.length === 0 ? (
          <Card>
            <EmptyState icon={AssignmentOutlinedIcon}
              title={all.length ? 'Nothing here' : 'No assignments yet'}
              description={all.length ? 'No assignments with this status.' : 'Assignments from your courses will show up here.'} />
          </Card>
        ) : (
          <Stack gap={1.5}>
            {list.map((a) => <AssignmentRow key={a.id} a={a} onOpen={() => navigate(`/student/assignments/${a.id}`)} />)}
          </Stack>
        )}
      </Async>
    </>
  )
}

function AssignmentRow({ a, onOpen }) {
  const t = useTheme().palette.lms
  const due = dueInfo(a.dueDate)
  const showDue = a.status === 'PENDING' || a.status === 'MISSING'
  const dueColor = { bad: t.bad, warn: t.warn, muted: t.muted }[due.tone]
  const tone = { PENDING: 'accent', MISSING: 'bad', SUBMITTED: 'accent', LATE: 'warn', GRADED: 'ok' }[a.status] || 'muted'

  return (
    <Card>
      <CardActionArea onClick={onOpen} sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction="row" alignItems="center" gap={2}>
          <Box display={{ xs: 'none', sm: 'block' }}><IconBadge icon={AssignmentOutlinedIcon} tone={tone} size={42} /></Box>
          <Box flex={1} minWidth={0}>
            <Typography variant="overline" color="text.disabled" noWrap display="block">{a.courseTitle}</Typography>
            <Typography variant="h5" sx={{ wordBreak: 'break-word' }}>{a.title}</Typography>
            <Stack direction="row" alignItems="center" gap={1.5} mt={0.75} flexWrap="wrap">
              <Stack direction="row" alignItems="center" gap={0.5} color="text.secondary">
                <EventOutlinedIcon sx={{ fontSize: 16 }} />
                <Typography fontSize="0.82rem">{a.dueDate ? `Due ${formatDateTime(a.dueDate)}` : 'No due date'}</Typography>
              </Stack>
              {showDue && a.dueDate && <Typography fontSize="0.82rem" fontWeight={700} color={dueColor}>{due.text}</Typography>}
              {!showDue && a.submittedAt && <Typography fontSize="0.82rem" color="text.disabled">Submitted {formatDateTime(a.submittedAt)}</Typography>}
            </Stack>
          </Box>
          <Stack alignItems="flex-end" gap={0.75} flexShrink={0}>
            <StatusChip status={a.status} label={a.status === 'PENDING' ? 'To do' : undefined} />
            {a.status === 'GRADED' && (
              <Typography fontFamily={fonts.mono} fontWeight={700} fontSize="0.95rem">{a.marks}<Typography component="span" color="text.disabled" fontSize="0.8rem">/{a.totalMarks}</Typography></Typography>
            )}
            {a.status !== 'GRADED' && a.totalMarks != null && <Typography fontSize="0.78rem" color="text.disabled">{a.totalMarks} marks</Typography>}
          </Stack>
          <ChevronRightRoundedIcon sx={{ color: 'text.disabled', display: { xs: 'none', sm: 'block' } }} />
        </Stack>
      </CardActionArea>
    </Card>
  )
}
