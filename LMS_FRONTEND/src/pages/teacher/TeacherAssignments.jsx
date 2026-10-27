import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Chip, IconButton, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import api, { errorMessage } from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { Async, EmptyState, LinkButton, PageHeader, StatusChip } from '../../components/ui'
import { formatDateTime, parseDate, timeAgo } from '../../utils/format'
import { SearchField, TableCard, useCourses } from './TeacherShared'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'grade', label: 'To grade' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Past due' },
]

export default function TeacherAssignments() {
  const navigate = useNavigate()
  const { notify, confirm } = useFeedback()
  const { data, loading, error, reload, setData } = useApi(() => api.get('/assignment').then((r) => r.data), [])
  const { courseName } = useCourses()
  const [counts, setCounts] = useState({}) // assignmentId -> { total, toGrade, late } or { error }
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  // Load submission counts for every assignment (one call each, in parallel).
  useEffect(() => {
    if (!data) return
    let alive = true
    data.forEach((a) => {
      api.get(`/assignment/${a.id}/submissions`)
        .then((r) => {
          const subs = r.data
          const value = { total: subs.length, toGrade: subs.filter((s) => s.status !== 'GRADED').length, late: subs.filter((s) => s.late).length }
          if (alive) setCounts((c) => ({ ...c, [a.id]: value }))
        })
        .catch(() => alive && setCounts((c) => ({ ...c, [a.id]: { error: true } })))
    })
    return () => { alive = false }
  }, [data])

  const now = Date.now()
  const isPast = (a) => (parseDate(a.dueDate)?.getTime() ?? Infinity) < now
  const list = [...(data || [])].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
  const s = search.trim().toLowerCase()
  const shown = list.filter((a) => {
    if (s && !a.title.toLowerCase().includes(s) && !courseName(a.courseId).toLowerCase().includes(s)) return false
    if (filter === 'grade') return (counts[a.id]?.toGrade || 0) > 0
    if (filter === 'open') return !isPast(a)
    if (filter === 'closed') return isPast(a)
    return true
  })
  const totalToGrade = Object.values(counts).reduce((sum, c) => sum + (c.toGrade || 0), 0)

  const remove = async (a) => {
    if (!(await confirm({ title: `Delete "${a.title}"?`, message: 'Assignments that students already submitted cannot be deleted.', confirmText: 'Delete', danger: true }))) return
    try {
      await api.delete(`/assignment/${a.id}`)
      setData((l) => l.filter((x) => x.id !== a.id))
      notify.success('Assignment deleted')
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  const newButton = <LinkButton to="/teacher/assignments/new" variant="contained" startIcon={<AddRoundedIcon />}>New assignment</LinkButton>

  return (
    <Box>
      <PageHeader
        title="Assignments and grading"
        subtitle={data ? `${data.length} assignment${data.length === 1 ? '' : 's'}${totalToGrade ? ` · ${totalToGrade} submission${totalToGrade === 1 ? '' : 's'} waiting for a grade` : ''}` : 'Create assignments and grade what students hand in.'}
        actions={newButton}
      />
      <Async loading={loading} error={error} onRetry={reload}>
        {data?.length === 0 ? (
          <TableCard>
            <EmptyState icon={AssignmentOutlinedIcon} title="No assignments yet"
              description="Create an assignment for a course or a group. Students upload files or a link, and you grade them here."
              action={newButton} />
          </TableCard>
        ) : (
          <TableCard toolbar={(
            <>
              <Stack direction="row" gap={0.75} flexWrap="wrap">
                {FILTERS.map((f) => (
                  <Chip key={f.value} label={f.value === 'grade' && totalToGrade ? `${f.label} ${totalToGrade}` : f.label}
                    onClick={() => setFilter(f.value)} color={filter === f.value ? 'primary' : 'default'} variant={filter === f.value ? 'filled' : 'outlined'} />
                ))}
              </Stack>
              <SearchField value={search} onChange={setSearch} placeholder="Search by title or course" />
            </>
          )}>
            {shown.length === 0 ? <EmptyState title="Nothing here" description="No assignments match this filter." /> : (
              <>
              {/* Phones: one compact card per assignment */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                {shown.map((a) => {
                  const c = counts[a.id]
                  const past = isPast(a)
                  return (
                    <Box key={a.id} onClick={() => navigate(`/teacher/assignments/${a.id}`)}
                      sx={{ px: 2, py: 1.75, borderBottom: 1, borderColor: 'divider', cursor: 'pointer', '&:last-child': { borderBottom: 0 } }}>
                      <Stack direction="row" justifyContent="space-between" gap={1}>
                        <Box minWidth={0}>
                          <Typography fontWeight={700} fontSize="0.93rem">{a.title}</Typography>
                          <Typography fontSize="0.8rem" color="text.secondary" noWrap>{courseName(a.courseId)} · {a.totalMarks} marks</Typography>
                        </Box>
                        <StatusChip status={a.audience || 'ALL'} />
                      </Stack>
                      <Typography fontSize="0.82rem" mt={0.75} color={past ? 'error.main' : 'text.secondary'} fontWeight={past ? 600 : 400}>
                        Due {formatDateTime(a.dueDate)}{past ? ' · closed' : ''}
                      </Typography>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" mt={0.5} onClick={(e) => e.stopPropagation()}>
                        {!c ? <Skeleton width={110} /> : c.error ? <span /> : (
                          <Stack direction="row" gap={0.75} alignItems="center">
                            <Typography fontSize="0.85rem" fontWeight={600}>{c.total} submitted</Typography>
                            {c.toGrade > 0 && <StatusChip status="PENDING" label={`${c.toGrade} to grade`} />}
                          </Stack>
                        )}
                        <Stack direction="row">
                          <IconButton size="small" aria-label="Edit" onClick={() => navigate(`/teacher/assignments/${a.id}/edit`)}><EditOutlinedIcon fontSize="small" /></IconButton>
                          <IconButton size="small" aria-label="Delete" onClick={() => remove(a)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                        </Stack>
                      </Stack>
                    </Box>
                  )
                })}
              </Box>
              <TableContainer sx={{ overflowX: 'auto', display: { xs: 'none', md: 'block' } }}>
                <Table sx={{ minWidth: 820 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Assignment</TableCell>
                      <TableCell>Due</TableCell>
                      <TableCell align="center">Marks</TableCell>
                      <TableCell>Audience</TableCell>
                      <TableCell>Submissions</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {shown.map((a) => {
                      const c = counts[a.id]
                      const past = isPast(a)
                      return (
                        <TableRow key={a.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/teacher/assignments/${a.id}`)}>
                          <TableCell sx={{ maxWidth: 320 }}>
                            <Typography fontWeight={700} fontSize="0.93rem">{a.title}</Typography>
                            <Typography fontSize="0.8rem" color="text.secondary" noWrap>{courseName(a.courseId)}</Typography>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Stack direction="row" gap={0.5} alignItems="center">
                              <EventOutlinedIcon sx={{ fontSize: 16 }} color={past ? 'error' : 'action'} />
                              <Typography fontSize="0.88rem" color={past ? 'error.main' : 'text.primary'} fontWeight={past ? 600 : 400}>{formatDateTime(a.dueDate)}</Typography>
                            </Stack>
                            <Typography fontSize="0.75rem" color="text.disabled">{past ? `Closed ${timeAgo(a.dueDate)}` : 'Open'}</Typography>
                          </TableCell>
                          <TableCell align="center"><Typography fontWeight={600}>{a.totalMarks}</Typography></TableCell>
                          <TableCell>
                            <StatusChip status={a.audience || 'ALL'} />
                            {a.audience === 'GROUPS' && <Typography fontSize="0.75rem" color="text.disabled" mt={0.25}>{a.groupIds?.length || 0} group(s)</Typography>}
                          </TableCell>
                          <TableCell>
                            {!c ? <Skeleton width={110} /> : c.error ? <Typography color="text.disabled" fontSize="0.85rem">-</Typography> : (
                              <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap">
                                <Typography fontSize="0.88rem" fontWeight={600}>{c.total} submitted</Typography>
                                {c.toGrade > 0
                                  ? <StatusChip status="PENDING" label={`${c.toGrade} to grade`} />
                                  : c.total > 0 && <StatusChip status="GRADED" label="All graded" />}
                              </Stack>
                            )}
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                            <Tooltip title="Edit"><IconButton size="small" onClick={() => navigate(`/teacher/assignments/${a.id}/edit`)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Delete"><IconButton size="small" onClick={() => remove(a)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              </>
            )}
          </TableCard>
        )}
      </Async>
    </Box>
  )
}
