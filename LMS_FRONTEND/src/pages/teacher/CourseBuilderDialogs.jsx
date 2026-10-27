import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, ButtonBase, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, List, ListItemButton,
  ListItemIcon, ListItemText, Stack, Switch, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import { useTheme } from '@mui/material/styles'
import api, { errorMessage } from '../../api/client'
import { IconBadge, Loading } from '../../components/ui'

export const LESSON_TYPES = [
  { value: 'VIDEO', label: 'Video', icon: PlayCircleOutlineRoundedIcon, tone: 'accent' },
  { value: 'PDF', label: 'PDF', icon: PictureAsPdfOutlinedIcon, tone: 'bad' },
  { value: 'TEXT', label: 'Text', icon: ArticleOutlinedIcon, tone: 'ok' },
]

export function LessonIcon({ type, size = 30 }) {
  const t = LESSON_TYPES.find((x) => x.value === type) || LESSON_TYPES[2]
  return <IconBadge icon={t.icon} tone={t.tone} size={size} />
}

export function LessonTypeToggle({ value, onChange }) {
  return (
    <ToggleButtonGroup exclusive fullWidth size="small" value={value || 'TEXT'} onChange={(_, v) => v && onChange(v)} aria-label="Lesson type">
      {LESSON_TYPES.map((x) => <ToggleButton key={x.value} value={x.value}>{x.label}</ToggleButton>)}
    </ToggleButtonGroup>
  )
}

// Add or edit a module (title, description, published).
export function ModuleDialog({ open, module, onClose, onSave }) {
  const [form, setForm] = useState({ title: '', description: '', published: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm({ title: module?.title || '', description: module?.description || '', published: module ? module.published : true })
      setError('')
    }
  }, [open, module])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true)
    await onSave({ title: form.title.trim(), description: form.description.trim(), published: form.published })
    setSaving(false)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle>{module ? 'Edit module' : 'Add a module'}</DialogTitle>
        <DialogContent>
          <Stack gap={2} pt={1}>
            <TextField label="Module title" value={form.title} autoFocus inputProps={{ name: 'moduleTitle' }}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} error={!!error}
              helperText={error || 'Module titles must be unique across your courses.'} />
            <TextField label="Description (optional)" value={form.description} multiline minRows={2}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <FormControlLabel control={<Switch checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} />}
              label="Visible to students" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>{module ? 'Save module' : 'Add module'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

// Add a new lesson, or lessons from the teacher's library, to a module.
// When an admin builds a teacher's course, `owner` is { id, name } of that teacher: new lessons are created for them
// (POST /lessons?ownerId=) and the library tab lists their lessons (GET /lessons/library returns everyone's for an admin).
export function AddLessonDialog({ open, moduleTitle, usedIds, owner, onClose, onAdd }) {
  const [tab, setTab] = useState('new')
  const [title, setTitle] = useState('')
  const [type, setType] = useState('VIDEO')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [library, setLibrary] = useState(null)
  const [libError, setLibError] = useState(null)
  const [picked, setPicked] = useState([])

  useEffect(() => {
    if (!open) return
    setTab('new'); setTitle(''); setType('VIDEO'); setError(''); setPicked([]); setLibrary(null); setLibError(null)
  }, [open])

  useEffect(() => {
    if (!open || tab !== 'library' || library) return
    api.get('/lessons/library')
      .then((r) => setLibrary(owner ? r.data.filter((l) => (l.teacherId != null ? l.teacherId === owner.id : l.teacherName === owner.name)) : r.data))
      .catch((e) => setLibError(e))
  }, [open, tab, library, owner])

  const free = (library || []).filter((l) => !usedIds.includes(l.id))

  const createLesson = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')
    try {
      // New lessons start as drafts; the teacher fills in the content in Lesson settings.
      const l = (await api.post(owner ? `/lessons?ownerId=${owner.id}` : '/lessons', { title: title.trim(), contentType: type, content: '', duration: 0, published: false })).data
      const ok = await onAdd([{ id: l.id, title: l.title, contentType: l.contentType, duration: l.duration, published: l.published }])
      if (ok) onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const addPicked = async () => {
    setSaving(true)
    const lessons = free.filter((l) => picked.includes(l.id))
      .map((l) => ({ id: l.id, title: l.title, contentType: l.contentType, duration: l.duration, published: l.published }))
    const ok = await onAdd(lessons)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0 }}>
        Add lesson
        {moduleTitle && <Typography color="text.secondary" fontSize="0.85rem">to {moduleTitle}</Typography>}
      </DialogTitle>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
        <Tab value="new" label="New lesson" />
        <Tab value="library" label={owner ? `From ${owner.name.split(' ')[0]}'s library` : 'From my library'} />
      </Tabs>
      {tab === 'new' ? (
        <form onSubmit={createLesson} noValidate>
          <DialogContent>
            <Stack gap={2.5}>
              <TextField label="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
                inputProps={{ name: 'newLessonTitle' }} error={!!error}
                helperText={error || (owner ? `Created in ${owner.name}'s library. Titles must be unique across their courses.` : 'Lesson titles must be unique across your courses.')} />
              <Box>
                <Typography fontWeight={600} fontSize="0.85rem" mb={1}>Type</Typography>
                <LessonTypeToggle value={type} onChange={setType} />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button variant="outlined" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>Create lesson</Button>
          </DialogActions>
        </form>
      ) : (
        <>
          <DialogContent sx={{ minHeight: 200 }}>
            {libError ? <Alert severity="error">{errorMessage(libError)}</Alert>
              : !library ? <Loading py={4} />
                : free.length === 0 ? (
                  <Typography color="text.secondary" py={4} textAlign="center">
                    {library.length === 0 ? 'There are no lessons in this library yet.' : 'Every lesson in this library is already in this course.'} Create a new one instead.
                  </Typography>
                ) : (
                  <List dense disablePadding>
                    {free.map((l) => {
                      const on = picked.includes(l.id)
                      return (
                        <ListItemButton key={l.id} onClick={() => setPicked((p) => (on ? p.filter((x) => x !== l.id) : [...p, l.id]))} sx={{ borderRadius: '10px' }}>
                          <ListItemIcon sx={{ minWidth: 40 }}><Checkbox edge="start" checked={on} tabIndex={-1} disableRipple /></ListItemIcon>
                          <ListItemIcon sx={{ minWidth: 42 }}><LessonIcon type={l.contentType} size={28} /></ListItemIcon>
                          <ListItemText primary={l.title} secondary={`${l.contentType || 'TEXT'} · ${l.duration || 0} min${l.published ? '' : ' · draft'}${l.courseCount ? ` · in ${l.courseCount} course${l.courseCount === 1 ? '' : 's'}` : ''}`} />
                        </ListItemButton>
                      )
                    })}
                  </List>
                )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button variant="outlined" onClick={onClose}>Cancel</Button>
            <Button variant="contained" disabled={saving || picked.length === 0} onClick={addPicked}>
              Add {picked.length || ''} lesson{picked.length === 1 ? '' : 's'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}

// Asked before editing a lesson that other courses use too: edit the shared lesson, or copy it for this course only.
// `others` are the other courses ({ id, title }); `count` is every course that uses the lesson (this one included).
export function SharedLessonDialog({ open, lesson, count, others, busy, onEditAll, onCopy, onClose }) {
  const t = useTheme().palette.lms
  const choice = (testId, icon, title, text, onClick) => (
    <ButtonBase onClick={onClick} disabled={busy} data-testid={testId}
      sx={{
        width: '100%', textAlign: 'left', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 1.5, p: 1.75,
        borderRadius: '12px', border: `1px solid ${t.line}`, transition: 'border-color .15s, background-color .15s',
        '&:hover': { borderColor: t.accent, bgcolor: t.accentSoft },
      }}>
      <IconBadge icon={icon} size={34} />
      <Box minWidth={0}>
        <Typography fontWeight={700} fontSize="0.93rem">{title}</Typography>
        <Typography fontSize="0.82rem" color="text.secondary">{text}</Typography>
      </Box>
    </ButtonBase>
  )
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>This lesson is used in {count} courses</DialogTitle>
      <DialogContent>
        <Typography fontSize="0.9rem" color="text.secondary" mb={1}>
          "{lesson?.title}" is also part of:
        </Typography>
        <Stack component="ul" gap={0.5} sx={{ m: 0, mb: 2, pl: 2.5 }}>
          {others.map((c) => <Typography component="li" key={c.id} fontSize="0.9rem" fontWeight={600}>{c.title}</Typography>)}
        </Stack>
        <Stack gap={1.25}>
          {choice('shared-edit-all', EditNoteRoundedIcon, 'Edit everywhere',
            `Keep one shared lesson. Your changes show up in all ${count} courses.`, onEditAll)}
          {choice('shared-copy', ContentCopyRoundedIcon, 'Make a copy for this course only',
            'This course gets its own copy to change. The other courses keep the original.', onCopy)}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {busy && <Typography fontSize="0.85rem" color="text.secondary" mr="auto">Making a copy...</Typography>}
        <Button variant="outlined" onClick={onClose} disabled={busy}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}
