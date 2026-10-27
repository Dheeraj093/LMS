import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material'
import AuthLayout from './AuthLayout'
import api, { errorMessage } from '../../api/client'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() })
      setSent(res.data || {})
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Forgot password" subtitle="Enter your email and we will send you a reset link.">
      {sent ? (
        <Stack gap={2}>
          <Alert severity="success">{sent.message || 'If this email has an account, a reset link has been sent.'}</Alert>
          {/* Only in development, when the backend has app.auth.return-reset-token=true */}
          {sent.token && (
            <Button component={RouterLink} to={`/reset-password?token=${encodeURIComponent(sent.token)}`} variant="outlined">
              Open the reset page (development)
            </Button>
          )}
          <Button component={RouterLink} to="/login" variant="contained">Back to login</Button>
        </Stack>
      ) : (
        <Stack component="form" onSubmit={submit} gap={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Email" name="email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</Button>
          <Typography textAlign="center" fontSize="0.92rem"><Link component={RouterLink} to="/login" fontWeight={600}>Back to login</Link></Typography>
        </Stack>
      )}
    </AuthLayout>
  )
}
