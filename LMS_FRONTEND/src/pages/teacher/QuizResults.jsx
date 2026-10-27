import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Box, Grid, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import PercentRoundedIcon from '@mui/icons-material/PercentRounded'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import api from '../../api/client'
import DownloadButton from '../../components/ui/DownloadButton'
import useApi from '../../components/ui/useApi'
import {
  Async, EmptyState, LinkButton, PageHeader, Panel, StatCard, StatusChip, UserAvatar, useChartStyle,
} from '../../components/ui'
import { formatDateTime } from '../../utils/format'
import { fonts } from '../../theme'
import { JoinCode, SearchField, TableCard, useCourses } from './TeacherShared'

const BUCKETS = ['0-20', '21-40', '41-60', '61-80', '81-100']
const bucketOf = (p) => (p <= 20 ? 0 : p <= 40 ? 1 : p <= 60 ? 2 : p <= 80 ? 3 : 4)

const percentOf = (a) => (a.percentage != null ? a.percentage : a.totalMarks ? (a.score * 100) / a.totalMarks : 0)

export default function QuizResults() {
  const { id } = useParams()
  const { data, loading, error, reload } = useApi(async () => {
    const [quiz, attempts] = await Promise.all([
      api.get(`/quiz/${id}`).then((r) => r.data),
      api.get(`/quiz-attempt/quiz/${id}`).then((r) => r.data),
    ])
    return { quiz, attempts }
  }, [id])
  const { courseName } = useCourses()
  const { axis, grid, tooltip, t } = useChartStyle()
  const [search, setSearch] = useState('')

  const quiz = data?.quiz
  const attempts = useMemo(() => [...(data?.attempts || [])].sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '')), [data])

  const stats = useMemo(() => {
    if (!attempts.length) return null
    const pcts = attempts.map(percentOf)
    const passed = attempts.filter((a) => a.passed).length
    const best = attempts.reduce((b, a) => (percentOf(a) > percentOf(b) ? a : b), attempts[0])
    const students = new Set(attempts.map((a) => a.studentId)).size
    return {
      avg: pcts.reduce((s, p) => s + p, 0) / pcts.length,
      passRate: (passed * 100) / attempts.length,
      passed,
      best,
      students,
    }
  }, [attempts])

  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]
    attempts.forEach((a) => { counts[bucketOf(percentOf(a))]++ })
    return BUCKETS.map((range, i) => ({ range, count: counts[i] }))
  }, [attempts])

  // Pass mark as a percentage, to color the bars above and below it.
  const passPct = quiz?.totalMarks ? (quiz.passingMarks * 100) / quiz.totalMarks : 0

  const s = search.trim().toLowerCase()
  const shown = attempts.filter((a) => !s || (a.studentName || '').toLowerCase().includes(s))

  return (
    <Box>
      <PageHeader
        title={quiz ? quiz.title : 'Quiz results'}
        subtitle={quiz ? `${courseName(quiz.courseId)} · ${quiz.questionIds?.length || 0} questions · ${quiz.totalMarks} marks · pass at ${quiz.passingMarks}` : undefined}
        crumbs={[{ label: 'Quizzes', to: '/teacher/quizzes' }, { label: 'Results' }]}
        actions={quiz && (
          <>
            {quiz.joinCode && <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '10px', pl: 1.5, bgcolor: 'background.paper' }}><JoinCode code={quiz.joinCode} /></Box>}
            <StatusChip status={quiz.audience || 'ALL'} />
            <StatusChip status={quiz.published ? 'PUBLISHED' : 'DRAFT'} />
            <LinkButton to={`/teacher/quizzes/${id}/edit`} variant="outlined" startIcon={<EditOutlinedIcon />}>Edit quiz</LinkButton>
            <DownloadButton label="Download results" variant="contained" formats={[
              { format: 'xlsx', label: 'Excel (.xlsx)', path: `/quiz/${id}/results/export`, params: { format: 'xlsx' }, fileName: 'quiz-results.xlsx' },
              { format: 'pdf', label: 'PDF', path: `/quiz/${id}/results/export`, params: { format: 'pdf' }, fileName: 'quiz-results.pdf' },
            ]} />
          </>
        )}
      />
      <Async loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <Grid container spacing={2} mb={2}>
              <Grid item xs={6} md={3}>
                <StatCard icon={FactCheckOutlinedIcon} label="Attempts" value={attempts.length}
                  hint={stats ? `By ${stats.students} student${stats.students === 1 ? '' : 's'}` : 'No attempts yet'} />
              </Grid>
              <Grid item xs={6} md={3}>
                <StatCard icon={PercentRoundedIcon} tone="amber" label="Average score" value={stats ? `${Math.round(stats.avg)}%` : '-'} hint="Of total marks" />
              </Grid>
              <Grid item xs={6} md={3}>
                <StatCard icon={VerifiedOutlinedIcon} tone="teal" label="Pass rate" value={stats ? `${Math.round(stats.passRate)}%` : '-'}
                  hint={stats ? `${stats.passed} of ${attempts.length} passed` : undefined} hintTone={stats && stats.passRate >= 50 ? 'ok' : undefined} />
              </Grid>
              <Grid item xs={6} md={3}>
                <StatCard icon={EmojiEventsOutlinedIcon} tone="rose" label="Best score"
                  value={stats ? `${stats.best.score}` : '-'} suffix={stats ? `/ ${stats.best.totalMarks}` : undefined}
                  hint={stats ? stats.best.studentName : undefined} />
              </Grid>
            </Grid>

            {attempts.length === 0 ? (
              <TableCard>
                <EmptyState icon={FactCheckOutlinedIcon} title="No attempts yet"
                  description={quiz.published ? 'Results show here as soon as students submit the quiz.' : 'This quiz is a draft. Publish it so students can take it.'}
                  action={!quiz.published && <LinkButton to={`/teacher/quizzes/${id}/edit`} variant="contained">Edit and publish</LinkButton>} />
              </TableCard>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                  <Panel title="Score distribution" subtitle={`Attempts by score %, pass mark ${Math.round(passPct)}%`}>
                    <Box height={280}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={distribution} margin={{ top: 20, right: 8, left: -22, bottom: 0 }}>
                          <CartesianGrid {...grid} />
                          <XAxis dataKey="range" {...axis} />
                          <YAxis {...axis} allowDecimals={false} />
                          <Tooltip {...tooltip} formatter={(v) => [v, 'Attempts']} labelFormatter={(l) => `Score ${l}%`} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={44}>
                            {distribution.map((d, i) => (
                              // Buckets fully below the pass mark are muted.
                              <Cell key={d.range} fill={(i + 1) * 20 <= passPct ? t.line2 : t.accent} />
                            ))}
                            <LabelList dataKey="count" position="top" style={{ fill: t.ink, fontSize: 12, fontFamily: fonts.body }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Panel>
                </Grid>
                <Grid item xs={12} md={7}>
                  <TableCard toolbar={(
                    <>
                      <Typography variant="h5">Attempts</Typography>
                      <SearchField value={search} onChange={setSearch} placeholder="Search students" />
                    </>
                  )}>
                    <TableContainer sx={{ overflowX: 'auto', maxHeight: 420 }}>
                      <Table stickyHeader sx={{ minWidth: { md: 560 } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>Student</TableCell>
                            <TableCell align="right">Score</TableCell>
                            <TableCell>Result</TableCell>
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Submitted</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {shown.map((a) => (
                            <TableRow key={a.id} hover>
                              <TableCell>
                                <Stack direction="row" gap={1.25} alignItems="center">
                                  <UserAvatar name={a.studentName} size={32} />
                                  <Box minWidth={0}>
                                    <Typography fontWeight={600} fontSize="0.9rem">{a.studentName}</Typography>
                                    <Typography fontSize="0.75rem" color="text.secondary" sx={{ display: { sm: 'none' } }}>{formatDateTime(a.submittedAt)}</Typography>
                                  </Box>
                                </Stack>
                              </TableCell>
                              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                <Typography fontFamily={fonts.mono} fontWeight={700} fontSize="0.88rem">{a.score} / {a.totalMarks}</Typography>
                                <Typography fontSize="0.78rem" color="text.secondary">{Math.round(percentOf(a))}%</Typography>
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" gap={0.5} flexWrap="wrap">
                                  <StatusChip status={a.passed ? 'PASSED' : 'FAILED'} />
                                  {a.status === 'IN_PROGRESS' && <StatusChip status="IN_PROGRESS" />}
                                  {a.timeExpired && <StatusChip status="LATE" label="Time up" />}
                                </Stack>
                              </TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}><Typography fontSize="0.85rem">{formatDateTime(a.submittedAt)}</Typography></TableCell>
                            </TableRow>
                          ))}
                          {shown.length === 0 && (
                            <TableRow><TableCell colSpan={4}><Typography color="text.disabled" fontSize="0.9rem">No matching students.</Typography></TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </TableCard>
                </Grid>
              </Grid>
            )}
          </>
        )}
      </Async>
    </Box>
  )
}
