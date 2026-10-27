import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Grid, Stack, TextField, Typography } from '@mui/material'
import api, { errorMessage, fieldErrors } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { Async, FileDrop, PageHeader, StatusChip, UserAvatar } from '../../components/ui'
import { formatDate } from '../../utils/format'

export default function Profile() {
  const { refresh } = useAuth()
  const { notify } = useFeedback()
  const me = useApi(() => api.get('/auth/me').then((r) => r.data), [])
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(null) // FileResponse of a new upload
  const [saving, setSaving] = useState(false)
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState({})
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => { if (me.data) setName(me.data.name) }, [me.data])

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.put('/auth/me', { name: name.trim(), avatarFileId: avatar?.id })
      me.setData(res.data)
      refresh(res.data)
      setAvatar(null)
      notify.success('Profile saved')
    } catch (err) {
      notify.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (pw.newPassword !== pw.confirm) return setPwErrors({ confirm: 'The two passwords do not match' })
    setPwErrors({})
    setPwSaving(true)
    try {
      const res = await api.put('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword })
      // Old tokens stop working after a password change, so keep the new one.
      refresh(res.data, res.data.token)
      setPw({ currentPassword: '', newPassword: '', confirm: '' })
      notify.success('Password changed. Other devices were logged out.')
    } catch (err) {
      setPwErrors(fieldErrors(err))
      notify.error(errorMessage(err))
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="Profile and password" subtitle="Update your name, picture and password." />
      <Async loading={me.loading} error={me.error} onRetry={me.reload}>
        {me.data && (
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={7}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" gap={2} alignItems="center" mb={3}>
                    <UserAvatar name={me.data.name} src={avatar?.url || me.data.avatarUrl} size={72} />
                    <Box>
                      <Typography variant="h3">{me.data.name}</Typography>
                      <Typography color="text.secondary">{me.data.email}</Typography>
                      <Stack direction="row" gap={1} mt={1}><StatusChip status={me.data.roleName} /><StatusChip status={me.data.status} /></Stack>
                    </Box>
                  </Stack>
                  <Stack component="form" onSubmit={saveProfile} gap={2}>
                    <TextField label="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
                    <Box>
                      <Typography fontSize="0.85rem" fontWeight={600} color="text.secondary" mb={1}>Profile picture</Typography>
                      <FileDrop purpose="AVATAR" accept="image/png,image/jpeg,image/webp,image/gif" label="Drop an image here or" hint="PNG, JPG, WEBP or GIF"
                        current={avatar} onUploaded={setAvatar} onClear={() => setAvatar(null)} />
                    </Box>
                    <Typography fontSize="0.8rem" color="text.disabled">Member since {formatDate(me.data.createdAt)}</Typography>
                    <Box><Button type="submit" variant="contained" disabled={saving || !name.trim()}>{saving ? 'Saving...' : 'Save profile'}</Button></Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={5}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h4" mb={0.5}>Change password</Typography>
                  <Typography color="text.secondary" fontSize="0.9rem" mb={2.5}>You stay logged in here; other devices are logged out.</Typography>
                  <Stack component="form" onSubmit={changePassword} gap={2}>
                    <TextField label="Current password" type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} error={!!pwErrors.currentPassword} helperText={pwErrors.currentPassword} />
                    <TextField label="New password" type="password" required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} error={!!pwErrors.newPassword} helperText={pwErrors.newPassword || 'At least 8 characters'} />
                    <TextField label="Repeat new password" type="password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={!!pwErrors.confirm} helperText={pwErrors.confirm} />
                    <Box><Button type="submit" variant="contained" disabled={pwSaving}>{pwSaving ? 'Saving...' : 'Change password'}</Button></Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Async>
    </>
  )
}
