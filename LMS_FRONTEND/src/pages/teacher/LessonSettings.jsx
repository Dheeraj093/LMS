import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, InputAdornment,
  ListItemIcon, Menu, MenuItem, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import api, { errorMessage, fieldErrors, fileUrl } from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { FileDrop, Loading, PageError } from '../../components/ui'
import { lessonRequest } from './CourseApi'
import { LessonTypeToggle } from './CourseBuilderDialogs'

// Form values from a LessonResponse. When a file is uploaded the response's URL is a short-lived file link,
// so it is not put in the URL box.
const toForm = (l) => ({
  title: l.title || '',
  contentType: l.contentType || 'TEXT',
  videoFileId: l.videoFileId || null,
  pdfFileId: l.pdfFileId || null,
  videoUrl: l.videoFileId ? '' : l.videoUrl || '',
  pdfUrl: l.pdfFileId ? '' : l.pdfUrl || '',
  content: l.content || '',
  duration: l.duration ?? 0,
  published: !!l.published,
})

// Name and size of an uploaded file, for the upload box.
function useFileInfo(id) {
  const [info, setInfo] = useState(null)
  useEffect(() => {
    let alive = true
    if (!id) { setInfo(null); return undefined }
    if (info?.id === id) return undefined
    api.get(`/files/${id}`).then((r) => alive && setInfo(r.data)).catch(() => alive && setInfo({ id, originalName: 'Uploaded file' }))
    return () => { alive = false }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  return [info, setInfo]
}

// Used by the course builder (side panel / bottom drawer) and by the lesson library (inside a dialog, `embedded`).
// `notice` is an optional banner shown above the form (for example "Changes here update all 3 courses").
// Without `onRemove` the "Remove from course" menu item is hidden (the library has no course).
export default function LessonSettings({ lessonId, moduleTitle, notice, embedded, onSaved, onDeleted, onRemove, onClose }) {
  const { notify, confirm } = useFeedback()
  const { data: lesson, loading, error, reload, setData: setLesson } = useApi(() => api.get(`/lessons/${lessonId}`).then((r) => r.data), [lessonId])
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [videoMode, setVideoMode] = useState('upload')
  const [pdfMode, setPdfMode] = useState('upload')
  const [anchor, setAnchor] = useState(null)
  const [preview, setPreview] = useState(false)
  const [videoFile, setVideoFile] = useFileInfo(form?.videoFileId)
  const [pdfFile, setPdfFile] = useFileInfo(form?.pdfFileId)

  useEffect(() => {
    if (!lesson) return
    setForm(toForm(lesson))
    setVideoMode(lesson.videoFileId || !lesson.videoUrl ? 'upload' : 'link')
    setPdfMode(lesson.pdfFileId || !lesson.pdfUrl ? 'upload' : 'link')
  }, [lesson])

  const dirty = useMemo(() => lesson && form && JSON.stringify(toForm(lesson)) !== JSON.stringify(form), [lesson, form])
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const save = async (e) => {
    e?.preventDefault()
    if (!form.title.trim()) { setErrors({ title: 'Title is required' }); return }
    setSaving(true)
    setErrors({})
    try {
      // lessonRequest sends the uploaded file ids again, so an unchanged lesson keeps its video/PDF.
      const body = lessonRequest(form, { title: form.title.trim(), duration: Number(form.duration) || 0 })
      const res = (await api.put(`/lessons/${lessonId}`, body)).data
      setLesson(res)
      onSaved?.(res)
      notify.success('Lesson saved')
    } catch (err) {
      setErrors(fieldErrors(err))
      notify.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setAnchor(null)
    // Say which courses lose the lesson. If the usage call fails the generic text is still shown.
    const usage = await api.get(`/lessons/${lessonId}/usage`).then((r) => r.data).catch(() => [])
    const ok = await confirm({
      title: `Delete lesson "${lesson.title}"?`,
      message: deleteMessage(usage),
      confirmText: 'Delete lesson',
      danger: true,
    })
    if (!ok) return
    try {
      await api.delete(`/lessons/${lessonId}`)
      notify.success('Lesson deleted')
      onDeleted?.(lessonId)
    } catch (err) {
      notify.error(errorMessage(err))
    }
  }

  // Links used by Preview: the saved file link when a file is attached, otherwise the typed URL.
  const videoLink = form?.videoFileId ? (videoFile?.url || lesson?.videoUrl) : form?.videoUrl
  const pdfLink = form?.pdfFileId ? (pdfFile?.url || lesson?.pdfUrl) : form?.pdfUrl

  return (
    <Card sx={{ p: { xs: 2, sm: 2.5 }, border: embedded ? 0 : { xs: 0, md: undefined }, boxShadow: embedded ? 'none' : { xs: 'none', md: undefined } ,overflowY : 'scroll'}} data-testid="lesson-settings">
      <Stack direction="row" alignItems="center" gap={1} mb={2}>
        <Box flex={1} minWidth={0}>
          <Typography variant="overline" color="text.disabled" component="div" lineHeight={1.5}>Lesson settings</Typography>
          {moduleTitle && <Typography fontSize="0.8rem" color="text.secondary" noWrap>in {moduleTitle}</Typography>}
        </Box>
        <Tooltip title="Preview">
          <span><IconButton size="small" onClick={() => setPreview(true)} disabled={!form} aria-label="Preview lesson"><VisibilityOutlinedIcon fontSize="small" /></IconButton></span>
        </Tooltip>
        <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} disabled={!lesson} aria-label="Lesson actions"><MoreHorizRoundedIcon fontSize="small" /></IconButton>
        <IconButton size="small" onClick={onClose} aria-label="Close lesson settings"><CloseRoundedIcon fontSize="small" /></IconButton>
        <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
          {onRemove && (
            <MenuItem onClick={() => { setAnchor(null); onRemove() }}>
              <ListItemIcon><RemoveCircleOutlineRoundedIcon fontSize="small" /></ListItemIcon>Remove from course (keep in library)
            </MenuItem>
          )}
          <MenuItem onClick={remove} sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteOutlineRoundedIcon fontSize="small" color="error" /></ListItemIcon>Delete lesson
          </MenuItem>
        </Menu>
      </Stack>

      {notice && <Alert severity="info" sx={{ mb: 2 }} data-testid="shared-notice">{notice}</Alert>}
      {error ? <PageError error={error} onRetry={reload} /> : loading || !form ? <Loading py={6} /> : (
        <Box component="form" onSubmit={save} noValidate>
          <Stack gap={2.25}>
            <Field label="Title">
              <TextField value={form.title} onChange={(e) => set('title', e.target.value)} inputProps={{ name: 'lessonTitle', 'aria-label': 'Lesson title' }}
                error={!!errors.title} helperText={errors.title} />
            </Field>

            <Field label="Type">
              <LessonTypeToggle value={form.contentType} onChange={(v) => set('contentType', v)} />
            </Field>

            {form.contentType === 'VIDEO' && (
              <Field label="Video" action={<SourceToggle value={videoMode} onChange={setVideoMode} />}>
                {videoMode === 'upload' ? (
                  <FileDrop
                    purpose="LESSON_VIDEO"
                    accept="video/*"
                    label="Drop a video here or"
                    hint="MP4 or WebM"
                    current={form.videoFileId ? (videoFile || { originalName: 'Uploaded video' }) : null}
                    onUploaded={(f) => { setVideoFile(f); setForm((x) => ({ ...x, videoFileId: f.id, videoUrl: '' })) }}
                    onClear={() => set('videoFileId', null)}
                  />
                ) : (
                  <TextField value={form.videoUrl} placeholder="https://..." inputProps={{ name: 'videoUrl', 'aria-label': 'Video URL' }}
                    onChange={(e) => setForm((x) => ({ ...x, videoUrl: e.target.value, videoFileId: null }))}
                    helperText={form.videoFileId ? 'Typing a link replaces the uploaded video.' : 'A direct video file link or a YouTube/Vimeo page.'} />
                )}
              </Field>
            )}

            {form.contentType === 'PDF' && (
              <Field label="PDF" action={<SourceToggle value={pdfMode} onChange={setPdfMode} />}>
                {pdfMode === 'upload' ? (
                  <FileDrop
                    purpose="LESSON_PDF"
                    accept="application/pdf"
                    label="Drop a PDF here or"
                    hint="PDF files only"
                    current={form.pdfFileId ? (pdfFile || { originalName: 'Uploaded PDF' }) : null}
                    onUploaded={(f) => { setPdfFile(f); setForm((x) => ({ ...x, pdfFileId: f.id, pdfUrl: '' })) }}
                    onClear={() => set('pdfFileId', null)}
                  />
                ) : (
                  <TextField value={form.pdfUrl} placeholder="https://..." inputProps={{ name: 'pdfUrl', 'aria-label': 'PDF URL' }}
                    onChange={(e) => setForm((x) => ({ ...x, pdfUrl: e.target.value, pdfFileId: null }))}
                    helperText={form.pdfFileId ? 'Typing a link replaces the uploaded PDF.' : undefined} />
                )}
              </Field>
            )}

            <Field label={form.contentType === 'TEXT' ? 'Lesson text' : 'Notes (optional)'}>
              <TextField value={form.content} onChange={(e) => set('content', e.target.value)} multiline minRows={form.contentType === 'TEXT' ? 6 : 3}
                maxRows={16} inputProps={{ name: 'content', 'aria-label': 'Lesson text' }} placeholder={form.contentType === 'TEXT' ? 'Write the lesson here...' : 'Shown under the video or PDF'} />
            </Field>

            <Field label="Duration">
              <TextField type="number" value={form.duration} onChange={(e) => set('duration', e.target.value)}
                inputProps={{ min: 0, name: 'duration', 'aria-label': 'Duration in minutes' }} error={!!errors.duration} helperText={errors.duration}
                InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }} sx={{ maxWidth: 160 }} />
            </Field>

            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography fontWeight={600} fontSize="0.9rem">Published</Typography>
                <Typography fontSize="0.78rem" color="text.secondary">{form.published ? 'Visible to enrolled students' : 'Hidden while you work on it'}</Typography>
              </Box>
              <Switch checked={form.published} onChange={(e) => set('published', e.target.checked)} inputProps={{ 'aria-label': 'Lesson published' }} />
            </Stack>

            {dirty && <Alert severity="info" sx={{ py: 0 }}>You have unsaved changes.</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={saving} fullWidth>
              {saving ? 'Saving...' : 'Save lesson'}
            </Button>
          </Stack>
        </Box>
      )}

      {form && (
        <LessonPreview open={preview} onClose={() => setPreview(false)} form={form} videoLink={videoLink} pdfLink={pdfLink} pdfName={form.pdfFileId ? pdfFile?.originalName : null} />
      )}
    </Card>
  )
}

// Distinct courses in a usage list (GET /lessons/{id}/usage). Modules that are in no course have a null courseId.
export function usageCourses(usedIn) {
  const seen = new Map()
  ;(usedIn || []).forEach((u) => { if (u.courseId != null && !seen.has(u.courseId)) seen.set(u.courseId, { id: u.courseId, title: u.courseTitle }) })
  return [...seen.values()]
}

// Confirm text for deleting a lesson: names the courses it will disappear from.
export function deleteMessage(usedIn) {
  const courses = usageCourses(usedIn)
  const tail = 'Students\' progress on it is deleted too. This cannot be undone.'
  if (courses.length === 0) return `The lesson is deleted for good. ${tail}`
  const names = courses.map((c) => `"${c.title}"`).join(', ')
  return courses.length === 1
    ? `It will be removed from the course ${names}. ${tail}`
    : `It will be removed from these ${courses.length} courses: ${names}. ${tail}`
}

function Field({ label, action, children }) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.75} minHeight={28}>
        <Typography fontWeight={600} fontSize="0.85rem">{label}</Typography>
        {action}
      </Stack>
      {children}
    </Box>
  )
}

function SourceToggle({ value, onChange }) {
  return (
    <ToggleButtonGroup exclusive size="small" value={value} onChange={(_, v) => v && onChange(v)} sx={{ '& .MuiToggleButton-root': { py: 0.1, fontSize: '0.75rem' } }}>
      <ToggleButton value="upload">Upload</ToggleButton>
      <ToggleButton value="link">Link</ToggleButton>
    </ToggleButtonGroup>
  )
}

const isVideoFile = (url) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url || '') || (url || '').includes('/files/')

// What a student will see, built from the current form values.
function LessonPreview({ open, onClose, form, videoLink, pdfLink, pdfName }) {
  const link = form.contentType === 'VIDEO' ? fileUrl(videoLink) : form.contentType === 'PDF' ? fileUrl(pdfLink) : null
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        {form.title || 'Untitled lesson'}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }} aria-label="Close preview"><CloseRoundedIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {form.contentType === 'VIDEO' && (link ? (isVideoFile(link)
          ? <Box component="video" src={link} controls sx={{ width: '100%', borderRadius: '10px', bgcolor: 'black', maxHeight: 460 }} />
          : <Alert severity="info">This video is hosted on another site. Use "Open in new tab" to check it.</Alert>)
          : <Alert severity="warning">No video yet. Upload one or paste a link.</Alert>)}
        {/* The backend sends X-Frame-Options: DENY, so PDFs cannot be shown in an iframe; open them in a new tab instead. */}
        {form.contentType === 'PDF' && (link ? (
          <Stack direction="row" alignItems="center" gap={2} sx={{ p: 2, borderRadius: '12px', bgcolor: 'action.hover' }}>
            <PictureAsPdfOutlinedIcon color="error" sx={{ fontSize: 36 }} />
            <Box flex={1} minWidth={0}>
              <Typography fontWeight={600} noWrap>{pdfName || 'PDF document'}</Typography>
              <Typography fontSize="0.82rem" color="text.secondary">Students open the PDF from the lesson page.</Typography>
            </Box>
            <Button variant="contained" component="a" href={link} target="_blank" rel="noopener noreferrer" startIcon={<OpenInNewRoundedIcon />}>Open PDF</Button>
          </Stack>
        ) : <Alert severity="warning">No PDF yet. Upload one or paste a link.</Alert>)}
        {form.contentType !== 'TEXT' && form.content && <Divider sx={{ my: 2 }} />}
        {form.content
          ? <Typography whiteSpace="pre-wrap" lineHeight={1.7}>{form.content}</Typography>
          : form.contentType === 'TEXT' && <Alert severity="warning">This lesson has no text yet.</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        {link && form.contentType === 'VIDEO' && <Button component="a" href={link} target="_blank" rel="noopener noreferrer" startIcon={<OpenInNewRoundedIcon />}>Open in new tab</Button>}
        <Button variant="contained" onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
