import { useEffect, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, Button, Chip, IconButton, Link, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useFeedback } from '../../components/ui/Feedback'
import { UserAvatar } from '../../components/ui'
import { timeAgo } from '../../utils/format'

// Shared by the student Q&A tab (LessonQA) and the teacher Q&A page (TeacherQA).

export const QA_MAX = 4000

// "Open" on the teacher page: not resolved and no answer from the teacher yet (same rule as the backend).
export const isOpenQuestion = (q) => !q.resolved && !q.teacherAnswered

// After an answer is deleted the question summary must be worked out again.
function withoutAnswer(q, answerId) {
  const answers = q.answers.filter((a) => a.id !== answerId)
  return { ...q, answers, answerCount: answers.length, teacherAnswered: answers.some((a) => a.fromTeacher) }
}

// One question with its answers, a reply box, and resolve / delete actions.
// onChange(updatedQuestion) and onDeleted(id) let the parent update its list without reloading.
// showContext adds "Course › Lesson" with a link (used on the teacher page).
export function QuestionCard({ question: q, onChange, onDeleted, showContext, contextLink, highlight }) {
  const t = useTheme().palette.lms
  const { user } = useAuth()
  const { notify, confirm } = useFeedback()
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)

  // Opened from a notification: bring the question into view.
  useEffect(() => {
    if (highlight && ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlight])

  const run = async (action) => {
    setBusy(true)
    try {
      await action()
    } catch (e) {
      notify.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const toggleResolved = () => run(async () => {
    const res = await api.patch(`/questions/${q.id}/resolve`, { resolved: !q.resolved })
    onChange(res.data)
    notify.success(res.data.resolved ? 'Marked as resolved' : 'Question reopened')
  })

  const deleteQuestion = async () => {
    const ok = await confirm({
      title: 'Delete this question?',
      message: q.answerCount ? `Its ${q.answerCount} answer${q.answerCount === 1 ? '' : 's'} will be deleted too.` : 'This cannot be undone.',
      confirmText: 'Delete',
      danger: true,
    })
    if (ok) {
      run(async () => {
        await api.delete(`/questions/${q.id}`)
        onDeleted(q.id)
        notify.success('Question deleted')
      })
    }
  }

  const deleteAnswer = async (a) => {
    const ok = await confirm({ title: 'Delete this answer?', message: 'This cannot be undone.', confirmText: 'Delete', danger: true })
    if (ok) {
      run(async () => {
        await api.delete(`/answers/${a.id}`)
        onChange(withoutAnswer(q, a.id))
        notify.success('Answer deleted')
      })
    }
  }

  const authorIsStaff = q.authorRole === 'TEACHER' || q.authorRole === 'ADMIN'

  return (
    <Box ref={ref} id={`question-${q.id}`} sx={{
      p: { xs: 2, sm: 2.5 }, borderRadius: '14px', border: 1, bgcolor: 'background.paper',
      borderColor: highlight ? t.accent : 'divider',
      boxShadow: highlight ? `0 0 0 3px ${t.accentSoft}` : 'none',
      transition: 'box-shadow .3s, border-color .3s',
    }}>
      {showContext && (
        <Stack direction="row" alignItems="center" flexWrap="wrap" columnGap={0.5} mb={1.25} fontSize="0.8rem" color="text.secondary">
          <Typography fontSize="0.8rem" fontWeight={600} color="text.primary" sx={{ wordBreak: 'break-word' }}>{q.courseTitle}</Typography>
          <ChevronRightRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
          <Typography fontSize="0.8rem" sx={{ wordBreak: 'break-word' }}>{q.lessonTitle}</Typography>
          {contextLink && (
            <Link component={RouterLink} to={contextLink} underline="hover" fontSize="0.8rem" fontWeight={600} ml={{ xs: 0, sm: 1 }}>
              Open course
            </Link>
          )}
        </Stack>
      )}

      <Stack direction="row" gap={1.5} alignItems="flex-start">
        <UserAvatar name={q.authorName} src={q.authorAvatarUrl} size={36} />
        <Box flex={1} minWidth={0}>
          <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
            <Typography fontWeight={700} fontSize="0.9rem">{q.authorName}{q.authorId === user?.id ? ' (you)' : ''}</Typography>
            {authorIsStaff && <TeacherChip />}
            <Typography fontSize="0.78rem" color="text.disabled">{timeAgo(q.createdAt)}</Typography>
            {q.resolved && (
              <Chip size="small" icon={<CheckCircleRoundedIcon />} label="Resolved"
                sx={{ color: t.ok, bgcolor: t.okSoft, '& .MuiChip-icon': { color: t.ok, fontSize: 15 } }} />
            )}
          </Stack>
          <Typography mt={0.5} fontSize="0.95rem" sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{q.body}</Typography>

          {(q.canResolve || q.canDelete) && (
            <Stack direction="row" gap={0.5} mt={1} ml={-1} flexWrap="wrap">
              {q.canResolve && (
                <Button size="small" color="inherit" disabled={busy} onClick={toggleResolved}
                  startIcon={q.resolved ? <ReplayRoundedIcon /> : <CheckCircleOutlineRoundedIcon />}
                  sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {q.resolved ? 'Reopen' : 'Mark resolved'}
                </Button>
              )}
              {q.canDelete && (
                <Button size="small" color="inherit" disabled={busy} onClick={deleteQuestion} startIcon={<DeleteOutlineRoundedIcon />}
                  sx={{ color: 'text.secondary', fontWeight: 600, '&:hover': { color: t.bad } }}>
                  Delete
                </Button>
              )}
            </Stack>
          )}
        </Box>
      </Stack>

      {/* Answers, oldest first, indented under the question */}
      <Box sx={{ ml: { xs: 0, sm: 6 }, mt: 1.5 }}>
        {q.answers.length > 0 && (
          <Stack gap={1} mb={1.5}>
            {q.answers.map((a) => (
              <Answer key={a.id} answer={a} mine={a.authorId === user?.id} busy={busy} onDelete={() => deleteAnswer(a)} />
            ))}
          </Stack>
        )}
        <ReplyBox questionId={q.id} onPosted={onChange} />
      </Box>
    </Box>
  )
}

function TeacherChip() {
  const t = useTheme().palette.lms
  return <Chip size="small" label="Teacher" sx={{ color: t.accent, bgcolor: t.accentSoft }} />
}

// One answer. Answers from the course teacher (or an admin) get a soft accent background.
function Answer({ answer: a, mine, busy, onDelete }) {
  const t = useTheme().palette.lms
  return (
    <Stack direction="row" gap={1.25} alignItems="flex-start" sx={{
      p: 1.5, borderRadius: '10px',
      bgcolor: a.fromTeacher ? t.accentSoft : 'action.hover',
      boxShadow: a.fromTeacher ? `inset 3px 0 0 ${t.accent}` : 'none',
    }}>
      <UserAvatar name={a.authorName} src={a.authorAvatarUrl} size={28} />
      <Box flex={1} minWidth={0}>
        <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
          <Typography fontWeight={700} fontSize="0.85rem">{a.authorName}{mine ? ' (you)' : ''}</Typography>
          {a.fromTeacher && <TeacherChip />}
          <Typography fontSize="0.75rem" color="text.disabled">{timeAgo(a.createdAt)}</Typography>
        </Stack>
        <Typography fontSize="0.9rem" mt={0.25} sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{a.body}</Typography>
      </Box>
      {a.canDelete && (
        <Tooltip title="Delete answer">
          <span>
            <IconButton size="small" disabled={busy} onClick={onDelete} aria-label="Delete answer" sx={{ mt: -0.5, mr: -0.5 }}>
              <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Stack>
  )
}

// A one-line reply field that grows as you type; Post appears once there is text.
function ReplyBox({ questionId, onPosted }) {
  const { notify } = useFeedback()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    try {
      const res = await api.post(`/questions/${questionId}/answers`, { body: text.trim() })
      setText('')
      onPosted(res.data)
    } catch (err) {
      notify.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack component="form" onSubmit={submit} direction="row" gap={1} alignItems="flex-end">
      <TextField multiline maxRows={8} placeholder="Write a reply..." value={text} onChange={(e) => setText(e.target.value)}
        inputProps={{ maxLength: QA_MAX, 'aria-label': 'Write a reply' }} />
      {text.trim() && (
        <Button type="submit" variant="contained" disabled={saving} endIcon={<SendRoundedIcon />} sx={{ flexShrink: 0 }}>
          {saving ? 'Posting...' : 'Reply'}
        </Button>
      )}
    </Stack>
  )
}
