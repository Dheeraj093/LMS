import { forwardRef, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem,
  Stack, Switch, TextField, Tooltip, Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import api, { errorMessage, fieldErrors } from '../../api/client'
import { UserAvatar } from '../../components/ui'
import { formatDateTime, timeAgo } from '../../utils/format'

// Shared pieces for announcements: the card that shows one, and the create/edit dialog.
// Used by the Announcements page, the course editor tab, the student dashboard and the course page.

export const TITLE_MAX = 150
export const BODY_MAX = 5000

// One announcement. highlighted = opened from a notification link (?id=...).
export const AnnouncementCard = forwardRef(function AnnouncementCard(
  { item, highlighted, showCourse = true, compact = false, onEdit, onDelete }, ref,
) {
  const t = useTheme().palette.lms
  const edited = item.updatedAt && item.createdAt && String(item.updatedAt).slice(0, 16) !== String(item.createdAt).slice(0, 16)
  return (
    <Card ref={ref} id={`announcement-${item.id}`}
      sx={{
        scrollMarginTop: 96, transition: 'border-color .3s, box-shadow .3s',
        borderColor: highlighted ? t.accent : item.pinned ? t.line2 : undefined,
        boxShadow: highlighted ? `0 0 0 3px ${t.accentSoft}` : undefined,
      }}>
      <Box p={compact ? { xs: 1.75, sm: 2 } : { xs: 2, sm: 2.5 }}>
        <Stack direction="row" gap={1.5} alignItems="flex-start">
          <UserAvatar name={item.authorName} src={item.authorAvatarUrl} size={compact ? 34 : 40} />
          <Box flex={1} minWidth={0}>
            <Stack direction="row" gap={0.75} flexWrap="wrap" alignItems="center" mb={0.5}>
              {item.pinned && (
                <Chip size="small" icon={<PushPinRoundedIcon sx={{ fontSize: '14px !important' }} />} label="Pinned"
                  sx={{ color: t.warn, bgcolor: t.warnSoft, '& .MuiChip-icon': { color: t.warn } }} />
              )}
              {showCourse && item.courseTitle && (
                <Chip size="small" label={item.courseTitle} sx={{ color: t.accent, bgcolor: t.accentSoft, maxWidth: '100%' }} />
              )}
            </Stack>
            <Typography variant={compact ? 'h6' : 'h5'} sx={{ wordBreak: 'break-word' }}>{item.title}</Typography>
            <Typography fontSize="0.8rem" color="text.disabled" mt={0.25}>
              {item.authorName || 'Teacher'} · <Tooltip title={formatDateTime(item.createdAt)}><span>{timeAgo(item.createdAt)}</span></Tooltip>
              {edited ? ' · edited' : ''}
            </Typography>
          </Box>
          {(onEdit || onDelete) && item.canEdit && (
            <Stack direction="row" flexShrink={0} mr={-1} mt={-0.5}>
              {onEdit && <Tooltip title="Edit"><IconButton size="small" aria-label="Edit announcement" onClick={() => onEdit(item)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>}
              {onDelete && <Tooltip title="Delete"><IconButton size="small" aria-label="Delete announcement" onClick={() => onDelete(item)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>}
            </Stack>
          )}
        </Stack>
        {/* pre-line keeps the teacher's line breaks */}
        <Typography color="text.secondary" fontSize="0.92rem" mt={1.5}
          sx={{
            whiteSpace: 'pre-line', wordBreak: 'break-word',
            ...(compact ? { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}),
          }}>
          {item.body}
        </Typography>
      </Box>
    </Card>
  )
})

// Create or edit dialog. Pass `courses` to let the user pick the course (Announcements page);
// pass `courseId` when the course is fixed (course editor tab). `item` = the announcement being edited.
export function AnnouncementDialog({ open, item, courseId, courses, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', body: '', pinned: false, courseId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({})

  useEffect(() => {
    if (!open) return
    setForm({
      title: item?.title || '', body: item?.body || '', pinned: !!item?.pinned,
      courseId: item?.courseId ?? courseId ?? (courses?.length === 1 ? courses[0].id : ''),
    })
    setError('')
    setFields({})
  }, [open, item, courseId, courses])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setFields({})
    if (!item && !form.courseId) return setError('Pick a course')
    if (!form.title.trim()) return setFields({ title: 'Title is required' })
    if (!form.body.trim()) return setFields({ body: 'Message is required' })
    setSaving(true)
    try {
      const body = { title: form.title.trim(), body: form.body, pinned: form.pinned }
      const res = item
        ? await api.put(`/announcements/${item.id}`, body)
        : await api.post(`/courses/${form.courseId}/announcements`, body)
      onSaved(res.data, !item)
    } catch (err) {
      setError(errorMessage(err))
      setFields(fieldErrors(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" PaperProps={{ component: 'form', onSubmit: save, noValidate: true }}>
      <DialogTitle>{item ? 'Edit announcement' : 'New announcement'}</DialogTitle>
      <DialogContent>
        <Stack gap={2} pt={1}>
          {error && <Alert severity="error">{error}</Alert>}
          {!item && courses && (
            <TextField select label="Course" required value={form.courseId} onChange={(e) => set('courseId', e.target.value)}
              helperText={courses.length ? 'Every student enrolled in this course gets a notification' : 'You have no courses yet'}>
              {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.title}</MenuItem>)}
            </TextField>
          )}
          <TextField label="Title" required autoFocus value={form.title} onChange={(e) => set('title', e.target.value.slice(0, TITLE_MAX))}
            error={!!fields.title} helperText={fields.title || `${form.title.length}/${TITLE_MAX}`} />
          <TextField label="Message" required multiline minRows={5} maxRows={14} value={form.body}
            onChange={(e) => set('body', e.target.value.slice(0, BODY_MAX))}
            error={!!fields.body} helperText={fields.body || `${form.body.length}/${BODY_MAX}`} />
          <FormControlLabel control={<Switch checked={form.pinned} onChange={(e) => set('pinned', e.target.checked)} />}
            label={<Box><Typography fontWeight={600} fontSize="0.9rem">Pin to top</Typography><Typography fontSize="0.78rem" color="text.secondary">Pinned announcements stay above newer ones</Typography></Box>} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving...' : item ? 'Save' : 'Post announcement'}</Button>
      </DialogActions>
    </Dialog>
  )
}

// Small "View all" link used by panels that show only a few announcements.
export function AllAnnouncementsLink({ courseId, children = 'View all' }) {
  return (
    <Button component={RouterLink} to={courseId ? `/announcements?course=${courseId}` : '/announcements'} size="small">{children}</Button>
  )
}
