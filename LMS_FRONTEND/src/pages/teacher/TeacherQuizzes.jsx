import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, IconButton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
import api, { errorMessage } from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { Async, EmptyState, LinkButton, PageHeader, StatusChip } from '../../components/ui'
import { JoinCode, SearchField, TableCard, quizToRequest, useCourses } from './TeacherShared'

export default function TeacherQuizzes() {
  const navigate = useNavigate()
  const { notify, confirm } = useFeedback()
  const { data, loading, error, reload, setData } = useApi(() => api.get('/quiz').then((r) => r.data), [])
  const { courseName } = useCourses()
  const [search, setSearch] = useState('')

  const quizzes = data || []
  const s = search.trim().toLowerCase()
  const shown = quizzes.filter((q) => !s || q.title.toLowerCase().includes(s) || courseName(q.courseId).toLowerCase().includes(s))

  const unpublish = async (q) => {
    try {
      const res = await api.put(`/quiz/${q.id}`, quizToRequest(q, { published: false }))
      setData((list) => list.map((x) => (x.id === q.id ? res.data : x)))
      notify.success('Quiz unpublished. Students can no longer start it.')
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  const remove = async (q) => {
    if (!(await confirm({ title: `Delete "${q.title}"?`, message: 'This cannot be undone.', confirmText: 'Delete', danger: true }))) return
    try {
      await api.delete(`/quiz/${q.id}`)
      setData((list) => list.filter((x) => x.id !== q.id))
      notify.success('Quiz deleted')
    } catch (e) {
      // The backend refuses after students attempted the quiz: offer to unpublish it instead.
      const status = e?.response?.status
      if ((status === 409 || status === 400) && q.published) {
        if (await confirm({ title: 'Cannot delete this quiz', message: `${errorMessage(e)}. Unpublish it now?`, confirmText: 'Unpublish' })) {
          unpublish(q)
        }
      } else {
        notify.error(errorMessage(e))
      }
    }
  }

  const newButton = <LinkButton to="/teacher/quizzes/new" variant="contained" startIcon={<AddRoundedIcon />}>New quiz</LinkButton>

  return (
    <Box>
      <PageHeader title="Quizzes" subtitle="Build quizzes from your question bank and choose who can take them." actions={newButton} />
      <Async loading={loading} error={error} onRetry={reload}>
        {quizzes.length === 0 ? (
          <TableCard>
            <EmptyState icon={QuizOutlinedIcon} title="No quizzes yet"
              description="Pick questions from your question bank, set a time limit and share it with a course, a group or a join code."
              action={newButton} />
          </TableCard>
        ) : (
          <TableCard toolbar={(
            <>
              <Typography color="text.secondary" fontWeight={600} fontSize="0.9rem">{quizzes.length} quiz{quizzes.length === 1 ? '' : 'zes'}</Typography>
              <SearchField value={search} onChange={setSearch} placeholder="Search by title or course" />
            </>
          )}>
            {shown.length === 0 ? <EmptyState title="No matching quizzes" /> : (
              <>
              {/* Phones: one compact card per quiz */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                {shown.map((q) => (
                  <Box key={q.id} onClick={() => navigate(`/teacher/quizzes/${q.id}/results`)}
                    sx={{ px: 2, py: 1.75, borderBottom: 1, borderColor: 'divider', cursor: 'pointer', '&:last-child': { borderBottom: 0 } }}>
                    <Stack direction="row" justifyContent="space-between" gap={1}>
                      <Box minWidth={0}>
                        <Typography fontWeight={700} fontSize="0.93rem">{q.title}</Typography>
                        <Typography fontSize="0.8rem" color="text.secondary" noWrap>{courseName(q.courseId)}</Typography>
                      </Box>
                      <StatusChip status={q.published ? 'PUBLISHED' : 'DRAFT'} />
                    </Stack>
                    <Typography fontSize="0.8rem" color="text.secondary" mt={0.75}>
                      {q.questionIds?.length ?? 0} questions · {q.totalMarks ?? 0} marks · {q.timeLimitInMinutes} min · {q.maxAttempts ?? 1} attempt{(q.maxAttempts ?? 1) === 1 ? '' : 's'}
                    </Typography>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mt={0.75} onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <StatusChip status={q.audience || 'ALL'} />
                        {q.joinCode && <JoinCode code={q.joinCode} />}
                      </Stack>
                      <Stack direction="row">
                        <IconButton size="small" aria-label="Edit" onClick={() => navigate(`/teacher/quizzes/${q.id}/edit`)}><EditOutlinedIcon fontSize="small" /></IconButton>
                        <IconButton size="small" aria-label="Delete" onClick={() => remove(q)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Box>
              <TableContainer sx={{ overflowX: 'auto', display: { xs: 'none', md: 'block' } }}>
                <Table sx={{ minWidth: 960 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Quiz</TableCell>
                      <TableCell align="center">Questions</TableCell>
                      <TableCell align="center">Marks</TableCell>
                      <TableCell>Time · attempts</TableCell>
                      <TableCell>Audience</TableCell>
                      <TableCell>Join code</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {shown.map((q) => (
                      <TableRow key={q.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/teacher/quizzes/${q.id}/results`)}>
                        <TableCell sx={{ maxWidth: 300 }}>
                          <Typography fontWeight={700} fontSize="0.93rem">{q.title}</Typography>
                          <Typography fontSize="0.8rem" color="text.secondary" noWrap>{courseName(q.courseId)}</Typography>
                        </TableCell>
                        <TableCell align="center"><Typography fontWeight={600}>{q.questionIds?.length ?? 0}</Typography></TableCell>
                        <TableCell align="center">
                          <Typography fontWeight={600}>{q.totalMarks ?? 0}</Typography>
                          <Typography fontSize="0.75rem" color="text.disabled">pass {q.passingMarks ?? 0}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" gap={0.5}>
                            <TimerOutlinedIcon sx={{ fontSize: 16 }} color="action" />
                            <Typography fontSize="0.88rem">{q.timeLimitInMinutes} min</Typography>
                          </Stack>
                          <Typography fontSize="0.78rem" color="text.secondary">{q.maxAttempts ?? 1} attempt{(q.maxAttempts ?? 1) === 1 ? '' : 's'}</Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip status={q.audience || 'ALL'} />
                          {q.audience === 'GROUPS' && <Typography fontSize="0.75rem" color="text.disabled" mt={0.25}>{q.groupIds?.length || 0} group(s)</Typography>}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}><JoinCode code={q.joinCode} /></TableCell>
                        <TableCell><StatusChip status={q.published ? 'PUBLISHED' : 'DRAFT'} /></TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="Results"><IconButton size="small" onClick={() => navigate(`/teacher/quizzes/${q.id}/results`)}><InsightsOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Edit"><IconButton size="small" onClick={() => navigate(`/teacher/quizzes/${q.id}/edit`)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Delete"><IconButton size="small" onClick={() => remove(q)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
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
