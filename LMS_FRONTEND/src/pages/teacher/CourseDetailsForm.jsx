import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, MenuItem, Stack, Switch,
  TextField, Typography, ToggleButton, ToggleButtonGroup,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import api, { errorMessage, fieldErrors } from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { FileDrop, Panel } from '../../components/ui'
import CourseThumb from './CourseThumb'
import { saveCourse } from './CourseApi'

const isFileLink = (url) => !!url && url.startsWith('/files/')

// Create form (no course) or edit form for the course details.
export default function CourseDetailsForm({ course, onSaved }) {
  const navigate = useNavigate()
  const { notify } = useFeedback()
  const isNew = !course

  const [form, setForm] = useState({
    title: course?.title || '',
    description: course?.description || '',
    categoryId: course?.category || '',
    published: !!course?.published,
  })
  // thumb.fileId is a new upload; thumb.url is what gets sent when nothing new was uploaded.
  const [thumb, setThumb] = useState({ fileId: null, file: null, url: course?.thumbnail || '' })
  const [thumbMode, setThumbMode] = useState(!course?.thumbnail || isFileLink(course?.thumbnail) ? 'upload' : 'link')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [catOpen, setCatOpen] = useState(false)

  // The Publish button in the page header can change this while the form is open.
  useEffect(() => {
    if (course) setForm((f) => ({ ...f, published: !!course.published }))
  }, [course?.published]) // eslint-disable-line react-hooks/exhaustive-deps

  const cats = useApi(() => api.get('/category').then((r) => r.data), [])
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (!form.categoryId) errs.categoryId = 'Pick a category'
    setErrors(errs)
    if (Object.keys(errs).length) return

    const body = {
      title: form.title.trim(),
      description: form.description,
      categoryId: form.categoryId,
      published: form.published,
      thumbnail: thumb.fileId ? null : thumb.url?.trim() || null,
      thumbnailFileId: thumb.fileId || null,
    }
    setSaving(true)
    try {
      if (isNew) {
        const created = (await api.post('/courses', { ...body, modules: [] })).data
        notify.success('Course created. Now add modules and lessons.')
        navigate(`/teacher/courses/${created.id}?tab=builder`, { replace: true })
      } else {
        // saveCourse re-reads the course and sends its current module ids, so the curriculum is kept.
        const saved = await saveCourse(course.id, body)
        setThumb({ fileId: null, file: null, url: saved.thumbnail || '' })
        onSaved?.(saved)
        notify.success('Course details saved')
      }
    } catch (err) {
      setErrors(fieldErrors(err))
      notify.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const currentUpload = thumb.file || (isFileLink(thumb.url) ? { originalName: 'Current course image' } : null)

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Panel title="Course details" subtitle="What students see in the catalog">
            <Stack gap={2.5}>
              <TextField label="Title" value={form.title} onChange={set('title')} required inputProps={{ name: 'title', maxLength: 200 }}
                error={!!errors.title} helperText={errors.title} />
              <TextField label="Description" value={form.description} onChange={set('description')} multiline minRows={5}
                inputProps={{ name: 'description' }} error={!!errors.description}
                helperText={errors.description || 'What will students learn? Who is this course for?'} />
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems={{ sm: 'flex-start' }}>
                <TextField select label="Category" value={cats.data ? form.categoryId : ''} onChange={set('categoryId')} required
                  error={!!errors.categoryId || !!cats.error} disabled={cats.loading}
                  helperText={errors.categoryId || (cats.error ? errorMessage(cats.error) : cats.data?.length === 0 ? 'No categories yet. Add one.' : ' ')}
                  SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 320 } } } }} inputProps={{ name: 'categoryId' }}>
                  {(cats.data || []).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </TextField>
                <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setCatOpen(true)} sx={{ flexShrink: 0 }}>
                  Add category
                </Button>
              </Stack>
              <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'action.hover' }}>
                <FormControlLabel
                  control={<Switch checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} />}
                  label={<Typography fontWeight={600}>Published</Typography>}
                />
                <Typography fontSize="0.82rem" color="text.secondary" ml={6} mt={-0.5}>
                  {form.published ? 'Students can find and enroll in this course.' : 'Draft: only you (and admins) can see it.'}
                </Typography>
              </Box>
            </Stack>
          </Panel>
        </Grid>

        <Grid item xs={12} md={5}>
          <Panel title="Thumbnail" subtitle="Shown on course cards (16:9 works best)">
            <Stack gap={2}>
              <CourseThumb src={thumb.url} height={190} radius={12} iconSize={48} />
              <ToggleButtonGroup exclusive size="small" value={thumbMode} onChange={(_, v) => v && setThumbMode(v)} fullWidth>
                <ToggleButton value="upload">Upload image</ToggleButton>
                <ToggleButton value="link">Image link</ToggleButton>
              </ToggleButtonGroup>
              {thumbMode === 'upload' ? (
                <FileDrop
                  purpose="COURSE_THUMBNAIL"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  label="Drop an image here or"
                  hint="PNG, JPG, GIF or WebP"
                  current={currentUpload}
                  onUploaded={(file) => setThumb({ fileId: file.id, file, url: file.url })}
                  onClear={() => setThumb({ fileId: null, file: null, url: '' })}
                />
              ) : (
                <TextField label="Image URL" placeholder="https://..." value={isFileLink(thumb.url) ? '' : thumb.url}
                  onChange={(e) => setThumb({ fileId: null, file: null, url: e.target.value })} inputProps={{ name: 'thumbnail' }} />
              )}
            </Stack>
          </Panel>
        </Grid>
      </Grid>

      <Stack direction="row" justifyContent="flex-end" gap={1.5} mt={3}>
        <Button variant="outlined" onClick={() => navigate('/teacher/courses')}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={saving} startIcon={isNew ? <AddRoundedIcon /> : <SaveOutlinedIcon />}>
          {saving ? 'Saving...' : isNew ? 'Create course' : 'Save details'}
        </Button>
      </Stack>

      <AddCategoryDialog
        open={catOpen}
        onClose={() => setCatOpen(false)}
        onCreated={(cat) => {
          cats.setData((list) => [...(list || []), cat].sort((a, b) => a.name.localeCompare(b.name)))
          setForm((f) => ({ ...f, categoryId: cat.id }))
          setErrors((er) => ({ ...er, categoryId: undefined }))
        }}
      />
    </Box>
  )
}

function AddCategoryDialog({ open, onClose, onCreated }) {
  const { notify } = useFeedback()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    try {
      const cat = (await api.post('/category', { name: name.trim(), description: description.trim() })).data
      notify.success(`Category "${cat.name}" added`)
      onCreated(cat)
      setName(''); setDescription(''); setError('')
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add a category</DialogTitle>
      <DialogContent>
        <Stack gap={2} pt={1}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus error={!!error} helperText={error}
            inputProps={{ name: 'categoryName' }} />
          <TextField label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>Add category</Button>
      </DialogActions>
    </Dialog>
  )
}
