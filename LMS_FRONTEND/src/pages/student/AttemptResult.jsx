import { useParams } from 'react-router-dom'
import { Box, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import CancelRoundedIcon from '@mui/icons-material/CancelRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import TimerOffOutlinedIcon from '@mui/icons-material/TimerOffOutlined'
import api from '../../api/client'
import useApi from '../../components/ui/useApi'
import { PageHeader, Async, StatusChip, LinkButton, Panel } from '../../components/ui'
import DownloadButton from '../../components/ui/DownloadButton'
import { formatDateTime } from '../../utils/format'
import { fonts } from '../../theme'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

// The attempt, plus the quiz questions (for the question text and the options).
async function loadResult(id) {
  const attempt = (await api.get(`/quiz-attempt/${id}`)).data
  let questions = []
  try {
    questions = (await api.get(`/question/quiz/${attempt.quizId}`)).data
  } catch {
    // The quiz may be closed now; we can still show the score.
  }
  return { attempt, questions }
}

function duration(a) {
  if (!a.startedAt || !a.submittedAt) return null
  const s = Math.max(0, Math.round((new Date(a.submittedAt) - new Date(a.startedAt)) / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export default function AttemptResult() {
  const { id } = useParams()
  const { data, loading, error, reload } = useApi(() => loadResult(id), [id])

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Quizzes', to: '/student/quizzes' }, { label: 'Result' }]}
        title={data?.attempt.quizTitle || 'Quiz result'}
        actions={(
          <>
            <LinkButton to="/student/quizzes" variant="outlined" startIcon={<ArrowBackRoundedIcon />}>Back to quizzes</LinkButton>
            {data && (
              <DownloadButton variant="contained" formats={[
                { format: 'pdf', label: 'Download result (PDF)', path: `/quiz-attempt/${id}/export`, fileName: 'my-quiz-result.pdf' },
              ]} />
            )}
          </>
        )}
      />
      <Async loading={loading} error={error} onRetry={reload}>
        {data && <Result attempt={data.attempt} questions={data.questions} />}
      </Async>
    </>
  )
}

function Result({ attempt, questions }) {
  const t = useTheme().palette.lms
  const answers = Object.fromEntries((attempt.answers || []).map((a) => [a.questionId, a]))
  const pct = Math.round(attempt.percentage ?? 0)
  const correctCount = (attempt.answers || []).filter((a) => a.correct).length
  const answeredCount = (attempt.answers || []).filter((a) => a.selectedOptionId != null).length
  const tone = attempt.passed ? t.ok : t.bad

  return (
    <Stack gap={3}>
      <Card>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 }, '&:last-child': { pb: { xs: 2.5, sm: 3.5 } } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={3} alignItems={{ sm: 'center' }}>
            {/* Score ring */}
            <Box sx={{ width: 132, height: 132, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
              background: `conic-gradient(${tone} ${pct * 3.6}deg, ${t.sunk} 0deg)` }}>
              <Box sx={{ width: 108, height: 108, borderRadius: '50%', bgcolor: 'background.paper', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                <Box>
                  <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, fontSize: '2rem', lineHeight: 1 }}>{pct}%</Typography>
                  <Typography fontSize="0.75rem" color="text.disabled">score</Typography>
                </Box>
              </Box>
            </Box>
            <Box flex={1} minWidth={0}>
              <Stack direction="row" gap={1} mb={1} flexWrap="wrap">
                <StatusChip status={attempt.passed ? 'PASSED' : 'FAILED'} />
                {attempt.timeExpired && <Chip size="small" icon={<TimerOffOutlinedIcon />} label="Submitted after time ran out" />}
              </Stack>
              <Typography variant="h2" mb={0.5}>
                {attempt.score} <Typography component="span" color="text.disabled" fontSize="1.2rem">/ {attempt.totalMarks} marks</Typography>
              </Typography>
              <Typography color="text.secondary">
                {attempt.passed ? 'Great work, you passed this quiz.' : 'You did not reach the pass mark this time. Review the answers below.'}
              </Typography>
            </Box>
            <Grid container spacing={1.5} sx={{ maxWidth: { sm: 300 } }}>
              <Mini label="Correct" value={`${correctCount}/${questions.length || attempt.answers?.length || 0}`} />
              <Mini label="Answered" value={answeredCount} />
              <Mini label="Time taken" value={duration(attempt) || '-'} />
              <Mini label="Submitted" value={formatDateTime(attempt.submittedAt)} small />
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      {questions.length > 0 && (
        <Panel title="Answers" subtitle="Your choice and the correct answer for each question">
          <Stack gap={2}>
            {questions.map((q, i) => {
              const a = answers[q.id]
              const chosen = a?.selectedOptionId
              const right = a?.correctOptionId
              const isCorrect = !!a?.correct
              return (
                <Box key={q.id} sx={{ border: 1, borderColor: 'divider', borderRadius: '12px', p: { xs: 1.75, sm: 2.25 } }}>
                  <Stack direction="row" justifyContent="space-between" gap={1.5} mb={1.5}>
                    <Stack direction="row" gap={1.25} minWidth={0}>
                      {isCorrect ? <CheckCircleRoundedIcon sx={{ color: t.ok, mt: '2px' }} /> : <CancelRoundedIcon sx={{ color: chosen ? t.bad : t.faint, mt: '2px' }} />}
                      <Typography fontWeight={700} sx={{ wordBreak: 'break-word', whiteSpace: 'pre-line' }}>{i + 1}. {q.questionText}</Typography>
                    </Stack>
                    <Typography fontFamily={fonts.mono} fontSize="0.8rem" color="text.secondary" flexShrink={0}>
                      {a?.marks ?? 0}/{q.marks ?? 0}
                    </Typography>
                  </Stack>
                  <Stack gap={0.75}>
                    {(q.options || []).map((o, j) => {
                      const isRight = o.id === right
                      const isChosen = o.id === chosen
                      const bg = isRight ? t.okSoft : isChosen ? t.badSoft : 'transparent'
                      const border = isRight ? t.ok : isChosen ? t.bad : t.line
                      return (
                        <Stack key={o.id} direction="row" alignItems="center" gap={1.5} flexWrap="wrap"
                          sx={{ px: 1.5, py: 1, borderRadius: '8px', bgcolor: bg, border: `1px solid ${border}` }}>
                          <Typography fontFamily={fonts.mono} fontWeight={700} fontSize="0.8rem" color="text.secondary">{LETTERS[j]}</Typography>
                          <Typography fontSize="0.9rem" flex="1 1 140px" sx={{ wordBreak: 'break-word' }}>{o.optionText}</Typography>
                          {(isChosen || isRight) && (
                            <Stack direction="row" gap={0.75} flexShrink={0}>
                              {isChosen && <Chip size="small" label="Your answer" sx={{ bgcolor: 'background.paper' }} />}
                              {isRight && <Chip size="small" label="Correct" sx={{ bgcolor: t.ok, color: '#fff' }} />}
                            </Stack>
                          )}
                        </Stack>
                      )
                    })}
                  </Stack>
                  {!chosen && <Typography fontSize="0.8rem" color="text.disabled" mt={1}>Not answered</Typography>}
                </Box>
              )
            })}
          </Stack>
        </Panel>
      )}
    </Stack>
  )
}

function Mini({ label, value, small }) {
  return (
    <Grid item xs={6}>
      <Box sx={{ bgcolor: 'action.hover', borderRadius: '10px', px: 1.5, py: 1 }}>
        <Typography fontSize="0.7rem" color="text.disabled" fontWeight={700} textTransform="uppercase" letterSpacing="0.06em">{label}</Typography>
        <Typography fontWeight={700} fontSize={small ? '0.78rem' : '0.95rem'} noWrap={!small} title={String(value)}>{value}</Typography>
      </Box>
    </Grid>
  )
}
