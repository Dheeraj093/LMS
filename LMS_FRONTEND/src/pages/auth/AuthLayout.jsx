import { Box, Card, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { Brand } from '../../components/layout/AppShell'

const points = [
  'Courses with video, PDF and text lessons',
  'Timed quizzes with instant results',
  'Assignments, grades and certificates',
  'Dashboards for students, teachers and admins',
]

// Two-column frame for login, register and password pages.
export default function AuthLayout({ title, subtitle, children }) {
  const t = useTheme().palette.lms
  return (
    <Box minHeight="100vh" display="grid" gridTemplateColumns={{ xs: '1fr', md: '1.05fr 1fr' }} bgcolor="background.default">
      <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between', p: 6, color: '#fff',
        background: `radial-gradient(900px 520px at 0% 0%, #6D5DF6 0%, transparent 62%), radial-gradient(700px 480px at 100% 100%, rgba(15,168,143,.45) 0%, transparent 60%), #1A1745` }}>
        <Box sx={{ '& span': { color: '#fff' } }}><Brand to="/login" /></Box>
        <Box maxWidth={460}>
          <Typography variant="h1" sx={{ fontSize: '2.6rem', lineHeight: 1.1, mb: 2 }}>Learn, teach and track progress in one place.</Typography>
          <Typography sx={{ color: '#C9C5F2', mb: 4 }}>Learnly is a learning platform for colleges and training teams.</Typography>
          <Stack gap={1.5}>
            {points.map((p) => (
              <Stack key={p} direction="row" gap={1.5} alignItems="center">
                <CheckCircleRoundedIcon sx={{ color: '#FBBF24', fontSize: 20 }} />
                <Typography>{p}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
        <Typography fontSize="0.8rem" sx={{ color: '#C9C5F2' }}>© {new Date().getFullYear()} Learnly</Typography>
      </Box>
      <Box display="flex" alignItems="center" justifyContent="center" p={{ xs: 2, sm: 4 }}>
        <Box width="100%" maxWidth={440}>
          <Box display={{ xs: 'block', md: 'none' }} mb={3}><Brand to="/login" /></Box>
          <Card sx={{ p: { xs: 3, sm: 4 }, borderColor: t.line }}>
            <Typography variant="h2" mb={0.5}>{title}</Typography>
            {subtitle && <Typography color="text.secondary" mb={3}>{subtitle}</Typography>}
            {children}
          </Card>
        </Box>
      </Box>
    </Box>
  )
}
