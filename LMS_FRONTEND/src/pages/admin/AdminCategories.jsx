import { useMemo, useState } from 'react'
import {
  Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Stack, TextField, Tooltip, Typography,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import api, { errorMessage, fieldErrors } from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { Async, EmptyState, IconBadge, PageHeader } from '../../components/ui'
import { fonts } from '../../theme'

export default function AdminCategories() {
  const { notify, confirm } = useFeedback()
  const cats = useApi(() => api.get('/category').then((r) => r.data), [])
  const courses = useApi(() => api.get('/admin/courses').then((r) => r.data), [])
  const [edit, setEdit] = useState(null) // { id?, name, description }
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Number of courses in each category, to show and to explain why delete is blocked.
  const courseCount = useMemo(() => {
    const m = {}
    for (const c of courses.data || []) m[c.category] = (m[c.category] || 0) + 1
    return m
  }, [courses.data])

  const save = async () => {
    setSaving(true)
    setErrors({})
    try {
      const body = { name: edit.name.trim(), description: edit.description?.trim() || '' }
      if (edit.id) await api.put(`/category/${edit.id}`, body)
      else await api.post('/category', body)
      notify.success(edit.id ? 'Category updated' : 'Category added')
      setEdit(null)
      cats.reload()
    } catch (e) {
      setErrors(fieldErrors(e))
      notify.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (c) => {
    if (!(await confirm({ title: `Delete "${c.name}"?`, message: 'This cannot be undone.', confirmText: 'Delete', danger: true }))) return
    try {
      await api.delete(`/category/${c.id}`)
      notify.success('Category deleted')
      cats.reload()
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Group courses so students can browse the catalog."
        actions={<Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setEdit({ name: '', description: '' })}>New category</Button>}
      />
      <Async loading={cats.loading} error={cats.error} onRetry={cats.reload}>
        {cats.data?.length === 0 ? (
          <Card><EmptyState icon={CategoryOutlinedIcon} title="No categories yet" description="Add the first category, for example Programming or Business." /></Card>
        ) : (
          <Grid container spacing={2.5}>
            {(cats.data || []).map((c) => (
              <Grid item xs={12} sm={6} lg={4} key={c.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" gap={1.5} alignItems="flex-start">
                      <IconBadge icon={CategoryOutlinedIcon} size={40} />
                      <Stack flex={1} minWidth={0}>
                        <Typography variant="h5" noWrap>{c.name}</Typography>
                        <Typography fontSize="0.85rem" color="text.secondary" sx={{ minHeight: 40 }}>{c.description || 'No description'}</Typography>
                        <Typography fontFamily={fonts.mono} fontSize="0.8rem" color="text.disabled" mt={1}>
                          {courseCount[c.id] || 0} course{courseCount[c.id] === 1 ? '' : 's'}
                        </Typography>
                      </Stack>
                      <Stack direction="row">
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => setEdit({ ...c })}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title={courseCount[c.id] ? 'Move or delete its courses first' : 'Delete'}>
                          <span><IconButton size="small" onClick={() => remove(c)} disabled={!!courseCount[c.id]}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></span>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Async>

      <Dialog open={!!edit} onClose={() => setEdit(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{edit?.id ? 'Edit category' : 'New category'}</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField label="Name" autoFocus required value={edit?.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} error={!!errors.name} helperText={errors.name} />
            <TextField label="Description" multiline minRows={3} value={edit?.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setEdit(null)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving || !edit?.name?.trim()}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
