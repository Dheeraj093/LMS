import { useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material'
import AuthLayout from './AuthLayout'
import api, { errorMessage } from '../../api/client'
import { storage } from '../../api/client'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) return setError('The two passwords do not match.')
    setError('')
    setBusy(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword: form.password })
      storage.clear() // every old session is logged out by the backend
      navigate('/login?reset=1', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a password with at least 8 characters.">
      {!token ? (
        <Stack gap={2}>
          <Alert severity="warning">This link is missing its reset code. Open the link from the email again.</Alert>
          <Button component={RouterLink} to="/forgot-password" variant="contained">Get a new link</Button>
        </Stack>
      ) : (
        <Stack component="form" onSubmit={submit} gap={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="New password" name="password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <TextField label="Repeat new password" name="confirm" type="password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          <Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? 'Saving...' : 'Save new password'}</Button>
          <Typography textAlign="center" fontSize="0.92rem"><Link component={RouterLink} to="/login" fontWeight={600}>Back to login</Link></Typography>
        </Stack>
      )}
    </AuthLayout>
  )
}
