import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, Chip, MenuItem, Stack, TextField } from '@mui/material'
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
import api from '../../api/client'
import useApi from '../../components/ui/useApi'
import { Async, EmptyState, PageHeader } from '../../components/ui'
import { QuestionCard, isOpenQuestion } from '../student/qaShared'

const FILTERS = [
  { value: 'open', label: 'Open' },
  { value: 'answered', label: 'Answered' },
  { value: 'all', label: 'All' },
]

const EMPTY = {
  open: { icon: TaskAltRoundedIcon, title: 'All caught up', description: 'No question is waiting for your answer.' },
  answered: { icon: ForumOutlinedIcon, title: 'Nothing answered yet', description: 'Questions you answer or that get resolved show up here.' },
  all: { icon: ForumOutlinedIcon, title: 'No questions yet', description: 'When students ask about a lesson in the Q&A tab, their questions appear here.' },
}

// Questions students asked under the lessons of my courses (admin: every course).
// ?question=12 (from a notification) shows All and highlights that question.
export default function TeacherQA() {
  const [searchParams] = useSearchParams()
  const highlightId = Number(searchParams.get('question')) || null
  const [status, setStatus] = useState(highlightId ? 'all' : 'open')
  const [courseId, setCourseId] = useState('')

  const courses = useApi(() => api.get('/courses').then((r) => r.data), [])
  const { data, loading, error, reload, setData } = useApi(
    () => api.get('/questions/teacher', { params: { status, courseId: courseId || undefined } }).then((r) => r.data),
    [status, courseId],
  )

  // Update one question in place. It stays in the list until the filter changes, but the counts follow at once.
  const replace = (updated) => setData((d) => {
    const old = d.questions.find((q) => q.id === updated.id)
    const moved = old && isOpenQuestion(old) !== isOpenQuestion(updated)
    const delta = moved ? (isOpenQuestion(updated) ? 1 : -1) : 0
    return {
      counts: { ...d.counts, open: d.counts.open + delta, answered: d.counts.answered - delta },
      questions: d.questions.map((q) => (q.id === updated.id ? updated : q)),
    }
  })
  const remove = (id) => setData((d) => {
    const old = d.questions.find((q) => q.id === id)
    const open = old && isOpenQuestion(old)
    return {
      counts: { open: d.counts.open - (open ? 1 : 0), answered: d.counts.answered - (open ? 0 : 1), all: d.counts.all - 1 },
      questions: d.questions.filter((q) => q.id !== id),
    }
  })

  const counts = data?.counts
  const empty = EMPTY[status]

  return (
    <>
      <PageHeader title="Student questions" subtitle="Questions from the Q&A tab of your lessons. Students get a notification when you reply." />

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={1.5} mb={2.5}>
        <Stack direction="row" gap={0.75} flexWrap="wrap">
          {FILTERS.map((f) => (
            <Chip key={f.value} label={counts ? `${f.label} ${counts[f.value]}` : f.label}
              onClick={() => setStatus(f.value)} color={status === f.value ? 'primary' : 'default'} variant={status === f.value ? 'filled' : 'outlined'} />
          ))}
        </Stack>
        <TextField select value={courseId} onChange={(e) => setCourseId(e.target.value)} sx={{ width: { xs: '100%', sm: 260 } }}
          SelectProps={{ displayEmpty: true }} inputProps={{ 'aria-label': 'Course' }}>
          <MenuItem value="">All courses</MenuItem>
          {(courses.data || []).map((c) => <MenuItem key={c.id} value={c.id}>{c.title}</MenuItem>)}
        </TextField>
      </Stack>

      <Async loading={loading} error={error} onRetry={reload}>
        {data && data.questions.length === 0 ? (
          <Card><EmptyState icon={empty.icon} title={empty.title} description={empty.description} /></Card>
        ) : (
          <Stack gap={1.5}>
            {data?.questions.map((q) => (
              <QuestionCard key={q.id} question={q} onChange={replace} onDeleted={remove} highlight={q.id === highlightId}
                showContext contextLink={`/teacher/courses/${q.courseId}`} />
            ))}
          </Stack>
        )}
      </Async>
    </>
  )
}
