import { useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import api, { errorMessage, fieldErrors } from '../../api/client'

const EMPTY = { name: '', email: '', password: '', role: 'STUDENT' }

// Admin "Add user": creates an active account of any role (POST /admin/users).
export default function AddUserDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const close = () => { setForm(EMPTY); setErrors({}); setError(''); onClose() }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    setError('')
    try {
      const user = (await api.post('/admin/users', form)).data
      setForm(EMPTY)
      onCreated(user)
    } catch (err) {
      setErrors(fieldErrors(err))
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth component="form" onSubmit={save}>
      <DialogTitle>Add user</DialogTitle>
      <DialogContent>
        <Stack gap={2} pt={1}>
          <ToggleButtonGroup exclusive fullWidth value={form.role} onChange={(_, v) => v && setForm({ ...form, role: v })}>
            <ToggleButton value="STUDENT">Student</ToggleButton>
            <ToggleButton value="TEACHER">Teacher</ToggleButton>
            <ToggleButton value="ADMIN">Admin</ToggleButton>
          </ToggleButtonGroup>
          <TextField label="Full name" name="name" required value={form.name} onChange={set('name')} error={!!errors.name} helperText={errors.name} autoFocus />
          <TextField label="Email" name="email" type="email" required value={form.email} onChange={set('email')} error={!!errors.email} helperText={errors.email} />
          <TextField label="Password" name="password" type="text" required value={form.password} onChange={set('password')}
            error={!!errors.password} helperText={errors.password || 'At least 8 characters. Share it with the user; they can change it in Profile.'} />
          {error && !Object.keys(errors).length && <Typography color="error.main" fontSize="0.85rem">{error}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={close} variant="outlined">Cancel</Button>
        <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Adding...' : 'Add user'}</Button>
      </DialogActions>
    </Dialog>
  )
}
