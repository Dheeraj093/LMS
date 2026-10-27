import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Grid, Link, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import api, { errorMessage, fieldErrors } from '../../api/client'
import { useFeedback } from '../../components/ui/Feedback'
import { Loading, PageError, PageHeader } from '../../components/ui'
import { fromInputDateTime, toInputDateTime } from '../../utils/format'

// Default due date: one week from now at 23:59.
function nextWeek() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  d.setHours(23, 59, 0, 0)
  return toInputDateTime(d)
}

export default function AssignmentForm() {
  const { id } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const { notify } = useFeedback()
  const [form, setForm] = useState({ title: '', description: '', courseId: '', dueDate: nextWeek(), totalMarks: 100, audience: 'ALL', groupIds: [] })
  const [courses, setCourses] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({})

  useEffect(() => {
    let alive = true
    Promise.all([
      api.get('/courses').then((r) => r.data),
      api.get('/groups').then((r) => r.data),
      editing ? api.get(`/assignment/${id}`).then((r) => r.data) : null,
    ])
      .then(([cs, gs, a]) => {
        if (!alive) return
        setCourses(cs)
        setGroups(gs)
        if (a) {
          setForm({
            title: a.title || '', description: a.description || '', courseId: a.courseId ?? '', dueDate: toInputDateTime(a.dueDate),
            totalMarks: a.totalMarks ?? 100, audience: a.audience === 'GROUPS' ? 'GROUPS' : 'ALL', groupIds: a.groupIds || [],
          })
        }
      })
      .catch((e) => alive && setLoadError(e))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [id, editing])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setFields({})
    if (!form.title.trim()) return setError('Title is required')
    if (!form.courseId) return setError('Pick a course')
    if (!form.dueDate) return setError('Due date is required')
    if (form.audience === 'GROUPS' && !form.groupIds.length) return setError('Pick at least one group, or choose everyone enrolled')
    const body = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      courseId: Number(form.courseId),
      dueDate: fromInputDateTime(form.dueDate),
      totalMarks: Number(form.totalMarks),
      audience: form.audience,
      groupIds: form.audience === 'GROUPS' ? form.groupIds : [],
    }
    setSaving(true)
    try {
      const res = editing ? await api.put(`/assignment/${id}`, body) : await api.post('/assignment', body)
      notify.success(editing ? 'Assignment saved' : 'Assignment created')
      navigate(`/teacher/assignments/${res.data.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setFields(fieldErrors(err))
    } finally {
      setSaving(false)
    }
  }

  const title = editing ? 'Edit assignment' : 'New assignment'
  const crumbs = [{ label: 'Grading', to: '/teacher/assignments' }, { label: title }]
  if (loading) return <Box><PageHeader title={title} crumbs={crumbs} /><Loading /></Box>
  if (loadError) return <Box><PageHeader title={title} crumbs={crumbs} /><PageError error={loadError} /></Box>

  const selectedGroups = groups.filter((g) => form.groupIds.includes(g.id))

  return (
    <Box component="form" onSubmit={save} noValidate maxWidth={820}>
      <PageHeader title={title} subtitle="Students hand in files or a link before the due date. Late work is marked late." crumbs={crumbs} />
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Title" required value={form.title} onChange={(e) => set('title', e.target.value)} error={!!fields.title} helperText={fields.title} autoFocus={!editing} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Instructions" multiline minRows={4} value={form.description} onChange={(e) => set('description', e.target.value)}
                placeholder="What should students hand in?" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Course" required value={form.courseId} onChange={(e) => set('courseId', e.target.value)}
                error={!!fields.courseId} helperText={fields.courseId || (courses.length === 0 ? 'Create a course first' : undefined)}>
                {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.title}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField label="Due date" type="datetime-local" required value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)}
                InputLabelProps={{ shrink: true }} error={!!fields.dueDate} helperText={fields.dueDate} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField label="Total marks" type="number" required value={form.totalMarks} inputProps={{ min: 1 }}
                onChange={(e) => set('totalMarks', e.target.value)} error={!!fields.totalMarks} helperText={fields.totalMarks} />
            </Grid>
            <Grid item xs={12}>
              <Typography fontWeight={700} fontSize="0.85rem" mb={1}>Who should submit</Typography>
              <ToggleButtonGroup exclusive value={form.audience} onChange={(_, v) => v && set('audience', v)} size="small">
                <ToggleButton value="ALL"><PublicOutlinedIcon fontSize="small" sx={{ mr: 0.75 }} />Everyone enrolled</ToggleButton>
                <ToggleButton value="GROUPS"><GroupsOutlinedIcon fontSize="small" sx={{ mr: 0.75 }} />Specific groups</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            {form.audience === 'GROUPS' && (
              <Grid item xs={12}>
                {groups.length === 0 ? (
                  <Alert severity="warning">You have no groups yet. <Link component={RouterLink} to="/teacher/groups/new" fontWeight={700}>Create a group</Link></Alert>
                ) : (
                  <Autocomplete
                    multiple options={groups} value={selectedGroups} getOptionLabel={(g) => g.name} isOptionEqualToValue={(a, b) => a.id === b.id}
                    onChange={(_, v) => set('groupIds', v.map((g) => g.id))}
                    renderOption={(props, g) => (
                      <li {...props} key={g.id}>
                        <Box>
                          <Typography fontSize="0.9rem" fontWeight={600}>{g.name}</Typography>
                          <Typography fontSize="0.75rem" color="text.secondary">{g.memberCount ?? 0} members</Typography>
                        </Box>
                      </li>
                    )}
                    renderInput={(params) => <TextField {...params} label="Groups" helperText="Only enrolled students in these groups will see it" />}
                  />
                )}
              </Grid>
            )}
          </Grid>
          <Stack direction="row" gap={1} justifyContent="flex-end" mt={3}>
            <Button variant="outlined" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Create assignment'}</Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
