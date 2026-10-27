import { useState } from 'react'
import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined'
import api, { errorMessage, fieldErrors } from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { Async, EmptyState } from '../../components/ui'
import { QA_MAX, QuestionCard } from './qaShared'

// The Q&A tab of the course player: questions about the open lesson, newest first, with their answers.
export default function LessonQA({ courseId, lessonId }) {
  const { data, loading, error, reload, setData } = useApi(
    () => api.get(`/courses/${courseId}/questions`, { params: { lessonId } }).then((r) => r.data), [courseId, lessonId],
  )
  const questions = data || []

  const replace = (updated) => setData((list) => list.map((q) => (q.id === updated.id ? updated : q)))
  const remove = (id) => setData((list) => list.filter((q) => q.id !== id))

  return (
    <Stack gap={2.5}>
      <AskBox courseId={courseId} lessonId={lessonId} onAsked={(q) => setData((list) => [q, ...(list || [])])} />
      <Async loading={loading && !data} error={error} onRetry={reload}>
        {questions.length === 0 ? (
          <EmptyState icon={ForumOutlinedIcon} title="No questions yet"
            description="Stuck on something in this lesson? Ask it above. Your teacher and classmates can answer." />
        ) : (
          <Stack gap={1.5}>
            <Typography fontSize="0.85rem" color="text.secondary" fontWeight={600}>
              {questions.length} question{questions.length === 1 ? '' : 's'} about this lesson
            </Typography>
            {questions.map((q) => (
              <QuestionCard key={q.id} question={q} onChange={replace} onDeleted={remove} />
            ))}
          </Stack>
        )}
      </Async>
    </Stack>
  )
}

function AskBox({ courseId, lessonId, onAsked }) {
  const { notify } = useFeedback()
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [fieldError, setFieldError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    setFieldError('')
    try {
      const res = await api.post(`/courses/${courseId}/questions`, { lessonId, body: body.trim() })
      setBody('')
      onAsked(res.data)
      notify.success('Question posted. Your teacher will be notified.')
    } catch (err) {
      setFieldError(fieldErrors(err).body || '')
      notify.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box component="form" onSubmit={submit} sx={{ p: 2, borderRadius: '12px', border: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
      <Typography fontWeight={700} mb={1}>Ask a question about this lesson</Typography>
      <TextField multiline minRows={3} maxRows={12} placeholder="What is unclear? Add details so others can help."
        value={body} onChange={(e) => setBody(e.target.value)} inputProps={{ maxLength: QA_MAX, 'aria-label': 'Your question' }}
        error={!!fieldError} helperText={fieldError || (body.length > QA_MAX - 400 ? `${body.length} / ${QA_MAX}` : undefined)} />
      <Stack direction="row" justifyContent="flex-end" mt={1.5}>
        <Button type="submit" variant="contained" disabled={!body.trim() || saving}>{saving ? 'Posting...' : 'Post question'}</Button>
      </Stack>
    </Box>
  )
}
