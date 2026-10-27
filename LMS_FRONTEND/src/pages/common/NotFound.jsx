import { Box, Button, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth, homeFor } from '../../auth/AuthContext'
import { fonts } from '../../theme'

export default function NotFound() {
  const { user } = useAuth()
  return (
    <Box minHeight="100vh" display="flex" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" p={3} bgcolor="background.default">
      <Typography fontFamily={fonts.display} fontWeight={700} fontSize="5rem" color="primary.main" lineHeight={1}>404</Typography>
      <Typography variant="h2" mt={2}>Page not found</Typography>
      <Typography color="text.secondary" mt={1} mb={3}>The page you are looking for does not exist or was moved.</Typography>
      <Button component={RouterLink} to={user ? homeFor(user.role) : '/login'} variant="contained">Go to {user ? 'my dashboard' : 'login'}</Button>
    </Box>
  )
}
