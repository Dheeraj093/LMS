import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, InputAdornment,
  Link, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import api, { errorMessage, fieldErrors, fileUrl } from '../../api/client'
import DownloadButton from '../../components/ui/DownloadButton'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { Async, EmptyState, LinkButton, PageHeader, StatusChip, UserAvatar } from '../../components/ui'
import { fileSize, formatDateTime, parseDate } from '../../utils/format'
import { fonts } from '../../theme'
import { MiniStat, SearchField, TableCard, useCourses } from './TeacherShared'

// The link a student typed may lack "https://".
const asHref = (link) => (/^https?:\/\//i.test(link) ? link : `https://${link}`)

function GradeDialog({ submission, assignment, onClose, onSaved }) {
  const { notify } = useFeedback()
  const [marks, setMarks] = useState(submission.marks ?? '')
  const [feedback, setFeedback] = useState(submission.feedback || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({})
  const max = assignment.totalMarks
  const marksNum = marks === '' ? null : Number(marks)
  const invalid = marksNum === null || Number.isNaN(marksNum) || marksNum < 0 || marksNum > max || !Number.isInteger(marksNum)

  const save = async () => {
    setError('')
    setFields({})
    if (invalid) return setError(`Marks must be a whole number from 0 to ${max}`)
    setSaving(true)
    try {
      const res = await api.put(`/submissions/${submission.id}/grade`, { marks: marksNum, feedback: feedback.trim() || null })
      notify.success(`Graded ${submission.studentName}`)
      onSaved(res.data)
    } catch (e) {
      setError(errorMessage(e))
      setFields(fieldErrors(e))
    } finally {
      setSaving(false)
    }
  }

  const files = submission.files || []
  return (
    <Dialog open onClose={() => !saving && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" gap={1.5} alignItems="center">
          <UserAvatar name={submission.studentName} size={40} />
          <Box minWidth={0}>
            <Typography variant="h4" component="div">{submission.studentName}</Typography>
            <Typography fontSize="0.82rem" color="text.secondary">Submitted {formatDateTime(submission.submittedAt)}{submission.late ? ' · late' : ''}</Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack gap={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <Box>
            <Typography fontWeight={700} fontSize="0.85rem" mb={1}>Handed in</Typography>
            <Stack gap={1}>
              {submission.filePath && (
                <Stack direction="row" gap={1} alignItems="center" sx={{ border: 1, borderColor: 'divider', borderRadius: '10px', px: 1.5, py: 1 }}>
                  <LinkRoundedIcon color="primary" fontSize="small" />
                  <Link href={asHref(submission.filePath)} target="_blank" rel="noopener noreferrer" fontWeight={600} fontSize="0.9rem" noWrap sx={{ flex: 1, minWidth: 0 }}>
                    {submission.filePath}
                  </Link>
                  <OpenInNewRoundedIcon fontSize="small" color="action" />
                </Stack>
              )}
              {files.map((f) => (
                <Stack key={f.id} direction="row" gap={1} alignItems="center" component="a" href={fileUrl(f.url)} target="_blank" rel="noopener noreferrer"
                  sx={{ border: 1, borderColor: 'divider', borderRadius: '10px', px: 1.5, py: 1, color: 'inherit', textDecoration: 'none', '&:hover': { bgcolor: 'action.hover' } }}>
                  <InsertDriveFileOutlinedIcon color="primary" fontSize="small" />
                  <Typography fontWeight={600} fontSize="0.9rem" noWrap flex={1} minWidth={0}>{f.originalName}</Typography>
                  <Typography fontSize="0.78rem" color="text.secondary" flexShrink={0}>{fileSize(f.sizeBytes)}</Typography>
                  <OpenInNewRoundedIcon fontSize="small" color="action" />
                </Stack>
              ))}
              {!submission.filePath && files.length === 0 && <Typography color="text.disabled" fontSize="0.9rem">Nothing attached.</Typography>}
            </Stack>
          </Box>
          <Divider />
          <TextField label="Marks" type="number" value={marks} onChange={(e) => setMarks(e.target.value)} autoFocus
            inputProps={{ min: 0, max, step: 1 }} sx={{ maxWidth: 200 }}
            error={(marks !== '' && invalid) || !!fields.marks} helperText={fields.marks || `0 to ${max}`}
            InputProps={{ endAdornment: <InputAdornment position="end">/ {max}</InputAdornment> }} />
          <TextField label="Feedback" multiline minRows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)}
            placeholder="What went well, what to improve" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving...' : submission.status === 'GRADED' ? 'Update grade' : 'Save grade'}</Button>
      </DialogActions>
    </Dialog>
  )
}

export default function AssignmentSubmissions() {
  const { id } = useParams()
  const { data, loading, error, reload, setData } = useApi(async () => {
    const [assignment, submissions, missing] = await Promise.all([
      api.get(`/assignment/${id}`).then((r) => r.data),
      api.get(`/assignment/${id}/submissions`).then((r) => r.data),
      api.get(`/assignment/${id}/missing`).then((r) => r.data),
    ])
    return { assignment, submissions, missing }
  }, [id])
  const { courseName } = useCourses()
  const [grading, setGrading] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const assignment = data?.assignment
  const subs = useMemo(() => {
    const list = [...(data?.submissions || [])]
    // Ungraded first, then newest.
    return list.sort((a, b) => (a.status === 'GRADED') - (b.status === 'GRADED') || (b.submittedAt || '').localeCompare(a.submittedAt || ''))
  }, [data])

  const missing = data?.missing || []
  const graded = subs.filter((s) => s.status === 'GRADED')
  const toGrade = subs.length - graded.length
  const late = subs.filter((s) => s.late).length
  const avgMarks = graded.length ? graded.reduce((sum, s) => sum + (s.marks || 0), 0) / graded.length : null
  const past = assignment && (parseDate(assignment.dueDate)?.getTime() ?? Infinity) < Date.now()

  const q = search.trim().toLowerCase()
  const shown = filter === 'missing' ? [] : subs.filter((s) => (!q || (s.studentName || '').toLowerCase().includes(q))
    && (filter === 'all' || (filter === 'grade' ? s.status !== 'GRADED' : s.status === 'GRADED')))
  // Students who can see this assignment but have not handed anything in (shown under "Not submitted").
  const shownMissing = filter === 'missing' ? missing.filter((m) => !q || (m.name || '').toLowerCase().includes(q)) : []

  const onSaved = (saved) => {
    setData((d) => ({ ...d, submissions: d.submissions.map((s) => (s.id === saved.id ? saved : s)) }))
    setGrading(null)
  }

  return (
    <Box>
      <PageHeader
        title={assignment?.title || 'Submissions'}
        subtitle={assignment ? courseName(assignment.courseId) : undefined}
        crumbs={[{ label: 'Grading', to: '/teacher/assignments' }, { label: 'Submissions' }]}
        actions={assignment && (
          <>
            <LinkButton to={`/teacher/assignments/${id}/edit`} variant="outlined" startIcon={<EditOutlinedIcon />}>Edit</LinkButton>
            <DownloadButton variant="contained" formats={[
              { format: 'xlsx', label: 'Download grades (Excel)', path: `/assignment/${id}/submissions/export`, fileName: 'grades.xlsx' },
            ]} />
          </>
        )}
      />
      <Async loading={loading} error={error} onRetry={reload}>
        {assignment && (
          <>
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <Stack direction="row" gap={1} alignItems="center" mb={0.5}>
                      <EventOutlinedIcon fontSize="small" color={past ? 'error' : 'action'} />
                      <Typography fontWeight={600} color={past ? 'error.main' : 'text.primary'}>Due {formatDateTime(assignment.dueDate)}</Typography>
                    </Stack>
                    <Stack direction="row" gap={0.75} flexWrap="wrap">
                      <StatusChip status={assignment.audience || 'ALL'} />
                      <Chip size="small" label={past ? 'Closed' : 'Open'} variant="outlined" />
                    </Stack>
                    {assignment.description && (
                      <Typography fontSize="0.85rem" color="text.secondary" mt={1} sx={{ whiteSpace: 'pre-line' }}>{assignment.description}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}><MiniStat label="Submitted" value={`${subs.length} / ${subs.length + missing.length}`} /></Grid>
                  <Grid item xs={6} sm={3} md={2}><MiniStat label="To grade" value={toGrade} tone={toGrade ? 'warning.main' : undefined} /></Grid>
                  <Grid item xs={6} sm={3} md={2}><MiniStat label="Late" value={late} /></Grid>
                  <Grid item xs={6} sm={3} md={2}><MiniStat label="Avg marks" value={avgMarks == null ? '-' : `${avgMarks.toFixed(1)} / ${assignment.totalMarks}`} /></Grid>
                </Grid>
              </CardContent>
            </Card>

            {subs.length === 0 && missing.length === 0 ? (
              <TableCard>
                <EmptyState icon={InboxOutlinedIcon} title="No submissions yet" description="When students hand in their work it shows up here for grading." />
              </TableCard>
            ) : (
              <TableCard toolbar={(
                <>
                  <Stack direction="row" gap={0.75} flexWrap="wrap">
                    {[['all', `All ${subs.length}`], ['grade', `To grade ${toGrade}`], ['graded', `Graded ${graded.length}`], ['missing', `Not submitted ${missing.length}`]].map(([v, l]) => (
                      <Chip key={v} label={l} onClick={() => setFilter(v)} color={filter === v ? 'primary' : 'default'} variant={filter === v ? 'filled' : 'outlined'} />
                    ))}
                  </Stack>
                  <SearchField value={search} onChange={setSearch} placeholder="Search students" />
                </>
              )}>
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table sx={{ minWidth: { md: 700 } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Submitted</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Marks</TableCell>
                        <TableCell align="right" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {shown.map((s) => (
                        <TableRow key={s.id} hover>
                          <TableCell>
                            <Stack direction="row" gap={1.25} alignItems="center">
                              <UserAvatar name={s.studentName} size={34} />
                              <Box minWidth={0}>
                                <Typography fontWeight={600} fontSize="0.9rem">{s.studentName}</Typography>
                                <Typography fontSize="0.75rem" color="text.secondary">
                                  {[s.files?.length ? `${s.files.length} file${s.files.length === 1 ? '' : 's'}` : null, s.filePath ? 'Link' : null].filter(Boolean).join(' · ') || 'Nothing attached'}
                                </Typography>
                                {/* On phones the date and marks columns are hidden, so show them here */}
                                <Typography fontSize="0.75rem" color="text.secondary" sx={{ display: { md: 'none' } }}>
                                  {formatDateTime(s.submittedAt)}{s.status === 'GRADED' ? ` · ${s.marks}/${assignment.totalMarks}` : ''}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>
                            <Typography fontSize="0.88rem">{formatDateTime(s.submittedAt)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" gap={0.5} flexWrap="wrap">
                              <StatusChip status={s.status} />
                              {s.late && <StatusChip status="LATE" />}
                            </Stack>
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>
                            {s.status === 'GRADED'
                              ? <Typography fontFamily={fonts.mono} fontWeight={700} fontSize="0.88rem">{s.marks} / {assignment.totalMarks}</Typography>
                              : <Typography color="text.disabled" fontSize="0.85rem">-</Typography>}
                          </TableCell>
                          <TableCell align="right">
                            <Button size="small" variant={s.status === 'GRADED' ? 'outlined' : 'contained'} onClick={() => setGrading(s)} sx={{ minHeight: 32 }}>
                              {s.status === 'GRADED' ? 'Review' : 'Grade'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {shownMissing.map((m) => (
                        <TableRow key={`m${m.id}`}>
                          <TableCell>
                            <Stack direction="row" gap={1.25} alignItems="center">
                              <UserAvatar name={m.name} src={m.avatarUrl} size={34} />
                              <Box minWidth={0}>
                                <Typography fontWeight={600} fontSize="0.9rem">{m.name}</Typography>
                                <Typography fontSize="0.75rem" color="text.secondary" sx={{ wordBreak: 'break-all' }}>{m.email}</Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Typography color="text.disabled" fontSize="0.85rem">-</Typography></TableCell>
                          <TableCell><StatusChip status={past ? 'MISSING' : 'PENDING'} label={past ? 'Missing' : 'Not yet'} /></TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }} />
                          <TableCell />
                        </TableRow>
                      ))}
                      {shown.length === 0 && shownMissing.length === 0 && (
                        <TableRow><TableCell colSpan={5}><Typography color="text.disabled" fontSize="0.9rem">{filter === 'missing' ? 'Everyone has submitted.' : 'No matching submissions.'}</Typography></TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TableCard>
            )}
          </>
        )}
      </Async>
      {grading && assignment && <GradeDialog submission={grading} assignment={assignment} onClose={() => setGrading(null)} onSaved={onSaved} />}
    </Box>
  )
}
