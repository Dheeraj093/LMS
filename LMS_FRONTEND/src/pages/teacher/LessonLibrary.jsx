import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined'
import api, { errorMessage } from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { Async, EmptyState, PageHeader, StatusChip } from '../../components/ui'
import { useAuth, ROLE } from '../../auth/AuthContext'
import { SearchField, TableCard } from './TeacherShared'
import { LESSON_TYPES, LessonIcon, LessonTypeToggle } from './CourseBuilderDialogs'
import LessonSettings, { deleteMessage, usageCourses } from './LessonSettings'

const typeLabel = (type) => (LESSON_TYPES.find((x) => x.value === type) || LESSON_TYPES[2]).label
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// Every lesson of the teacher (an admin sees every teacher's), where each one is used, and quick clean-up actions.
export default function LessonLibrary() {
  const { notify, confirm } = useFeedback()
  const { user } = useAuth()
  const isAdmin = user?.role === ROLE.ADMIN
  const { data, loading, error, reload, setData } = useApi(() => api.get('/lessons/library').then((r) => r.data), [])
  const [search, setSearch] = useState('')
  const [type, setType] = useState('ALL')
  const [usage, setUsage] = useState('ALL') // ALL | USED | UNUSED
  const [editing, setEditing] = useState(null) // the library row being edited
  const [creating, setCreating] = useState(false)

  const lessons = data || []
  // Refetch without the page spinner (after a save, copy or delete) so counts and dates stay right.
  const refresh = () => api.get('/lessons/library').then((r) => setData(r.data)).catch(() => {})

  // Search and type apply first; the Used/Unused chip counts are taken from that list so they match what is shown.
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return lessons.filter((l) => (type === 'ALL' || (l.contentType || 'TEXT') === type)
      && (!s || l.title.toLowerCase().includes(s) || (isAdmin && (l.teacherName || '').toLowerCase().includes(s))))
  }, [lessons, search, type, isAdmin])
  const usedCount = filtered.filter((l) => l.usedIn?.length).length
  const shown = filtered.filter((l) => usage === 'ALL' || (usage === 'USED' ? l.usedIn?.length : !l.usedIn?.length))

  const duplicate = async (l) => {
    try {
      const copy = (await api.post(`/lessons/${l.id}/copy`)).data
      notify.success(`Copied as "${copy.title}"`)
      refresh()
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  const remove = async (l) => {
    const ok = await confirm({ title: `Delete "${l.title}"?`, message: deleteMessage(l.usedIn), confirmText: 'Delete lesson', danger: true })
    if (!ok) return
    try {
      await api.delete(`/lessons/${l.id}`)
      setData((list) => list.filter((x) => x.id !== l.id))
      notify.success('Lesson deleted')
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  const clearFilters = () => { setSearch(''); setType('ALL'); setUsage('ALL') }
  const newButton = <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreating(true)}>New lesson</Button>
  const actions = (l) => (
    <>
      <Tooltip title="Edit"><IconButton size="small" aria-label={`Edit ${l.title}`} onClick={() => setEditing(l)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Duplicate"><IconButton size="small" aria-label={`Duplicate ${l.title}`} onClick={() => duplicate(l)}><ContentCopyRoundedIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Delete"><IconButton size="small" aria-label={`Delete ${l.title}`} onClick={() => remove(l)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
    </>
  )

  return (
    <Box>
      <PageHeader
        title="Lesson library"
        subtitle={isAdmin ? 'Every teacher\'s lessons, where they are used, and what can be cleaned up.' : 'All your lessons in one place. Reuse them across courses and clean up the ones you no longer need.'}
        actions={newButton}
      />
      <Async loading={loading} error={error} onRetry={reload}>
        {lessons.length === 0 ? (
          <TableCard>
            <EmptyState icon={LibraryBooksOutlinedIcon} title="No lessons yet"
              description="Lessons you create here or in a course builder show up in this library, ready to reuse in any course."
              action={newButton} />
          </TableCard>
        ) : (
          <TableCard toolbar={(
            <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems={{ xs: 'stretch', md: 'center' }} width="100%">
              <SearchField value={search} onChange={setSearch} placeholder={isAdmin ? 'Search by title or teacher' : 'Search by title'} />
              <TextField select size="small" value={type} onChange={(e) => setType(e.target.value)} fullWidth={false} sx={{ width: { xs: '100%', md: 160 }, flexShrink: 0 }}
                inputProps={{ 'aria-label': 'Lesson type' }} SelectProps={{ MenuProps: { disableScrollLock: true } }}>
                <MenuItem value="ALL">All types</MenuItem>
                {LESSON_TYPES.map((x) => <MenuItem key={x.value} value={x.value}>{x.label}</MenuItem>)}
              </TextField>
              <Stack direction="row" gap={1} flexWrap={{ xs: 'wrap', md: 'nowrap' }} ml={{ md: 'auto' }} role="group" aria-label="Filter by use">
                {[['ALL', 'All', filtered.length], ['USED', 'Used', usedCount], ['UNUSED', 'Unused', filtered.length - usedCount]].map(([value, label, n]) => (
                  <Chip key={value} label={`${label} · ${n}`} onClick={() => setUsage(value)} data-testid={`filter-${value.toLowerCase()}`}
                    color={usage === value ? 'primary' : 'default'} variant={usage === value ? 'filled' : 'outlined'} sx={{ fontWeight: 600 }} />
                ))}
              </Stack>
            </Stack>
          )}>
            {shown.length === 0 ? (
              <EmptyState title="No matching lessons" description="Try another search or filter."
                action={<Button variant="outlined" onClick={clearFilters}>Clear filters</Button>} />
            ) : (
              <>
                {/* Phones: one compact card per lesson */}
                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                  {shown.map((l) => (
                    <Box key={l.id} data-testid="library-row" sx={{ px: 2, py: 1.75, borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
                      <Stack direction="row" gap={1.25} alignItems="flex-start">
                        <LessonIcon type={l.contentType} />
                        <Box flex={1} minWidth={0}>
                          <Typography fontWeight={700} fontSize="0.93rem" sx={{ wordBreak: 'break-word' }}>{l.title}</Typography>
                          <Typography fontSize="0.8rem" color="text.secondary">
                            {[typeLabel(l.contentType), `${l.duration || 0} min`, isAdmin && l.teacherName, `updated ${l.updatedAt}`].filter(Boolean).join(' · ')}
                          </Typography>
                        </Box>
                        <StatusChip status={l.published ? 'PUBLISHED' : 'DRAFT'} />
                      </Stack>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} mt={1}>
                        <Box minWidth={0} flex={1}><UsedIn lesson={l} /></Box>
                        <Stack direction="row" flexShrink={0}>{actions(l)}</Stack>
                      </Stack>
                    </Box>
                  ))}
                </Box>
                <TableContainer sx={{ overflowX: 'auto', display: { xs: 'none', md: 'block' } }}>
                  <Table sx={{ minWidth: isAdmin ? 980 : 860 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Lesson</TableCell>
                        {isAdmin && <TableCell>Teacher</TableCell>}
                        <TableCell>Used in</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Updated</TableCell>
                        <TableCell align="right" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {shown.map((l) => (
                        <TableRow key={l.id} hover data-testid="library-row">
                          <TableCell sx={{ maxWidth: 320 }}>
                            <Stack direction="row" gap={1.5} alignItems="center">
                              <LessonIcon type={l.contentType} />
                              <Box minWidth={0}>
                                <Typography fontWeight={700} fontSize="0.93rem" sx={{ wordBreak: 'break-word' }}>{l.title}</Typography>
                                <Typography fontSize="0.8rem" color="text.secondary">{typeLabel(l.contentType)} · {l.duration || 0} min</Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          {isAdmin && <TableCell><Typography fontSize="0.88rem">{l.teacherName || '-'}</Typography></TableCell>}
                          <TableCell sx={{ maxWidth: 340 }}><UsedIn lesson={l} /></TableCell>
                          <TableCell><StatusChip status={l.published ? 'PUBLISHED' : 'DRAFT'} /></TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}><Typography fontSize="0.88rem" color="text.secondary">{l.updatedAt || '-'}</Typography></TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{actions(l)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </TableCard>
        )}
      </Async>

      <EditLessonDialog lesson={editing} onClose={() => setEditing(null)}
        onSaved={refresh} onDeleted={(id) => { setEditing(null); setData((list) => list.filter((x) => x.id !== id)) }} />
      <NewLessonDialog open={creating} onClose={() => setCreating(false)}
        onCreated={(l) => { setCreating(false); refresh(); setEditing({ ...l, usedIn: [], courseCount: 0 }) }} />
    </Box>
  )
}

// "Used in 2 courses" with a link to each course's builder, or a muted "Not used".
function UsedIn({ lesson }) {
  const t = useTheme().palette.lms
  const courses = usageCourses(lesson.usedIn)
  // Modules can exist outside any course; they still count as a use.
  const loose = (lesson.usedIn || []).filter((u) => u.courseId == null).length
  if (!courses.length && !loose) return <Typography fontSize="0.85rem" color="text.disabled">Not used</Typography>
  return (
    <Box>
      <Typography fontSize="0.8rem" fontWeight={600} color="text.secondary" mb={courses.length ? 0.5 : 0}>
        {courses.length ? `Used in ${plural(courses.length, 'course')}` : ''}
        {loose ? `${courses.length ? ' · ' : ''}${plural(loose, 'module')} outside a course` : ''}
      </Typography>
      <Stack direction="row" gap={0.5} flexWrap="wrap">
        {courses.map((c) => (
          <Chip key={c.id} size="small" clickable component={RouterLink} to={`/teacher/courses/${c.id}?tab=builder`} label={c.title}
            sx={{ maxWidth: '100%', bgcolor: t.accentSoft, color: t.accent, fontWeight: 600 }} />
        ))}
      </Stack>
    </Box>
  )
}

// The builder's lesson settings form in a dialog (full screen on phones).
function EditLessonDialog({ lesson, onClose, onSaved, onDeleted }) {
  const theme = useTheme()
  const phone = useMediaQuery(theme.breakpoints.down('sm'))
  const courses = usageCourses(lesson?.usedIn)
  return (
    <Dialog open={!!lesson} onClose={onClose} maxWidth="sm" fullWidth fullScreen={phone} aria-label="Edit lesson">
      {lesson && (
        <LessonSettings
          key={lesson.id}
          embedded
          lessonId={lesson.id}
          notice={courses.length > 1 ? `Changes here update all ${courses.length} courses that use this lesson: ${courses.map((c) => c.title).join(', ')}.` : null}
          onSaved={onSaved}
          onDeleted={onDeleted}
          onClose={onClose}
        />
      )}
    </Dialog>
  )
}

// Title and type; the content is filled in right after, in the edit dialog.
function NewLessonDialog({ open, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('TEXT')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const close = () => { setTitle(''); setType('TEXT'); setError(''); onClose() }
  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')
    try {
      // New lessons start as drafts, like in the course builder.
      const l = (await api.post('/lessons', { title: title.trim(), contentType: type, content: '', duration: 0, published: false })).data
      setTitle(''); setType('TEXT')
      onCreated(l)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle>New lesson</DialogTitle>
        <DialogContent>
          <Stack gap={2.5} pt={1}>
            <TextField label="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus inputProps={{ name: 'newLessonTitle' }}
              error={!!error} helperText={error || 'Lesson titles must be unique across your courses.'} />
            <Box>
              <Typography fontWeight={600} fontSize="0.85rem" mb={1}>Type</Typography>
              <LessonTypeToggle value={type} onChange={setType} />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={close}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>Create lesson</Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
