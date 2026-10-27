import { useEffect, useRef, useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { Alert, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import AuthLayout from './AuthLayout'
import api, { errorMessage } from '../../api/client'

// Opened from the link in the sign-up email: /verify-email?token=...
// Without a token it shows a small form to send the link again.
export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState(token ? 'checking' : 'resend')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState(params.get('email') || '')
  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    // React StrictMode runs effects twice in development; the code works only once, so send it once.
    if (!token || started.current) return
    started.current = true
    api.post('/auth/verify-email', { token })
      .then((res) => { setMessage(res.data.message); setState('done') })
      .catch((err) => { setMessage(errorMessage(err, 'This link is not valid')); setState('failed') })
  }, [token])

  const resend = async (e) => {
    e.preventDefault()
    setBusy(true)
    setSent('')
    try {
      const res = await api.post('/auth/resend-verification', { email: email.trim() })
      setSent(res.data.message)
    } catch (err) {
      setSent(errorMessage(err, 'Could not send the email'))
    } finally {
      setBusy(false)
    }
  }

  if (state === 'checking') {
    return (
      <AuthLayout title="Confirming your email" subtitle="One moment...">
        <Stack alignItems="center" py={3}><CircularProgress /></Stack>
      </AuthLayout>
    )
  }

  if (state === 'done') {
    return (
      <AuthLayout title="Email confirmed" subtitle="Your account is ready.">
        <Alert severity="success" sx={{ mb: 3 }}>{message}</Alert>
        <Button component={RouterLink} to="/login?verified=1" variant="contained" fullWidth>Go to login</Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={state === 'failed' ? 'Link not valid' : 'Confirm your email'}
      subtitle="Enter your email and we will send a new confirmation link.">
      {state === 'failed' && <Alert severity="error" sx={{ mb: 2 }}>{message}</Alert>}
      {sent && <Alert severity="info" sx={{ mb: 2 }}>{sent}</Alert>}
      <Stack component="form" onSubmit={resend} gap={2}>
        <TextField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? 'Sending...' : 'Send link'}</Button>
      </Stack>
      <Typography mt={3} textAlign="center" fontSize="0.92rem">
        <Button component={RouterLink} to="/login" size="small">Back to login</Button>
      </Typography>
    </AuthLayout>
  )
}
