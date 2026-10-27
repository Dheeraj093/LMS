import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Checkbox, Chip, Divider, FormControlLabel, Grid, InputAdornment,
  Link, MenuItem, Stack, Switch, TextField, Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined'
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import api, { errorMessage, fieldErrors } from '../../api/client'
import { useFeedback } from '../../components/ui/Feedback'
import { EmptyState, Loading, PageError, PageHeader } from '../../components/ui'
import { CopyButton, SearchField, randomJoinCode } from './TeacherShared'
import { formatDateTime, fromInputDateTime, toInputDateTime } from '../../utils/format'
import { fonts } from '../../theme'

const AUDIENCES = [
  { value: 'ALL', label: 'Everyone enrolled', hint: 'All students enrolled in the course', icon: PublicOutlinedIcon },
  { value: 'GROUPS', label: 'Specific groups', hint: 'Only enrolled students in the chosen groups', icon: GroupsOutlinedIcon },
  { value: 'LINK', label: 'Join code only', hint: 'Only students who open the join link or code', icon: KeyOutlinedIcon },
]

const blank = {
  title: '', description: '', courseId: '', timeLimitInMinutes: 15, passingMarks: 0, maxAttempts: 1, published: false,
  audience: 'ALL', groupIds: [], joinCode: '', dueDate: '',
}

// One selectable audience tile.
function AudienceTile({ option, selected, onClick }) {
  const t = useTheme().palette.lms
  const Icon = option.icon
  return (
    <Box role="radio" aria-checked={selected} tabIndex={0} onClick={onClick} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      sx={{
        display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 1.5, borderRadius: '12px', cursor: 'pointer',
        border: `1.5px solid ${selected ? t.accent : t.line}`, bgcolor: selected ? t.accentSoft : 'transparent', transition: 'all .15s',
        '&:hover': { borderColor: selected ? t.accent : t.line2 },
      }}>
      <Icon sx={{ color: selected ? t.accent : t.muted, mt: 0.25 }} />
      <Box>
        <Typography fontWeight={700} fontSize="0.9rem">{option.label}</Typography>
        <Typography fontSize="0.8rem" color="text.secondary">{option.hint}</Typography>
      </Box>
    </Box>
  )
}

function Section({ title, subtitle, children, action }) {
  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2} mb={2}>
          <Box>
            <Typography variant="h5">{title}</Typography>
            {subtitle && <Typography fontSize="0.82rem" color="text.disabled" mt={0.25}>{subtitle}</Typography>}
          </Box>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  )
}

export default function QuizForm() {
  const { id } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const { notify } = useFeedback()

  const [form, setForm] = useState(blank)
  const [selected, setSelected] = useState([]) // question ids
  const [questions, setQuestions] = useState([])
  const [courses, setCourses] = useState([])
  const [groups, setGroups] = useState([])
  const [attemptCount, setAttemptCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({})
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('')

  // Load everything the form needs in one go.
  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const [qs, cs, gs, quiz, attempts] = await Promise.all([
          api.get('/question').then((r) => r.data),
          api.get('/courses').then((r) => r.data),
          api.get('/groups').then((r) => r.data),
          editing ? api.get(`/quiz/${id}`).then((r) => r.data) : null,
          editing ? api.get(`/quiz-attempt/quiz/${id}`).then((r) => r.data).catch(() => []) : [],
        ])
        if (!alive) return
        setQuestions(qs)
        setCourses(cs)
        setGroups(gs)
        setAttemptCount(attempts.length)
        if (quiz) {
          setForm({
            title: quiz.title || '', description: quiz.description || '', courseId: quiz.courseId ?? '',
            timeLimitInMinutes: quiz.timeLimitInMinutes ?? 15, passingMarks: quiz.passingMarks ?? 0, maxAttempts: quiz.maxAttempts ?? 1,
            published: !!quiz.published, audience: quiz.audience || 'ALL', groupIds: quiz.groupIds || [], joinCode: quiz.joinCode || '',
            dueDate: toInputDateTime(quiz.dueDate),
          })
          setSelected(quiz.questionIds || [])
        }
      } catch (e) {
        if (alive) setLoadError(e)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [id, editing])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const locked = editing && attemptCount > 0

  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])
  const totalMarks = selected.reduce((sum, qid) => sum + (byId.get(qid)?.marks || 0), 0)
  const topics = useMemo(() => [...new Set(questions.map((q) => q.topic).filter(Boolean))].sort(), [questions])
  const s = search.trim().toLowerCase()
  const shownQuestions = questions.filter((q) => (!topic || q.topic === topic) && (!s || q.questionText.toLowerCase().includes(s)))
  const passingTooHigh = Number(form.passingMarks) > totalMarks
  const codeValid = !form.joinCode || /^[A-Z0-9]{4,12}$/.test(form.joinCode)
  const shareLink = form.joinCode ? `${window.location.origin}/join/${form.joinCode}` : ''

  const toggle = (qid) => setSelected((list) => (list.includes(qid) ? list.filter((x) => x !== qid) : [...list, qid]))
  const allShownSelected = shownQuestions.length > 0 && shownQuestions.every((q) => selected.includes(q.id))
  const toggleAllShown = () => setSelected((list) => (allShownSelected
    ? list.filter((x) => !shownQuestions.some((q) => q.id === x))
    : [...new Set([...list, ...shownQuestions.map((q) => q.id)])]))

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setFields({})
    if (!form.title.trim()) return setError('Title is required')
    if (!selected.length) return setError('Select at least one question')
    if (passingTooHigh) return setError(`Passing marks cannot be more than total marks (${totalMarks})`)
    if (!codeValid) return setError('Join code must be 4 to 12 letters or digits')
    if (form.audience === 'GROUPS' && !form.groupIds.length) return setError('Pick at least one group, or choose another audience')

    const body = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      courseId: form.courseId === '' ? null : Number(form.courseId),
      timeLimitInMinutes: Number(form.timeLimitInMinutes),
      passingMarks: Number(form.passingMarks),
      maxAttempts: Number(form.maxAttempts) || 1,
      published: form.published,
      questionsIdList: selected,
      audience: form.audience,
      groupIds: form.audience === 'GROUPS' ? form.groupIds : [],
      joinCode: form.joinCode || null,
      dueDate: fromInputDateTime(form.dueDate),
    }
    setSaving(true)
    try {
      const res = editing ? await api.put(`/quiz/${id}`, body) : await api.post('/quiz', body)
      notify.success(editing ? 'Quiz saved' : `Quiz created${res.data.joinCode ? ` · join code ${res.data.joinCode}` : ''}`)
      navigate('/teacher/quizzes')
    } catch (err) {
      setError(errorMessage(err))
      setFields(fieldErrors(err))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  const crumbs = [{ label: 'Quizzes', to: '/teacher/quizzes' }, { label: editing ? 'Edit quiz' : 'New quiz' }]
  if (loading) return <Box><PageHeader title={editing ? 'Edit quiz' : 'New quiz'} crumbs={crumbs} /><Loading /></Box>
  if (loadError) return <Box><PageHeader title={editing ? 'Edit quiz' : 'New quiz'} crumbs={crumbs} /><PageError error={loadError} /></Box>

  const selectedGroups = groups.filter((g) => form.groupIds.includes(g.id))

  return (
    <Box component="form" onSubmit={save} noValidate>
      <PageHeader
        title={editing ? 'Edit quiz' : 'New quiz'}
        subtitle="Pick questions from your bank, set the rules and choose who can take it."
        crumbs={crumbs}
        actions={(
          <>
            <Button variant="outlined" onClick={() => navigate('/teacher/quizzes')}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save quiz' : 'Create quiz'}</Button>
          </>
        )}
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Stack gap={2}>
            <Section title="Details">
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField label="Title" required value={form.title} onChange={(e) => set('title', e.target.value)}
                    error={!!fields.title} helperText={fields.title} />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Description" multiline minRows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField select label="Course" value={form.courseId} onChange={(e) => set('courseId', e.target.value)}
                    helperText="Students see quizzes of courses they joined">
                    <MenuItem value=""><em>No course</em></MenuItem>
                    {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.title}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField label="Time limit" type="number" value={form.timeLimitInMinutes} inputProps={{ min: 1 }}
                    onChange={(e) => set('timeLimitInMinutes', e.target.value)} error={!!fields.timeLimitInMinutes} helperText={fields.timeLimitInMinutes}
                    InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField label="Max attempts" type="number" value={form.maxAttempts} inputProps={{ min: 1 }}
                    onChange={(e) => set('maxAttempts', e.target.value)} error={!!fields.maxAttempts} helperText={fields.maxAttempts} />
                </Grid>
                {/* Optional closing time: after it students cannot start a new attempt. It also shows on the calendar. */}
                <Grid item xs={12} sm={6}>
                  <TextField label="Closes at (optional)" type="datetime-local" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)}
                    InputLabelProps={{ shrink: true }} error={!!fields.dueDate}
                    helperText={fields.dueDate || (form.dueDate
                      ? (new Date(form.dueDate) < new Date() ? `Closed on ${formatDateTime(form.dueDate)}. Students cannot start it.` : 'No new attempts after this time')
                      : 'Leave empty to keep it open')}
                    InputProps={form.dueDate ? { endAdornment: <InputAdornment position="end"><Button size="small" onClick={() => set('dueDate', '')}>Clear</Button></InputAdornment> } : undefined} />
                </Grid>
              </Grid>
            </Section>

            <Section
              title="Questions"
              subtitle={`${selected.length} selected · ${totalMarks} marks total`}
              action={<Link component={RouterLink} to="/teacher/questions" fontSize="0.85rem" fontWeight={600} underline="hover">Question bank</Link>}
            >
              {locked && (
                <Alert severity="info" icon={<LockOutlinedIcon fontSize="small" />} sx={{ mb: 2 }}>
                  Students already attempted this quiz ({attemptCount} attempt{attemptCount === 1 ? '' : 's'}), so its questions cannot be changed.
                </Alert>
              )}
              {questions.length === 0 ? (
                <EmptyState title="Your question bank is empty" description="Add some questions first, then come back to build the quiz."
                  action={<Button component={RouterLink} to="/teacher/questions" variant="contained">Add questions</Button>} />
              ) : (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} mb={1.5}>
                    <SearchField value={search} onChange={setSearch} placeholder="Search questions" sx={{ maxWidth: { sm: 'none' } }} />
                    {topics.length > 0 && (
                      <TextField select value={topic} onChange={(e) => setTopic(e.target.value)} SelectProps={{ displayEmpty: true }} sx={{ width: { sm: 200 } }}>
                        <MenuItem value="">All topics</MenuItem>
                        {topics.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </TextField>
                    )}
                  </Stack>
                  <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}>
                    <Stack direction="row" alignItems="center" sx={{ px: 1, py: 0.5, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
                      <Checkbox size="small" checked={allShownSelected} indeterminate={!allShownSelected && shownQuestions.some((q) => selected.includes(q.id))}
                        onChange={toggleAllShown} disabled={locked || !shownQuestions.length} inputProps={{ 'aria-label': 'Select all shown' }} />
                      <Typography fontSize="0.75rem" fontWeight={700} color="text.disabled" letterSpacing="0.06em" textTransform="uppercase" flex={1}>
                        Question
                      </Typography>
                      <Typography fontSize="0.75rem" fontWeight={700} color="text.disabled" letterSpacing="0.06em" textTransform="uppercase" pr={1}>Marks</Typography>
                    </Stack>
                    <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
                      {shownQuestions.length === 0 && <Typography color="text.disabled" p={2} fontSize="0.9rem">No matching questions.</Typography>}
                      {shownQuestions.map((q) => {
                        const on = selected.includes(q.id)
                        return (
                          <Stack key={q.id} direction="row" alignItems="flex-start" onClick={() => !locked && toggle(q.id)}
                            sx={{ px: 1, py: 1, cursor: locked ? 'default' : 'pointer', borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 },
                              bgcolor: on ? 'action.selected' : 'transparent', '&:hover': { bgcolor: locked ? undefined : 'action.hover' } }}>
                            <Checkbox size="small" checked={on} disabled={locked} onClick={(e) => e.stopPropagation()} onChange={() => toggle(q.id)} sx={{ mt: -0.5 }} />
                            <Box flex={1} minWidth={0}>
                              <Typography fontSize="0.9rem" fontWeight={600}>{q.questionText}</Typography>
                              <Stack direction="row" gap={0.75} mt={0.5} flexWrap="wrap">
                                {q.topic && <Chip size="small" label={q.topic} />}
                                {!q.published && <Chip size="small" label="Draft" variant="outlined" />}
                              </Stack>
                            </Box>
                            <Typography fontWeight={700} fontFamily={fonts.mono} fontSize="0.85rem" pr={1.5} pt={0.25}>{q.marks}</Typography>
                          </Stack>
                        )
                      })}
                    </Box>
                  </Box>
                </>
              )}
            </Section>
          </Stack>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack gap={2} sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
            <Section title="Scoring">
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={2}>
                <Typography color="text.secondary" fontWeight={600} fontSize="0.9rem">Total marks</Typography>
                <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, fontSize: '1.8rem' }}>{totalMarks}</Typography>
              </Stack>
              <TextField label="Passing marks" type="number" value={form.passingMarks} inputProps={{ min: 0, max: totalMarks }}
                onChange={(e) => set('passingMarks', e.target.value)} error={passingTooHigh || !!fields.passingMarks}
                helperText={passingTooHigh ? `Must be at most ${totalMarks}` : fields.passingMarks || (totalMarks ? `${Math.round((Number(form.passingMarks) / totalMarks) * 100) || 0}% of total` : 'Select questions first')} />
              <Divider sx={{ my: 2 }} />
              <FormControlLabel control={<Switch checked={form.published} onChange={(e) => set('published', e.target.checked)} />}
                label={<Box><Typography fontWeight={600} fontSize="0.9rem">Published</Typography><Typography fontSize="0.78rem" color="text.secondary">Students can start it</Typography></Box>} />
            </Section>

            <Section title="Who can take it">
              <Stack gap={1} role="radiogroup">
                {AUDIENCES.map((a) => (
                  <AudienceTile key={a.value} option={a} selected={form.audience === a.value} onClick={() => set('audience', a.value)} />
                ))}
              </Stack>

              {form.audience === 'GROUPS' && (
                <Box mt={2}>
                  {groups.length === 0 ? (
                    <Alert severity="warning">
                      You have no groups yet. <Link component={RouterLink} to="/teacher/groups/new" fontWeight={700}>Create a group</Link>
                    </Alert>
                  ) : (
                    <Autocomplete
                      multiple
                      options={groups}
                      value={selectedGroups}
                      getOptionLabel={(g) => g.name}
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      onChange={(_, v) => set('groupIds', v.map((g) => g.id))}
                      renderOption={(props, g) => (
                        <li {...props} key={g.id}>
                          <Box>
                            <Typography fontSize="0.9rem" fontWeight={600}>{g.name}</Typography>
                            <Typography fontSize="0.75rem" color="text.secondary">{g.memberCount ?? 0} members</Typography>
                          </Box>
                        </li>
                      )}
                      renderInput={(params) => <TextField {...params} label="Groups" placeholder={selectedGroups.length ? '' : 'Pick groups'} />}
                    />
                  )}
                </Box>
              )}

              <Box mt={2}>
                <Typography fontWeight={700} fontSize="0.85rem" mb={1}>
                  Join code {form.audience !== 'LINK' && <Typography component="span" color="text.disabled" fontSize="0.8rem">(optional)</Typography>}
                </Typography>
                <Stack direction="row" gap={1} alignItems="flex-start">
                  <TextField
                    value={form.joinCode}
                    placeholder={form.audience === 'LINK' ? 'Auto on save' : 'None'}
                    onChange={(e) => set('joinCode', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))}
                    error={!codeValid || !!fields.joinCode}
                    helperText={!codeValid ? '4 to 12 letters or digits' : fields.joinCode}
                    inputProps={{ style: { fontFamily: fonts.mono, fontWeight: 700, letterSpacing: '0.08em' }, 'aria-label': 'Join code' }}
                    InputProps={{ endAdornment: form.joinCode && codeValid ? <InputAdornment position="end"><CopyButton text={form.joinCode} title="Copy code" /></InputAdornment> : null }}
                  />
                  <Button variant="outlined" onClick={() => set('joinCode', randomJoinCode())} startIcon={<AutorenewRoundedIcon />} sx={{ flexShrink: 0 }}>
                    Generate
                  </Button>
                </Stack>
                {form.audience === 'LINK' && !form.joinCode && (
                  <Typography fontSize="0.78rem" color="text.secondary" mt={0.75}>Leave empty and a code is made for you when you save.</Typography>
                )}
                {shareLink && codeValid && (
                  <Stack direction="row" alignItems="center" gap={0.5} mt={1} sx={{ bgcolor: 'action.hover', borderRadius: '8px', pl: 1.25, pr: 0.5, py: 0.25 }}>
                    <Typography fontSize="0.8rem" fontFamily={fonts.mono} noWrap flex={1} title={shareLink}>{shareLink}</Typography>
                    <CopyButton text={shareLink} title="Copy link" />
                  </Stack>
                )}
              </Box>
            </Section>
          </Stack>
        </Grid>
      </Grid>
      {/* Second save bar at the bottom for phones, where the header buttons scroll out of view */}
      <Stack direction="row" gap={1} justifyContent="flex-end" mt={2} sx={{ display: { md: 'none' } }}>
        <Button variant="outlined" onClick={() => navigate('/teacher/quizzes')}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save quiz' : 'Create quiz'}</Button>
      </Stack>
    </Box>
  )
}
