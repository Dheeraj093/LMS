import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, Chip, Stack, TextField, Typography } from '@mui/material'
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
import api, { errorMessage } from '../../api/client'
import { useAuth, ROLE } from '../../auth/AuthContext'
import { IconBadge } from '../../components/ui'
import { fonts } from '../../theme'

// /join and /join/:code. A teacher shares a quiz code or link; a student opens it here.
export default function JoinQuiz() {
  const { code } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [input, setInput] = useState(code || '')
  const [quiz, setQuiz] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!code) return
    setBusy(true)
    setError('')
    setQuiz(null)
    api.get(`/quiz/join/${encodeURIComponent(code)}`)
      .then((r) => setQuiz(r.data))
      .catch((e) => setError(e.response?.status === 404 ? "That code didn't match any quiz. Check it and try again." : errorMessage(e)))
      .finally(() => setBusy(false))
  }, [code])

  const submit = (e) => {
    e.preventDefault()
    const c = input.trim().toUpperCase()
    if (c) navigate(`/join/${c}`)
  }

  return (
    <Box maxWidth={520} mx="auto" mt={{ xs: 2, md: 6 }}>
      <Card>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
          <Box display="flex" justifyContent="center" mb={2}><IconBadge icon={QrCode2RoundedIcon} size={52} /></Box>
          <Typography variant="h2" mb={0.5}>Join a quiz</Typography>
          <Typography color="text.secondary" mb={3}>Enter the code your teacher shared.</Typography>
          <Stack component="form" onSubmit={submit} gap={1.5}>
            <TextField placeholder="e.g. 7F3K9Q" value={input} onChange={(e) => setInput(e.target.value.toUpperCase())}
              inputProps={{ style: { textAlign: 'center', fontFamily: fonts.mono, letterSpacing: '0.2em', fontSize: '1.15rem' }, maxLength: 12 }} />
            <Button type="submit" variant="contained" size="large" disabled={busy || !input.trim()}>{busy ? 'Checking...' : 'Find quiz'}</Button>
          </Stack>
          {error && <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>{error}</Alert>}
          {quiz && (
            <Box mt={3} p={2.5} borderRadius="12px" bgcolor="action.hover" textAlign="left">
              <Typography variant="h4">{quiz.title}</Typography>
              {quiz.description && <Typography color="text.secondary" fontSize="0.9rem" mt={0.5}>{quiz.description}</Typography>}
              <Stack direction="row" gap={1} mt={1.5} flexWrap="wrap">
                <Chip size="small" icon={<TimerOutlinedIcon />} label={`${quiz.timeLimitInMinutes} min`} />
                <Chip size="small" label={`${quiz.questionIds?.length || 0} questions`} />
                <Chip size="small" label={`${quiz.totalMarks} marks`} />
              </Stack>
              {user.role === ROLE.STUDENT ? (
                <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={() => navigate(`/quiz/${quiz.id}/take`)}>Start quiz</Button>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>This is your quiz. Students who open this code can take it.</Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
