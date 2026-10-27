import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, ListItemIcon, Menu, MenuItem,
  Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Tabs, TextField, Typography,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded'
import DownloadButton from '../../components/ui/DownloadButton'
import AddUserDialog from './AddUserDialog'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useFeedback } from '../../components/ui/Feedback'
import { Async, EmptyState, PageHeader, StatusChip, UserAvatar } from '../../components/ui'
import { formatDate, timeAgo, number } from '../../utils/format'
import { fonts } from '../../theme'

// Tabs = filters on the user list. Counts come from the admin dashboard numbers.
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'STUDENT', label: 'Students', role: 'STUDENT' },
  { key: 'TEACHER', label: 'Teachers', role: 'TEACHER' },
  { key: 'ADMIN', label: 'Admins', role: 'ADMIN' },
  { key: 'PENDING', label: 'Pending', status: 'PENDING' },
  { key: 'BLOCKED', label: 'Blocked', status: 'BLOCKED' },
]

export default function AdminUsers() {
  const { user: me } = useAuth()
  const { notify, confirm } = useFeedback()
  const [params, setParams] = useSearchParams()
  const initialTab = params.get('status') || params.get('role') || 'all'
  const [tab, setTab] = useState(TABS.some((t) => t.key === initialTab) ? initialTab : 'all')
  const [search, setSearch] = useState(params.get('search') || '')
  const [query, setQuery] = useState(params.get('search') || '')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [counts, setCounts] = useState({})
  const [menu, setMenu] = useState(null) // { anchor, user }
  const [roleDialog, setRoleDialog] = useState(null)
  const [adding, setAdding] = useState(false)

  // The top bar search sends ?search=...
  useEffect(() => {
    const s = params.get('search') || ''
    setSearch(s)
    setQuery(s)
  }, [params])

  // Debounce typing in the search box.
  useEffect(() => {
    const id = setTimeout(() => { setQuery(search.trim()); setPage(0) }, 350)
    return () => clearTimeout(id)
  }, [search])

  const load = async () => {
    const t = TABS.find((x) => x.key === tab)
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/admin/users', { params: { role: t.role, status: t.status, search: query || undefined, page, size } })
      setData(res.data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  const loadCounts = async () => {
    try {
      const reqs = TABS.map((t) => api.get('/admin/users', { params: { role: t.role, status: t.status, page: 0, size: 1 } }))
      const res = await Promise.all(reqs)
      setCounts(Object.fromEntries(TABS.map((t, i) => [t.key, res[i].data.totalElements])))
    } catch { /* counts are optional */ }
  }

  useEffect(() => { load() }, [tab, query, page, size]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadCounts() }, [])

  const changeTab = (key) => {
    setTab(key)
    setPage(0)
    const next = new URLSearchParams(params)
    next.delete('status'); next.delete('role')
    const t = TABS.find((x) => x.key === key)
    if (t.status) next.set('status', t.status)
    if (t.role) next.set('role', t.role)
    setParams(next, { replace: true })
  }

  const run = async (fn, message) => {
    setMenu(null)
    try {
      await fn()
      notify.success(message)
      load()
      loadCounts()
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  const approve = (u) => run(() => api.patch(`/admin/users/${u.id}/approve`), `${u.name} can now log in`)
  const setStatus = async (u, status) => {
    if (status === 'BLOCKED' && !(await confirm({ title: `Block ${u.name}?`, message: 'They will be logged out and cannot log in until you unblock them.', confirmText: 'Block', danger: true }))) {
      setMenu(null)
      return
    }
    run(() => api.patch(`/admin/users/${u.id}/status`, { status }), status === 'BLOCKED' ? `${u.name} is blocked` : `${u.name} is active again`)
  }
  const saveRole = () => {
    const { user: u, role } = roleDialog
    setRoleDialog(null)
    run(() => api.patch(`/admin/users/${u.id}/role`, { role }), `${u.name} is now ${role.toLowerCase()}`)
  }

  const users = data?.content || []

  return (
    <>
      <PageHeader title="Users and roles" subtitle="Manage accounts, approve teachers and control access." actions={(
        <>
          <DownloadButton formats={[{
            format: 'xlsx', label: 'Export Excel', path: '/admin/users/export', fileName: 'users.xlsx',
            params: { role: TABS.find((x) => x.key === tab)?.role, status: TABS.find((x) => x.key === tab)?.status, search: query || undefined },
          }]} />
          <Button variant="contained" startIcon={<PersonAddAltRoundedIcon />} onClick={() => setAdding(true)}>Add user</Button>
        </>
      )} />
      <Card>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={1.5} px={2} pt={1.5} pb={{ xs: 1.5, md: 0 }}>
          <Tabs value={tab} onChange={(_, v) => changeTab(v)} variant="scrollable" scrollButtons="auto" sx={{ minHeight: 44 }}>
            {TABS.map((t) => (
              <Tab key={t.key} value={t.key} label={
                <Stack direction="row" gap={0.75} alignItems="center">
                  {t.label}
                  {counts[t.key] != null && <Typography component="span" fontFamily={fonts.mono} fontSize="0.75rem" color="text.disabled">{number(counts[t.key])}</Typography>}
                </Stack>
              } />
            ))}
          </Tabs>
          <TextField
            placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ maxWidth: { md: 280 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
          />
        </Stack>
        <Box mt={1.5}>
          <Async loading={loading && !data} error={error} onRetry={load}>
            {users.length === 0 ? (
              <EmptyState icon={PeopleAltOutlinedIcon} title="No users found" description={query ? 'Try a different search.' : 'Nobody matches this filter.'} />
            ) : (
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 760 }}>
                  <TableHead>
                    <TableRow><TableCell>User</TableCell><TableCell>Role</TableCell><TableCell>Joined</TableCell><TableCell>Last active</TableCell><TableCell>Status</TableCell><TableCell align="right" /></TableRow>
                  </TableHead>
                  <TableBody sx={{ opacity: loading ? 0.6 : 1 }}>
                    {users.map((u) => {
                      const self = u.id === me.id
                      return (
                        <TableRow key={u.id} hover>
                          <TableCell>
                            <Stack direction="row" gap={1.5} alignItems="center">
                              <UserAvatar name={u.name} src={u.avatarUrl} />
                              <Box minWidth={0}>
                                <Typography fontWeight={700} fontSize="0.9rem">{u.name}{self && ' (you)'}</Typography>
                                <Typography fontSize="0.8rem" color="text.secondary">{u.email}</Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell><StatusChip status={u.roleName} /></TableCell>
                          <TableCell>{formatDate(u.createdAt)}</TableCell>
                          <TableCell>{timeAgo(u.lastActiveAt)}</TableCell>
                          <TableCell><StatusChip status={u.status} /></TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            {u.status === 'PENDING' && <Button size="small" variant="contained" onClick={() => approve(u)} sx={{ mr: 1, minHeight: 30 }}>Approve</Button>}
                            {!self && <IconButton size="small" onClick={(e) => setMenu({ anchor: e.currentTarget, user: u })} aria-label="Actions"><MoreHorizRoundedIcon /></IconButton>}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {data && data.totalElements > 0 && (
              <TablePagination component="div" count={data.totalElements} page={page} rowsPerPage={size}
                onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setSize(+e.target.value); setPage(0) }} rowsPerPageOptions={[10, 20, 50]} />
            )}
          </Async>
        </Box>
      </Card>

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        {menu?.user.status === 'PENDING' && (
          <MenuItem onClick={() => approve(menu.user)}><ListItemIcon><CheckCircleOutlineRoundedIcon fontSize="small" /></ListItemIcon>Approve</MenuItem>
        )}
        {menu?.user.status === 'BLOCKED' ? (
          <MenuItem onClick={() => setStatus(menu.user, 'ACTIVE')}><ListItemIcon><CheckCircleOutlineRoundedIcon fontSize="small" /></ListItemIcon>Unblock</MenuItem>
        ) : (
          <MenuItem onClick={() => setStatus(menu.user, 'BLOCKED')} sx={{ color: 'error.main' }}><ListItemIcon><BlockRoundedIcon fontSize="small" color="error" /></ListItemIcon>Block</MenuItem>
        )}
        <MenuItem onClick={() => { setRoleDialog({ user: menu.user, role: menu.user.roleName }); setMenu(null) }}>
          <ListItemIcon><SwapHorizRoundedIcon fontSize="small" /></ListItemIcon>Change role
        </MenuItem>
      </Menu>

      <AddUserDialog open={adding} onClose={() => setAdding(false)} onCreated={(u) => {
        setAdding(false)
        notify.success(`${u.name} was added`)
        load()
        loadCounts()
      }} />
      <Dialog open={!!roleDialog} onClose={() => setRoleDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Change role of {roleDialog?.user.name}</DialogTitle>
        <DialogContent>
          <TextField select label="Role" value={roleDialog?.role || ''} onChange={(e) => setRoleDialog({ ...roleDialog, role: e.target.value })} sx={{ mt: 1 }}>
            <MenuItem value="STUDENT">Student</MenuItem>
            <MenuItem value="TEACHER">Teacher</MenuItem>
            <MenuItem value="ADMIN">Admin</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setRoleDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveRole} disabled={roleDialog?.role === roleDialog?.user.roleName}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
