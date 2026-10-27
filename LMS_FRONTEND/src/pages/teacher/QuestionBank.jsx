import { useMemo, useState } from 'react'
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, IconButton,
  MenuItem, Radio, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import api, { errorMessage, fieldErrors } from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { Async, EmptyState, PageHeader, StatusChip } from '../../components/ui'
import { SearchField, TableCard } from './TeacherShared'

const emptyForm = () => ({
  questionText: '', topic: '', marks: 1, published: true,
  options: [0, 1, 2, 3].map(() => ({ optionText: '', correct: false })),
})

function correctOption(q) {
  return (q.options || []).find((o) => o.correct)
}

// Create / edit dialog. The backend matches options by position (option1..option4), ids are optional.
function QuestionDialog({ open, question, topics, onClose, onSaved }) {
  const { notify } = useFeedback()
  // The dialog is mounted fresh each time it opens, so the form starts from the given question.
  const [form, setForm] = useState(() => {
    if (!question) return emptyForm()
    const opts = [...(question.options || [])]
    while (opts.length < 4) opts.push({ optionText: '', correct: false })
    return {
      questionText: question.questionText || '', topic: question.topic || '', marks: question.marks ?? 1,
      published: question.published ?? true,
      options: opts.slice(0, 4).map((o) => ({ id: o.id, optionText: o.optionText || '', correct: !!o.correct })),
    }
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({})

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setOption = (i, patch) => setForm((f) => ({ ...f, options: f.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) }))
  const pickCorrect = (i) => setForm((f) => ({ ...f, options: f.options.map((o, j) => ({ ...o, correct: j === i })) }))

  const save = async () => {
    setError('')
    setFields({})
    if (!form.questionText.trim()) return setError('Question text is required')
    if (form.options.some((o) => !o.optionText.trim())) return setError('Every option needs text')
    if (form.options.filter((o) => o.correct).length !== 1) return setError('Mark exactly one option as correct')
    const body = {
      questionText: form.questionText.trim(),
      topic: form.topic.trim() || null,
      marks: Number(form.marks),
      published: form.published,
    }
    form.options.forEach((o, i) => {
      body[`option${i + 1}`] = { id: o.id ?? null, optionText: o.optionText.trim(), correct: o.correct }
    })
    setSaving(true)
    try {
      const res = question ? await api.put(`/question/${question.id}`, body) : await api.post('/question', body)
      notify.success(question ? 'Question updated' : 'Question added')
      onSaved(res.data)
    } catch (e) {
      setError(errorMessage(e))
      setFields(fieldErrors(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: 'inherit' }}>{question ? 'Edit question' : 'New question'}</DialogTitle>
      <DialogContent dividers>
        <Stack gap={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Question" multiline minRows={2} value={form.questionText} autoFocus
            onChange={(e) => set('questionText', e.target.value)} error={!!fields.questionText} helperText={fields.questionText} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={7}>
              <TextField label="Topic" value={form.topic} onChange={(e) => set('topic', e.target.value)}
                placeholder="e.g. Spring Security" inputProps={{ list: 'question-topics' }} />
              <datalist id="question-topics">{topics.map((t) => <option key={t} value={t} />)}</datalist>
            </Grid>
            <Grid item xs={6} sm={2.5}>
              <TextField label="Marks" type="number" value={form.marks} inputProps={{ min: 1 }}
                onChange={(e) => set('marks', e.target.value)} error={!!fields.marks} helperText={fields.marks} />
            </Grid>
            <Grid item xs={6} sm={2.5} display="flex" alignItems="center">
              <FormControlLabel control={<Switch checked={form.published} onChange={(e) => set('published', e.target.checked)} />} label="Published" />
            </Grid>
          </Grid>
          <Box>
            <Typography fontWeight={700} fontSize="0.85rem" mb={1}>Options <Typography component="span" color="text.secondary" fontSize="0.8rem">(select the correct one)</Typography></Typography>
            <Stack gap={1}>
              {form.options.map((o, i) => (
                <Stack key={i} direction="row" alignItems="center" gap={1}
                  sx={{ border: 1, borderColor: o.correct ? 'success.main' : 'divider', borderRadius: '10px', pl: 0.5, pr: 1, py: 0.5, bgcolor: o.correct ? 'success.light' : 'transparent' }}>
                  <Radio checked={o.correct} onChange={() => pickCorrect(i)} size="small" inputProps={{ 'aria-label': `Option ${i + 1} is correct` }} />
                  <TextField variant="standard" placeholder={`Option ${i + 1}`} value={o.optionText}
                    InputProps={{ disableUnderline: true }} onChange={(e) => setOption(i, { optionText: e.target.value })} />
                  {o.correct && <Chip size="small" color="success" label="Correct" />}
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving...' : question ? 'Save changes' : 'Add question'}</Button>
      </DialogActions>
    </Dialog>
  )
}

export default function QuestionBank() {
  const { notify, confirm } = useFeedback()
  const { data, loading, error, reload, setData } = useApi(() => api.get('/question').then((r) => r.data), [])
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('')
  const [dialog, setDialog] = useState({ open: false, question: null })

  const questions = useMemo(() => data || [], [data])
  const topics = useMemo(() => [...new Set(questions.map((q) => q.topic).filter(Boolean))].sort(), [questions])
  const shown = questions.filter((q) => {
    const s = search.trim().toLowerCase()
    return (!topic || q.topic === topic) && (!s || q.questionText.toLowerCase().includes(s) || (q.topic || '').toLowerCase().includes(s))
  })

  const onSaved = (saved) => {
    setData((list) => {
      const rest = (list || []).filter((q) => q.id !== saved.id)
      return dialog.question ? (list || []).map((q) => (q.id === saved.id ? saved : q)) : [saved, ...rest]
    })
    setDialog({ open: false, question: null })
  }

  const remove = async (q) => {
    const ok = await confirm({
      title: 'Delete this question?',
      message: 'It will also be removed from any quiz that uses it. Questions students already answered cannot be deleted.',
      confirmText: 'Delete', danger: true,
    })
    if (!ok) return
    try {
      await api.delete(`/question/${q.id}`)
      setData((list) => list.filter((x) => x.id !== q.id))
      notify.success('Question deleted')
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  const newButton = (
    <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setDialog({ open: true, question: null })}>New question</Button>
  )

  return (
    <Box>
      <PageHeader title="Question bank" subtitle="Multiple choice questions you can reuse in any quiz." actions={newButton} />
      <Async loading={loading} error={error} onRetry={reload}>
        {questions.length === 0 ? (
          <TableCard>
            <EmptyState icon={HelpOutlineOutlinedIcon} title="No questions yet"
              description="Add questions with four options. Then pick them when you build a quiz." action={newButton} />
          </TableCard>
        ) : (
          <TableCard toolbar={(
            <>
              <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                <Chip label={`All ${questions.length}`} onClick={() => setTopic('')} variant={topic ? 'outlined' : 'filled'} />
                {topics.map((t) => (
                  <Chip key={t} label={t} onClick={() => setTopic(topic === t ? '' : t)} variant={topic === t ? 'filled' : 'outlined'}
                    color={topic === t ? 'primary' : 'default'} sx={{ display: { xs: 'none', md: 'inline-flex' } }} />
                ))}
                {topics.length > 0 && (
                  <TextField select value={topic} onChange={(e) => setTopic(e.target.value)} sx={{ display: { md: 'none' }, minWidth: 160, width: 'auto' }}
                    SelectProps={{ displayEmpty: true }}>
                    <MenuItem value="">All topics</MenuItem>
                    {topics.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </TextField>
                )}
              </Stack>
              <SearchField value={search} onChange={setSearch} placeholder="Search questions" />
            </>
          )}>
            {shown.length === 0 ? (
              <EmptyState title="No matching questions" description="Try another search or topic." />
            ) : (
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Question</TableCell>
                      <TableCell>Topic</TableCell>
                      <TableCell>Correct answer</TableCell>
                      <TableCell align="center">Marks</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {shown.map((q) => {
                      const right = correctOption(q)
                      return (
                        <TableRow key={q.id} hover>
                          <TableCell sx={{ maxWidth: 380 }}>
                            <Typography fontWeight={600} fontSize="0.92rem">{q.questionText}</Typography>
                            <Typography fontSize="0.78rem" color="text.disabled">{(q.options || []).length} options</Typography>
                          </TableCell>
                          <TableCell>{q.topic ? <Chip size="small" label={q.topic} /> : <Typography color="text.disabled" fontSize="0.85rem">-</Typography>}</TableCell>
                          <TableCell sx={{ maxWidth: 240 }}>
                            {right ? (
                              <Stack direction="row" gap={0.75} alignItems="center">
                                <CheckCircleRoundedIcon color="success" sx={{ fontSize: 16 }} />
                                <Typography fontSize="0.88rem">{right.optionText}</Typography>
                              </Stack>
                            ) : <Typography color="error" fontSize="0.85rem">Not set</Typography>}
                          </TableCell>
                          <TableCell align="center"><Typography fontWeight={700}>{q.marks}</Typography></TableCell>
                          <TableCell><StatusChip status={q.published ? 'PUBLISHED' : 'DRAFT'} /></TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            <Tooltip title="Edit"><IconButton size="small" onClick={() => setDialog({ open: true, question: q })}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Delete"><IconButton size="small" onClick={() => remove(q)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TableCard>
        )}
      </Async>
      {dialog.open && <QuestionDialog key={dialog.question?.id ?? 'new'} open question={dialog.question} topics={topics}
        onClose={() => setDialog({ open: false, question: null })} onSaved={onSaved} />}
    </Box>
  )
}
