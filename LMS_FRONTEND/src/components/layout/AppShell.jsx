import { useState } from 'react'
import { Link as RouterLink, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar, Box, Container, Divider, Drawer, IconButton, InputBase, List, ListItemButton, ListItemIcon,
  ListItemText, Menu, MenuItem, Stack, Toolbar, Typography, useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded'
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded'
import { useAuth } from '../../auth/AuthContext'
import { useColorMode } from '../../colorMode'
import { NAV, isActive } from './navConfig'
import NotificationBell from './NotificationBell'
import { UserAvatar } from '../ui'

export function Brand({ to = '/' }) {
  return (
    <Stack component={RouterLink} to={to} direction="row" alignItems="center" gap={1.25} sx={{ textDecoration: 'none', color: 'text.primary', flexShrink: 0 }}>
      <Box sx={{ width: 34, height: 34, borderRadius: '10px', backgroundImage: (th) => th.palette.lms.gradient, color: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px rgba(91,76,240,.3)' }}>
        <AutoStoriesRoundedIcon sx={{ fontSize: 19 }} />
      </Box>
      <Typography variant="h3" component="span" sx={{ fontSize: '1.25rem' }}>Learnly</Typography>
    </Stack>
  )
}

const roleLabel = { ADMIN: 'Admin', TEACHER: 'Teacher', STUDENT: 'Student' }

// Page frame for logged-in users: top bar with role menu, search, notifications and account menu.
export default function AppShell({ children, wide = false }) {
  const { user, logout } = useAuth()
  const { mode, toggle } = useColorMode()
  const theme = useTheme()
  const t = theme.palette.lms
  const desktop = useMediaQuery(theme.breakpoints.up('lg'))
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [drawer, setDrawer] = useState(false)
  const [menu, setMenu] = useState(null)
  const [more, setMore] = useState(null)
  const [q, setQ] = useState('')

  const nav = NAV[user.role]
  // With many menu items (teacher) the search box only fits on very wide screens.
  const crowded = nav.main.length > 5
  // More than 6 items: the first 5 stay in the bar, the rest go under "More".
  const shownNav = nav.main.length > 6 ? nav.main.slice(0, 5) : nav.main
  const moreNav = nav.main.slice(shownNav.length)
  const moreActive = moreNav.some((item) => isActive(item, pathname))
  const home = nav.main[0].to

  const submitSearch = (e) => {
    e.preventDefault()
    if (q.trim()) navigate(nav.search.to(q.trim()))
  }

  const doLogout = () => {
    setMenu(null)
    logout()
    navigate('/login')
  }

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2, minHeight: { xs: 60, sm: 64 }, px: { xs: 2, sm: 3 } }}>
          {!desktop && (
            <IconButton edge="start" onClick={() => setDrawer(true)} aria-label="Open menu"><MenuRoundedIcon /></IconButton>
          )}
          <Brand to={home} />
          {desktop && (
            <Stack direction="row" alignSelf="stretch" ml={2}>
              {shownNav.map((item) => {
                const active = isActive(item, pathname)
                const Icon = item.icon
                return (
                  <Box
                    key={item.to}
                    component={NavLink}
                    to={item.to}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, textDecoration: 'none', position: 'relative',
                      fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', color: active ? 'primary.main' : 'text.secondary',
                      '&:hover': { color: active ? 'primary.main' : 'text.primary' },
                      '&::after': active ? { content: '""', position: 'absolute', left: 10, right: 10, bottom: 0, height: 3, borderRadius: '3px 3px 0 0', bgcolor: 'primary.main' } : {},
                    }}
                  >
                    <Icon sx={{ fontSize: 18 }} />{item.label}
                  </Box>
                )
              })}
              {moreNav.length > 0 && (
                <Box component="button" type="button" onClick={(e) => setMore(e.currentTarget)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, border: 0, background: 'none', cursor: 'pointer', position: 'relative',
                    fontFamily: 'inherit', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', color: moreActive ? 'primary.main' : 'text.secondary',
                    '&:hover': { color: moreActive ? 'primary.main' : 'text.primary' },
                    '&::after': moreActive ? { content: '""', position: 'absolute', left: 10, right: 10, bottom: 0, height: 3, borderRadius: '3px 3px 0 0', bgcolor: 'primary.main' } : {},
                  }}
                >
                  More<ExpandMoreRoundedIcon sx={{ fontSize: 18 }} />
                </Box>
              )}
              <Menu anchorEl={more} open={!!more} onClose={() => setMore(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
                {moreNav.map((item) => {
                  const Icon = item.icon
                  return (
                    <MenuItem key={item.to} selected={isActive(item, pathname)} onClick={() => { setMore(null); navigate(item.to) }}>
                      <ListItemIcon><Icon fontSize="small" /></ListItemIcon>{item.label}
                    </MenuItem>
                  )
                })}
              </Menu>
            </Stack>
          )}
          <Box flex={1} />
          <Box component="form" onSubmit={submitSearch} sx={{ display: { xs: 'none', md: 'flex', lg: crowded ? 'none' : 'flex', xl: 'flex' }, flexShrink: 0, alignItems: 'center', gap: 1, bgcolor: t.sunk, borderRadius: '10px', px: 1.5, height: 40, width: { md: 220, xl: 260 } }}>
            <SearchRoundedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            <InputBase value={q} onChange={(e) => setQ(e.target.value)} placeholder={nav.search.placeholder} sx={{ fontSize: '0.9rem', flex: 1 }} inputProps={{ 'aria-label': 'Search' }} />
          </Box>
          <NotificationBell role={user.role} />
          <Stack direction="row" alignItems="center" gap={1.25} onClick={(e) => setMenu(e.currentTarget)} sx={{ cursor: 'pointer', pl: 1, borderLeft: { sm: 1 }, borderColor: { sm: 'divider' } }}>
            <UserAvatar name={user.name} src={user.avatarUrl} size={38} />
            <Box display={{ xs: 'none', sm: 'block' }} lineHeight={1.2}>
              <Typography fontWeight={700} fontSize="0.9rem" noWrap maxWidth={140}>{user.name}</Typography>
              <Typography fontSize="0.75rem" color="text.disabled">{roleLabel[user.role]}</Typography>
            </Box>
          </Stack>
          <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { mt: 1, minWidth: 220, border: 1, borderColor: 'divider' } } }}>
            <Box px={2} py={1}>
              <Typography fontWeight={700} fontSize="0.9rem">{user.name}</Typography>
              <Typography fontSize="0.8rem" color="text.secondary">{user.email}</Typography>
            </Box>
            <Divider />
            {nav.extra.map((item) => (
              <MenuItem key={item.to} onClick={() => { setMenu(null); navigate(item.to) }}>
                <ListItemIcon><item.icon fontSize="small" /></ListItemIcon>{item.label}
              </MenuItem>
            ))}
            <MenuItem onClick={() => { setMenu(null); navigate('/profile') }}>
              <ListItemIcon><PersonOutlineRoundedIcon fontSize="small" /></ListItemIcon>Profile and password
            </MenuItem>
            <MenuItem onClick={() => { setMenu(null); navigate('/notifications') }}>
              <ListItemIcon><NotificationsNoneRoundedIcon fontSize="small" /></ListItemIcon>Notifications
            </MenuItem>
            <MenuItem onClick={toggle}>
              <ListItemIcon>{mode === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}</ListItemIcon>
              {mode === 'dark' ? 'Light mode' : 'Dark mode'}
            </MenuItem>
            <Divider />
            <MenuItem onClick={doLogout}>
              <ListItemIcon><LogoutRoundedIcon fontSize="small" /></ListItemIcon>Log out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer open={drawer} onClose={() => setDrawer(false)} slotProps={{ paper: { sx: { width: 280 } } }}>
        <Box p={2.5}><Brand to={home} /></Box>
        <Box component="form" onSubmit={(e) => { submitSearch(e); setDrawer(false) }} sx={{ mx: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1, bgcolor: t.sunk, borderRadius: '10px', px: 1.5, height: 40 }}>
          <SearchRoundedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
          <InputBase value={q} onChange={(e) => setQ(e.target.value)} placeholder={nav.search.placeholder} sx={{ fontSize: '0.9rem', flex: 1 }} />
        </Box>
        <List sx={{ px: 1 }}>
          {[...nav.main, ...nav.extra].map((item) => (
            <ListItemButton key={item.to} selected={isActive(item, pathname)} onClick={() => { setDrawer(false); navigate(item.to) }} sx={{ borderRadius: '10px', mb: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 38 }}><item.icon fontSize="small" /></ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.92rem' }} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Container maxWidth={wide ? 'xl' : 'lg'} sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
        {children}
      </Container>
    </Box>
  )
}
