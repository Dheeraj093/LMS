import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import AuthLayout from './AuthLayout'
import api, { errorMessage } from '../../api/client'
import { formatDate } from '../../utils/format'

// Public page: anyone (for example an employer) can check a certificate code.
export default function VerifyCertificate() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [input, setInput] = useState(code || '')
  const [cert, setCert] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code) return
    setCert(null)
    setError('')
    api.get(`/certificates/verify/${encodeURIComponent(code)}`)
      .then((r) => setCert(r.data))
      .catch((e) => setError(e.response?.status === 404 ? 'No certificate has this code.' : errorMessage(e)))
  }, [code])

  return (
    <AuthLayout title="Verify a certificate" subtitle="Enter the code printed on the certificate.">
      <Stack component="form" gap={2} onSubmit={(e) => { e.preventDefault(); if (input.trim()) navigate(`/verify/${input.trim()}`) }}>
        <TextField label="Certificate code" value={input} onChange={(e) => setInput(e.target.value)} />
        <Button type="submit" variant="contained">Check</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {cert && (
        <Box mt={3} p={2.5} borderRadius="12px" bgcolor="success.light" color="success.main">
          <Stack direction="row" gap={1} alignItems="center" mb={1}><VerifiedRoundedIcon /><Typography fontWeight={700}>Valid certificate</Typography></Stack>
          <Typography color="text.primary"><b>{cert.studentName}</b> completed <b>{cert.courseTitle}</b></Typography>
          <Typography color="text.secondary" fontSize="0.9rem">Teacher: {cert.teacherName} · Issued {formatDate(cert.issuedAt)}</Typography>
        </Box>
      )}
    </AuthLayout>
  )
}
