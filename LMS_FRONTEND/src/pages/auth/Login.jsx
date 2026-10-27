import { useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Button, IconButton, InputAdornment, Link, Stack, TextField, Typography } from '@mui/material'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import AuthLayout from './AuthLayout'
import { useAuth, homeFor } from '../../auth/AuthContext'
import api, { errorMessage } from '../../api/client'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [unverified, setUnverified] = useState(false)
  const [resent, setResent] = useState('')

  const resend = async () => {
    try {
      const res = await api.post('/auth/resend-verification', { email: form.email.trim() })
      setResent(res.data.message || 'A new link has been sent')
    } catch (err) {
      setResent(errorMessage(err, 'Could not send the email'))
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setUnverified(false)
    setResent('')
    setBusy(true)
    try {
      const user = await login(form.email.trim(), form.password)
      const next = params.get('next')
      navigate(next && next.startsWith('/') ? next : homeFor(user.role), { replace: true })
    } catch (err) {
      // 403 EMAIL_NOT_VERIFIED: the sign-up link was not opened yet. 429: too many wrong passwords (message says how long to wait).
      setUnverified(err.response?.data?.code === 'EMAIL_NOT_VERIFIED')
      setError(errorMessage(err, 'Could not log in'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to continue learning.">
      {params.get('expired') && <Alert severity="info" sx={{ mb: 2 }}>Your session ended. Please log in again.</Alert>}
      {params.get('reset') && <Alert severity="success" sx={{ mb: 2 }}>Password changed. Log in with your new password.</Alert>}
      {params.get('verified') && <Alert severity="success" sx={{ mb: 2 }}>Email confirmed. You can log in now.</Alert>}
      {error && (
        <Alert severity={unverified ? 'warning' : 'error'} sx={{ mb: 2 }}
          action={unverified && !resent ? <Button color="inherit" size="small" onClick={resend}>Send again</Button> : null}>
          {error}
          {resent && <><br />{resent}</>}
        </Alert>
      )}
      <Stack component="form" onSubmit={submit} gap={2}>
        <TextField label="Email" name="email" type="email" autoComplete="email" required autoFocus
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <TextField label="Password" name="password" type={show ? 'text' : 'password'} autoComplete="current-password" required
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          InputProps={{ endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setShow(!show)} aria-label="Show password">
                {show ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ) }} />
        <Link component={RouterLink} to="/forgot-password" alignSelf="flex-end" fontSize="0.88rem" fontWeight={600}>Forgot password?</Link>
        <Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</Button>
      </Stack>
      <Typography mt={3} textAlign="center" color="text.secondary" fontSize="0.92rem">
        New here? <Link component={RouterLink} to="/register" fontWeight={600}>Create an account</Link>
      </Typography>
    </AuthLayout>
  )
}
