import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Link, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import CastForEducationOutlinedIcon from '@mui/icons-material/CastForEducationOutlined'
import AuthLayout from './AuthLayout'
import { useAuth, homeFor } from '../../auth/AuthContext'
import { errorMessage, fieldErrors } from '../../api/client'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STUDENT' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setErrors({})
    setBusy(true)
    try {
      const res = await register({ ...form, name: form.name.trim(), email: form.email.trim() })
      if (res.pending) setPending(res)
      else navigate(homeFor(res.user.role), { replace: true })
    } catch (err) {
      setErrors(fieldErrors(err))
      setError(errorMessage(err, 'Could not create the account'))
    } finally {
      setBusy(false)
    }
  }

  if (pending?.verify) {
    return (
      <AuthLayout title="Check your email" subtitle={`We sent a confirmation link to ${pending.email}.`}>
        <Alert severity="info" sx={{ mb: 3 }}>{pending.message || 'Open the link in the email to activate your account.'} If you do not see it, look in the Spam folder.</Alert>
        <Button component={RouterLink} to={`/verify-email?email=${encodeURIComponent(pending.email || '')}`} variant="outlined" fullWidth sx={{ mb: 1.5 }}>Did not get it? Send again</Button>
        <Button component={RouterLink} to="/login" variant="contained" fullWidth>Back to login</Button>
      </AuthLayout>
    )
  }

  if (pending) {
    return (
      <AuthLayout title="Almost there" subtitle="Your teacher account was created.">
        <Alert severity="info" sx={{ mb: 3 }}>An admin needs to approve teacher accounts. You can log in once you are approved.</Alert>
        <Button component={RouterLink} to="/login" variant="contained" fullWidth>Back to login</Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create your account" subtitle="It takes less than a minute.">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack component="form" onSubmit={submit} gap={2}>
        <Box>
          <Typography fontSize="0.85rem" fontWeight={600} color="text.secondary" mb={1}>I am a</Typography>
          <ToggleButtonGroup exclusive fullWidth value={form.role} onChange={(_, v) => v && setForm({ ...form, role: v })}>
            <ToggleButton value="STUDENT"><SchoolOutlinedIcon fontSize="small" sx={{ mr: 1 }} />Student</ToggleButton>
            <ToggleButton value="TEACHER"><CastForEducationOutlinedIcon fontSize="small" sx={{ mr: 1 }} />Teacher</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <TextField label="Full name" name="name" required value={form.name} onChange={set('name')} error={!!errors.name} helperText={errors.name} />
        <TextField label="Email" name="email" type="email" required value={form.email} onChange={set('email')} error={!!errors.email} helperText={errors.email} />
        <TextField label="Password" name="password" type="password" required value={form.password} onChange={set('password')}
          error={!!errors.password} helperText={errors.password || 'At least 8 characters'} />
        <Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? 'Creating...' : 'Create account'}</Button>
      </Stack>
      <Typography mt={3} textAlign="center" color="text.secondary" fontSize="0.92rem">
        Already have an account? <Link component={RouterLink} to="/login" fontWeight={600}>Log in</Link>
      </Typography>
    </AuthLayout>
  )
}
