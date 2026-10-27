import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Box, Button, Card, CardContent, Grid, Link, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded'
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined'
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import api from '../../api/client'
import useApi from '../../components/ui/useApi'
import { PageHeader, Panel, EmptyState, Async, StatusChip, IconBadge } from '../../components/ui'
import { formatDateTime, parseDate } from '../../utils/format'
import { fonts } from '../../theme'

// Quizzes I can take, my past attempts, and the courses (to show course names on the cards).
async function loadQuizzes() {
  const [quizzes, attempts, enrollments] = await Promise.all([
    api.get('/quiz/my').then((r) => r.data),
    api.get('/quiz-attempt/my').then((r) => r.data),
    api.get('/enrollments/my').then((r) => r.data).catch(() => []),
  ])
  const courseNames = Object.fromEntries(enrollments.map((e) => [e.courseId, e.courseTitle]))
  return { quizzes, attempts, courseNames }
}

// The backend treats an empty max as 1 attempt.
const maxOf = (q) => (q.maxAttempts && q.maxAttempts > 0 ? q.maxAttempts : 1)

export default function StudentQuizzes() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const { data, loading, error, reload } = useApi(loadQuizzes, [])

  const attempts = [...(data?.attempts || [])].sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)))
  const usedByQuiz = attempts.reduce((m, a) => ({ ...m, [a.quizId]: (m[a.quizId] || 0) + 1 }), {})
  const bestByQuiz = attempts.reduce((m, a) => ({ ...m, [a.quizId]: Math.max(m[a.quizId] ?? 0, a.percentage ?? 0) }), {})

  const join = (e) => {
    e.preventDefault()
    if (code.trim()) navigate(`/join/${encodeURIComponent(code.trim())}`)
  }

  return (
    <>
      <PageHeader title="Quizzes" subtitle="Test what you learned. Your best scores count towards your progress." />

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2}>
            <Stack direction="row" alignItems="center" gap={1.5} flex={1} minWidth={0}>
              <IconBadge icon={VpnKeyOutlinedIcon} tone="warn" size={40} />
              <Box>
                <Typography fontWeight={700}>Have a join code?</Typography>
                <Typography fontSize="0.85rem" color="text.secondary">Your teacher can share a code for a quiz outside your courses.</Typography>
              </Box>
            </Stack>
            <Stack component="form" onSubmit={join} direction="row" gap={1} width={{ xs: '100%', sm: 'auto' }}>
              <TextField value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter code"
                sx={{ width: { xs: '100%', sm: 200 } }} inputProps={{ 'aria-label': 'Join code', style: { fontFamily: fonts.mono, letterSpacing: '0.06em' } }} />
              <Button type="submit" variant="contained" disabled={!code.trim()}>Join</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Async loading={loading} error={error} onRetry={reload}>
        {data && (
          <Stack gap={3}>
            <Box>
              <Typography variant="h4" mb={1.5}>Available quizzes</Typography>
              {data.quizzes.length === 0 ? (
                <Card>
                  <EmptyState icon={QuizOutlinedIcon} title="No quizzes yet"
                    description="Quizzes from your courses show up here. Enroll in a course or use a join code." />
                </Card>
              ) : (
                <Grid container spacing={2.5}>
                  {data.quizzes.map((q) => {
                    const used = usedByQuiz[q.id] || 0
                    const max = maxOf(q)
                    const left = Math.max(0, max - used)
                    return (
                      <Grid item xs={12} sm={6} md={4} key={q.id}>
                        <QuizCard quiz={q} used={used} max={max} left={left} best={bestByQuiz[q.id]}
                          course={data.courseNames[q.courseId]} onStart={() => navigate(`/quiz/${q.id}/take`)} />
                      </Grid>
                    )
                  })}
                </Grid>
              )}
            </Box>

            <Card>
              <Box px={{ xs: 2, sm: 2.5 }} pt={{ xs: 2, sm: 2.5 }} pb={2}>
                <Typography variant="h5">My attempts</Typography>
                <Typography fontSize="0.82rem" color="text.disabled" mt={0.25}>Every quiz you submitted</Typography>
              </Box>
              {attempts.length === 0 ? (
                <EmptyState icon={HistoryRoundedIcon} title="No attempts yet" description="When you submit a quiz, your score shows up here." />
              ) : (
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 620, '& td, & th': { px: 2.5, py: 1.5 } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Quiz</TableCell>
                        <TableCell>Submitted</TableCell>
                        <TableCell align="right">Score</TableCell>
                        <TableCell align="right">Percent</TableCell>
                        <TableCell>Result</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attempts.map((a) => (
                        <TableRow key={a.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{a.quizTitle}</TableCell>
                          <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{formatDateTime(a.submittedAt)}</TableCell>
                          <TableCell align="right" sx={{ fontFamily: fonts.mono }}>{a.score}/{a.totalMarks}</TableCell>
                          <TableCell align="right" sx={{ fontFamily: fonts.mono, fontWeight: 700 }}>{Math.round(a.percentage ?? 0)}%</TableCell>
                          <TableCell>
                            <Stack direction="row" gap={0.75}>
                              <StatusChip status={a.passed ? 'PASSED' : 'FAILED'} />
                              {a.timeExpired && <StatusChip status="LATE" label="Time up" />}
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Link component={RouterLink} to={`/attempts/${a.id}`} fontWeight={600} underline="hover">View</Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          </Stack>
        )}
      </Async>
    </>
  )
}

// QuizTake remembers an unfinished attempt per quiz in sessionStorage, so we can say "Resume".
function hasRunningAttempt(quizId) {
  try { return !!sessionStorage.getItem(`lms.quiz.${quizId}.attempt`) } catch { return false }
}

function QuizCard({ quiz, used, max, left, best, course, onStart }) {
  // A quiz with a due date cannot be started after it; a running attempt may still be finished.
  const closed = !!quiz.dueDate && parseDate(quiz.dueDate) < new Date()
  const resume = left > 0 && hasRunningAttempt(quiz.id)
  const canStart = left > 0 && (!closed || resume)
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1}>
          <Typography variant="overline" color="text.disabled" noWrap minWidth={0}>{course || (quiz.audience === 'LINK' ? 'Joined with code' : 'Quiz')}</Typography>
          {used > 0 && best !== undefined && <StatusChip status={quiz.totalMarks && (best * quiz.totalMarks) / 100 >= (quiz.passingMarks ?? 0) ? 'PASSED' : 'FAILED'} label={`Best ${Math.round(best)}%`} />}
        </Stack>
        <Typography variant="h5" mb={0.5}>{quiz.title}</Typography>
        {quiz.description && (
          <Typography fontSize="0.85rem" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {quiz.description}
          </Typography>
        )}
        <Box flex={1} minHeight={12} />
        <Stack direction="row" gap={2} flexWrap="wrap" my={1.5} color="text.secondary">
          <Meta icon={TimerOutlinedIcon} text={quiz.timeLimitInMinutes ? `${quiz.timeLimitInMinutes} min` : 'No time limit'} />
          <Meta icon={EmojiEventsOutlinedIcon} text={`${quiz.totalMarks ?? 0} marks`} />
          <Meta icon={ReplayRoundedIcon} text={`${used}/${max} attempts`} />
          {quiz.dueDate && (
            <Box sx={{ color: closed ? 'error.main' : 'warning.main' }}>
              <Meta icon={EventOutlinedIcon} text={`${closed ? 'Closed' : 'Closes'} ${formatDateTime(quiz.dueDate)}`} />
            </Box>
          )}
        </Stack>
        <Button variant={canStart ? 'contained' : 'outlined'} disabled={!canStart} onClick={onStart} startIcon={canStart ? <PlayArrowRoundedIcon /> : null}>
          {canStart ? (resume ? 'Resume quiz' : used ? 'Try again' : 'Start quiz') : closed ? 'Quiz closed' : 'No attempts left'}
        </Button>
      </CardContent>
    </Card>
  )
}

function Meta({ icon: Icon, text }) {
  return (
    <Stack direction="row" alignItems="center" gap={0.5}>
      <Icon sx={{ fontSize: 16 }} />
      <Typography fontSize="0.8rem" fontWeight={600}>{text}</Typography>
    </Stack>
  )
}
