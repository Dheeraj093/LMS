import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Card, CardActionArea, CardContent, Grid, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import api, { errorMessage } from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { useAuth, ROLE } from '../../auth/AuthContext'
import { Async, EmptyState, IconBadge, LinkButton, PageHeader } from '../../components/ui'
import { formatDate } from '../../utils/format'
import { MemberAvatars, SearchField, TableCard } from './TeacherShared'

export default function Groups() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notify, confirm } = useFeedback()
  const { data, loading, error, reload, setData } = useApi(() => api.get('/groups').then((r) => r.data), [])
  const [search, setSearch] = useState('')
  const isAdmin = user?.role === ROLE.ADMIN

  const groups = data || []
  const s = search.trim().toLowerCase()
  const shown = groups.filter((g) => !s || g.name.toLowerCase().includes(s) || (g.description || '').toLowerCase().includes(s))

  const remove = async (g) => {
    if (!(await confirm({ title: `Delete "${g.name}"?`, message: 'Quizzes and assignments shared with this group will no longer reach its members through it.', confirmText: 'Delete', danger: true }))) return
    try {
      await api.delete(`/groups/${g.id}`)
      setData((l) => l.filter((x) => x.id !== g.id))
      notify.success('Group deleted')
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  const newButton = <LinkButton to="/teacher/groups/new" variant="contained" startIcon={<AddRoundedIcon />}>New group</LinkButton>

  return (
    <Box>
      <PageHeader title="Groups" subtitle="Batches of students you can share quizzes and assignments with." actions={newButton} />
      <Async loading={loading} error={error} onRetry={reload}>
        {groups.length === 0 ? (
          <TableCard>
            <EmptyState icon={GroupsOutlinedIcon} title="No groups yet"
              description="Make a group like 'Morning batch', add students, then pick it as the audience of a quiz or assignment."
              action={newButton} />
          </TableCard>
        ) : (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} mb={2}>
              <Typography color="text.secondary" fontWeight={600} fontSize="0.9rem">{groups.length} group{groups.length === 1 ? '' : 's'}</Typography>
              <SearchField value={search} onChange={setSearch} placeholder="Search groups" />
            </Stack>
            {shown.length === 0 ? <TableCard><EmptyState title="No matching groups" /></TableCard> : (
              <Grid container spacing={2}>
                {shown.map((g) => (
                  <Grid item xs={12} sm={6} lg={4} key={g.id}>
                    <Card sx={{ height: '100%', position: 'relative' }}>
                      <CardActionArea onClick={() => navigate(`/teacher/groups/${g.id}`)} sx={{ height: '100%', alignItems: 'stretch', display: 'flex' }}>
                        <CardContent sx={{ p: 2.5, width: '100%', display: 'flex', flexDirection: 'column' }}>
                          <Stack direction="row" gap={1.5} alignItems="center" mb={1.5} pr={4}>
                            <IconBadge icon={GroupsOutlinedIcon} size={40} />
                            <Box minWidth={0}>
                              <Typography variant="h5" noWrap>{g.name}</Typography>
                              <Typography fontSize="0.78rem" color="text.disabled">
                                Created {formatDate(g.createdAt)}{isAdmin && g.teacherName ? ` · ${g.teacherName}` : ''}
                              </Typography>
                            </Box>
                          </Stack>
                          <Typography fontSize="0.88rem" color="text.secondary" mb={2} flex={1}
                            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {g.description || 'No description'}
                          </Typography>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography fontWeight={700} fontSize="0.88rem">{g.memberCount ?? g.members?.length ?? 0} member{(g.memberCount ?? 0) === 1 ? '' : 's'}</Typography>
                            <MemberAvatars members={g.members || []} />
                          </Stack>
                        </CardContent>
                      </CardActionArea>
                      <Tooltip title="Delete group">
                        <IconButton size="small" onClick={() => remove(g)} sx={{ position: 'absolute', top: 12, right: 12 }} aria-label="Delete group">
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}
      </Async>
    </Box>
  )
}
