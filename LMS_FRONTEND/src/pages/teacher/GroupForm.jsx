import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Grid, Stack, TextField, Typography,
} from '@mui/material'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import api, { errorMessage, fieldErrors } from '../../api/client'
import { useFeedback } from '../../components/ui/Feedback'
import { Loading, PageError, PageHeader, UserAvatar } from '../../components/ui'
import { SearchField } from './TeacherShared'

export default function GroupForm() {
  const { id } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const { notify, confirm } = useFeedback()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [members, setMembers] = useState([]) // StudentSummary objects, so we can show names of selected students
  const [loading, setLoading] = useState(editing)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({})

  const [search, setSearch] = useState('')
  const [students, setStudents] = useState([])
  const [searching, setSearching] = useState(true)
  const [searchError, setSearchError] = useState('')

  // Load the group when editing.
  useEffect(() => {
    if (!editing) return
    let alive = true
    api.get(`/groups/${id}`)
      .then((r) => {
        if (!alive) return
        setName(r.data.name || '')
        setDescription(r.data.description || '')
        setMembers(r.data.members || [])
      })
      .catch((e) => alive && setLoadError(e))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [id, editing])

  // Search students on the server, 300 ms after the user stops typing.
  useEffect(() => {
    let alive = true
    setSearching(true)
    const timer = setTimeout(() => {
      api.get('/users/students', { params: { search: search.trim() || undefined } })
        .then((r) => { if (alive) { setStudents(r.data); setSearchError('') } })
        .catch((e) => alive && setSearchError(errorMessage(e)))
        .finally(() => alive && setSearching(false))
    }, 300)
    return () => { alive = false; clearTimeout(timer) }
  }, [search])

  const selectedIds = new Set(members.map((m) => m.id))
  const toggle = (st) => setMembers((list) => (list.some((m) => m.id === st.id) ? list.filter((m) => m.id !== st.id) : [...list, st]))
  const allShownSelected = students.length > 0 && students.every((st) => selectedIds.has(st.id))
  const toggleAll = () => setMembers((list) => (allShownSelected
    ? list.filter((m) => !students.some((st) => st.id === m.id))
    : [...list, ...students.filter((st) => !list.some((m) => m.id === st.id))]))

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setFields({})
    if (!name.trim()) return setError('Group name is required')
    setSaving(true)
    try {
      const body = { name: name.trim(), description: description.trim() || null, memberIds: members.map((m) => m.id) }
      if (editing) await api.put(`/groups/${id}`, body)
      else await api.post('/groups', body)
      notify.success(editing ? 'Group saved' : 'Group created')
      navigate('/teacher/groups')
    } catch (err) {
      setError(errorMessage(err))
      setFields(fieldErrors(err))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!(await confirm({ title: `Delete "${name}"?`, message: 'This cannot be undone.', confirmText: 'Delete', danger: true }))) return
    try {
      await api.delete(`/groups/${id}`)
      notify.success('Group deleted')
      navigate('/teacher/groups')
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  const title = editing ? 'Edit group' : 'New group'
  const crumbs = [{ label: 'Groups', to: '/teacher/groups' }, { label: editing ? name || 'Edit' : 'New group' }]
  if (loading) return <Box><PageHeader title={title} crumbs={crumbs} /><Loading /></Box>
  if (loadError) return <Box><PageHeader title={title} crumbs={crumbs} /><PageError error={loadError} /></Box>

  return (
    <Box component="form" onSubmit={save} noValidate>
      <PageHeader
        title={title}
        subtitle="Name the group and pick its students."
        crumbs={crumbs}
        actions={(
          <>
            {editing && <Button color="error" variant="outlined" startIcon={<DeleteOutlineRoundedIcon />} onClick={remove}>Delete</Button>}
            <Button variant="outlined" onClick={() => navigate('/teacher/groups')}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save group' : 'Create group'}</Button>
          </>
        )}
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Typography variant="h5" mb={2}>Details</Typography>
              <Stack gap={2}>
                <TextField label="Group name" required value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 100 }}
                  error={!!fields.name} helperText={fields.name} placeholder="e.g. Morning batch" />
                <TextField label="Description" multiline minRows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Stack>
              <Typography fontWeight={700} fontSize="0.85rem" mt={3} mb={1}>Selected students ({members.length})</Typography>
              {members.length === 0 ? (
                <Typography color="text.disabled" fontSize="0.9rem">No students selected yet. Pick them from the list.</Typography>
              ) : (
                <Stack direction="row" gap={0.75} flexWrap="wrap">
                  {members.map((m) => (
                    <Chip key={m.id} avatar={<Box component="span" sx={{ display: 'flex' }}><UserAvatar name={m.name} src={m.avatarUrl} size={22} /></Box>}
                      label={m.name} onDelete={() => toggle(m)} variant="outlined" />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} mb={2}>
                <Box>
                  <Typography variant="h5">Students</Typography>
                  <Typography fontSize="0.82rem" color="text.disabled">Search by name or email</Typography>
                </Box>
                <SearchField value={search} onChange={setSearch} placeholder="Search students" />
              </Stack>
              {searchError && <Alert severity="error" sx={{ mb: 1 }}>{searchError}</Alert>}
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}>
                <Stack direction="row" alignItems="center" sx={{ px: 1, py: 0.5, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
                  <Checkbox size="small" checked={allShownSelected} onChange={toggleAll} disabled={!students.length}
                    indeterminate={!allShownSelected && students.some((st) => selectedIds.has(st.id))} inputProps={{ 'aria-label': 'Select all shown' }} />
                  <Typography fontSize="0.75rem" fontWeight={700} color="text.disabled" letterSpacing="0.06em" textTransform="uppercase" flex={1}>
                    {students.length} student{students.length === 1 ? '' : 's'}
                  </Typography>
                  {searching && <CircularProgress size={16} sx={{ mr: 1 }} />}
                </Stack>
                <Box sx={{ maxHeight: 440, overflowY: 'auto' }}>
                  {!searching && students.length === 0 && (
                    <Typography color="text.disabled" p={2} fontSize="0.9rem">{search ? 'No students match this search.' : 'There are no students yet.'}</Typography>
                  )}
                  {students.map((st) => {
                    const on = selectedIds.has(st.id)
                    return (
                      <Stack key={st.id} direction="row" alignItems="center" gap={1} onClick={() => toggle(st)}
                        sx={{ px: 1, py: 0.75, cursor: 'pointer', borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 },
                          bgcolor: on ? 'action.selected' : 'transparent', '&:hover': { bgcolor: 'action.hover' } }}>
                        <Checkbox size="small" checked={on} onClick={(e) => e.stopPropagation()} onChange={() => toggle(st)} inputProps={{ 'aria-label': st.name }} />
                        <UserAvatar name={st.name} src={st.avatarUrl} size={34} />
                        <Box minWidth={0}>
                          <Typography fontWeight={600} fontSize="0.9rem" noWrap>{st.name}</Typography>
                          <Typography fontSize="0.78rem" color="text.secondary" noWrap>{st.email}</Typography>
                        </Box>
                      </Stack>
                    )
                  })}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Second save bar at the bottom for phones, where the header buttons scroll out of view */}
      <Stack direction="row" gap={1} justifyContent="flex-end" mt={2} sx={{ display: { md: 'none' } }}>
        <Button variant="outlined" onClick={() => navigate('/teacher/groups')}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save group' : 'Create group'}</Button>
      </Stack>
    </Box>
  )
}
