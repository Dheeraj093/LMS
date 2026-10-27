import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
import BookmarkBorderRoundedIcon from '@mui/icons-material/BookmarkBorderRounded'
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded'
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined'
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined'
import api, { errorMessage } from '../../api/client'
import { useFeedback } from '../../components/ui/Feedback'
import { EmptyState, Loading, LinkButton } from '../../components/ui'
import { parseDate } from '../../utils/format'
import { fonts } from '../../theme'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

// sessionStorage helpers (may throw in private mode, so always wrapped).
const saved = {
  read(attemptId) {
    try { return JSON.parse(sessionStorage.getItem(`lms.quiz.attempt.${attemptId}`)) || null } catch { return null }
  },
  write(quizId, attemptId, value) {
    try {
      sessionStorage.setItem(`lms.quiz.attempt.${attemptId}`, JSON.stringify(value))
      sessionStorage.setItem(`lms.quiz.${quizId}.attempt`, String(attemptId))
    } catch { /* storage not available: answers live only in memory */ }
  },
  clear(quizId, attemptId) {
    try {
      sessionStorage.removeItem(`lms.quiz.attempt.${attemptId}`)
      sessionStorage.removeItem(`lms.quiz.${quizId}.attempt`)
    } catch { /* ignore */ }
  },
}

const mmss = (sec) => {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const pad = (x) => String(x).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`
}

export default function QuizTake() {
  const { id } = useParams()
  const [start, setStart] = useState(null)
  const [error, setError] = useState(null)
  const started = useRef(null)

  useEffect(() => {
    // Start once per quiz id (React may run effects twice in development).
    if (started.current === id) return
    started.current = id
    setStart(null)
    setError(null)
    const clientNow = Date.now()
    api.post(`/quiz/${id}/start`)
      .then((r) => {
        // offset = how far the server clock is ahead of this computer's clock.
        const server = parseDate(r.data.serverTime)?.getTime() ?? clientNow
        setStart({ ...r.data, offset: server - Date.now() })
      })
      .catch(setError)
  }, [id])

  if (error) {
    // The server says "This quiz closed on ..." when the quiz due date has passed.
    const closed = /closed on/i.test(errorMessage(error))
    return (
      <Card>
        <EmptyState icon={closed ? EventBusyOutlinedIcon : QuizOutlinedIcon}
          title={closed ? 'This quiz is closed' : 'You cannot take this quiz right now'} description={errorMessage(error)}
          action={<LinkButton to="/student/quizzes" variant="contained">Back to quizzes</LinkButton>} />
      </Card>
    )
  }
  if (!start) return <Loading />
  return <QuizRunner start={start} />
}

function QuizRunner({ start }) {
  const navigate = useNavigate()
  const { notify, confirm } = useFeedback()
  const t = useTheme().palette.lms
  const questions = start.questions || []

  const restored = saved.read(start.attemptId)
  const [answers, setAnswers] = useState(() => restored?.answers || {})
  const [marked, setMarked] = useState(() => new Set(restored?.marked || []))
  const [index, setIndex] = useState(() => Math.min(restored?.index || 0, Math.max(0, questions.length - 1)))
  const [submitting, setSubmitting] = useState(false)
  const answersRef = useRef(answers)
  // notify is a new object on every render; keep it in a ref so the timer is not restarted each render.
  const notifyRef = useRef(notify)
  notifyRef.current = notify
  const submittedRef = useRef(false)
  const autoFailedRef = useRef(false)

  const deadline = parseDate(start.deadline)?.getTime() ?? null
  const remaining = () => (deadline ? (deadline - (Date.now() + start.offset)) / 1000 : null)
  const [left, setLeft] = useState(remaining)

  // Keep the ref and sessionStorage in step with the answers.
  useEffect(() => {
    answersRef.current = answers
    saved.write(start.quizId, start.attemptId, { answers, marked: [...marked], index })
  }, [answers, marked, index, start.quizId, start.attemptId])

  const submit = useCallback(async (auto = false) => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    try {
      await api.post(`/quiz-attempt/${start.attemptId}/submit`, { answers: answersRef.current })
      saved.clear(start.quizId, start.attemptId)
      if (auto) notifyRef.current.info('Time is up. Your answers were submitted.')
      navigate(`/attempts/${start.attemptId}`, { replace: true })
    } catch (e) {
      // Already submitted (409) means the result exists; go and show it.
      if (e.response?.status === 409) {
        saved.clear(start.quizId, start.attemptId)
        navigate(`/attempts/${start.attemptId}`, { replace: true })
        return
      }
      submittedRef.current = false
      if (auto) autoFailedRef.current = true // do not retry every tick; the student can press Submit
      setSubmitting(false)
      notifyRef.current.error(errorMessage(e))
    }
  }, [start.attemptId, start.quizId, navigate])

  // Countdown to the server deadline; auto-submit at zero.
  useEffect(() => {
    if (!deadline) return undefined
    const tick = () => {
      const r = remaining()
      setLeft(r)
      if (r <= 0 && !autoFailedRef.current) submit(true)
    }
    tick()
    const timer = setInterval(tick, 500)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline, submit])

  // Ask before closing the tab in the middle of a quiz.
  useEffect(() => {
    const warn = (e) => { if (!submittedRef.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  if (!questions.length) {
    return (
      <Card>
        <EmptyState icon={QuizOutlinedIcon} title="This quiz has no questions" description="Please ask your teacher to add questions."
          action={<LinkButton to="/student/quizzes" variant="outlined">Back to quizzes</LinkButton>} />
      </Card>
    )
  }

  const q = questions[index]
  const answeredCount = questions.filter((x) => answers[x.id] != null).length
  const markedCount = questions.filter((x) => marked.has(x.id)).length
  const unanswered = questions.length - answeredCount
  const warnTime = left != null && left < 60

  const choose = (optionId) => setAnswers((a) => ({ ...a, [q.id]: optionId }))
  const toggleMark = () => setMarked((m) => { const n = new Set(m); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n })
  const goNext = () => setIndex((i) => Math.min(questions.length - 1, i + 1))

  const askSubmit = async () => {
    const ok = await confirm({
      title: 'Submit quiz?',
      message: unanswered
        ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}${markedCount ? ` and ${markedCount} marked for review` : ''}. Unanswered questions get 0 marks. You cannot change answers after submitting.`
        : `You answered all ${questions.length} questions${markedCount ? ` (${markedCount} marked for review)` : ''}. You cannot change answers after submitting.`,
      confirmText: 'Submit quiz',
    })
    if (ok) submit(false)
  }

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end" gap={2} mb={3} flexWrap="wrap">
        <Box minWidth={0}>
          <Typography variant="overline" color="text.disabled">
            Attempt {start.attemptNumber} of {start.maxAttempts} · {start.totalMarks} marks
          </Typography>
          <Typography variant="h1" sx={{ fontSize: { xs: '1.5rem', sm: '1.9rem' }, wordBreak: 'break-word' }}>{start.quizTitle}</Typography>
        </Box>
        {left != null && (
          <Stack direction="row" alignItems="center" gap={1} role="timer" aria-live="off"
            sx={{ px: 2, py: 1, borderRadius: '10px', bgcolor: warnTime ? t.badSoft : t.warnSoft, color: warnTime ? t.bad : t.warn }}>
            <TimerOutlinedIcon sx={{ fontSize: 20 }} />
            <Typography sx={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: '1.3rem', lineHeight: 1 }}>{mmss(left)}</Typography>
            <Typography fontWeight={700} fontSize="0.85rem">left</Typography>
          </Stack>
        )}
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} gap={1}>
                <Chip size="small" label={`Question ${index + 1} of ${questions.length}`} sx={{ bgcolor: t.accentSoft, color: t.accent }} />
                <Typography fontSize="0.85rem" color="text.secondary">{q.marks ?? 0} mark{q.marks === 1 ? '' : 's'}</Typography>
              </Stack>
              <Typography variant="h3" sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem' }, mb: 2.5, lineHeight: 1.4, whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                {q.questionText}
              </Typography>

              <Stack gap={1.25} role="radiogroup" aria-label="Options">
                {(q.options || []).map((o, i) => {
                  const on = answers[q.id] === o.id
                  return (
                    <Box key={o.id} role="radio" aria-checked={on} tabIndex={0}
                      onClick={() => choose(o.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(o.id) } }}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 2, p: { xs: 1.5, sm: 2 }, borderRadius: '12px', cursor: 'pointer',
                        border: `1px solid ${on ? t.accent : t.line}`, bgcolor: on ? t.accentSoft : 'background.paper',
                        transition: 'all .12s', '&:hover': { borderColor: on ? t.accent : t.line2 },
                        '&:focus-visible': { outline: `2px solid ${t.accent}`, outlineOffset: 2 },
                      }}>
                      <Box sx={{
                        width: 30, height: 30, borderRadius: '8px', display: 'grid', placeItems: 'center', flexShrink: 0,
                        fontFamily: fonts.mono, fontWeight: 700, fontSize: '0.85rem',
                        bgcolor: on ? t.accent : t.sunk, color: on ? '#fff' : t.muted,
                      }}>{LETTERS[i] || i + 1}</Box>
                      <Typography sx={{ wordBreak: 'break-word' }}>{o.optionText}</Typography>
                    </Box>
                  )
                })}
              </Stack>

              <Stack direction="row" justifyContent="space-between" gap={1} mt={3} flexWrap="wrap">
                <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} disabled={index === 0} onClick={() => setIndex(index - 1)}>
                  Previous
                </Button>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Button variant="outlined" onClick={toggleMark}
                    startIcon={marked.has(q.id) ? <BookmarkRoundedIcon sx={{ color: t.warn }} /> : <BookmarkBorderRoundedIcon />}>
                    {marked.has(q.id) ? 'Unmark' : 'Mark for review'}
                  </Button>
                  {index < questions.length - 1 ? (
                    <Button variant="contained" endIcon={<ArrowForwardRoundedIcon />} onClick={goNext}>Save & next</Button>
                  ) : (
                    <Button variant="contained" onClick={askSubmit} disabled={submitting}>Finish</Button>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="overline" color="text.disabled">Question palette</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, mt: 1.5, mb: 2 }}>
                {questions.map((x, i) => {
                  const answered = answers[x.id] != null
                  const isMarked = marked.has(x.id)
                  const isCurrent = i === index
                  let bg = t.sunk; let fg = t.muted; let border = 'transparent'
                  if (answered) { bg = t.ok; fg = '#fff' }
                  if (isMarked) { bg = t.warnSoft; fg = t.warn; border = t.warn }
                  if (isCurrent) border = t.accent
                  return (
                    <Box key={x.id} component="button" type="button" onClick={() => setIndex(i)} aria-label={`Question ${i + 1}`}
                      sx={{
                        aspectRatio: '1', borderRadius: '10px', cursor: 'pointer', fontFamily: fonts.mono, fontWeight: 700, fontSize: '0.85rem',
                        bgcolor: bg, color: isCurrent && !answered && !isMarked ? t.accent : fg,
                        border: `2px solid ${border}`, boxShadow: isCurrent && answered ? `0 0 0 2px ${t.surface} inset` : 'none',
                      }}>
                      {i + 1}
                    </Box>
                  )
                })}
              </Box>
              <Stack gap={1} mb={2.5}>
                <Legend color={t.ok} label={`Answered (${answeredCount})`} />
                <Legend color={t.warnSoft} border={t.warn} label={`Marked for review (${markedCount})`} />
                <Legend color={t.sunk} label={`Not answered (${unanswered})`} />
              </Stack>
              <Button fullWidth variant="contained" size="large" onClick={askSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit quiz'}
              </Button>
              {deadline && (
                <Typography fontSize="0.78rem" color="text.disabled" textAlign="center" mt={1.5}>
                  Auto-submits with your saved answers when time ends.
                </Typography>
              )}
              {left != null && left <= 0 && <Alert severity="warning" sx={{ mt: 2 }}>Time is up. Submitting your answers...</Alert>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  )
}

function Legend({ color, border, label }) {
  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: color, border: border ? `1.5px solid ${border}` : 'none' }} />
      <Typography fontSize="0.82rem" color="text.secondary">{label}</Typography>
    </Stack>
  )
}
