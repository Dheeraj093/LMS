import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import api from '../../api/client'
import useApi from '../../components/ui/useApi'
import { PageHeader, EmptyState, Async, IconBadge, UserAvatar } from '../../components/ui'
import { formatDate } from '../../utils/format'

export default function StudentGroups() {
  const { data, loading, error, reload } = useApi(() => api.get('/groups/my').then((r) => r.data), [])

  return (
    <>
      <PageHeader title="My groups" subtitle="Class groups your teachers added you to. Some quizzes and assignments are only for a group." />
      <Async loading={loading} error={error} onRetry={reload}>
        {data?.length === 0 ? (
          <Card>
            <EmptyState icon={GroupsOutlinedIcon} title="You are not in a group yet"
              description="When a teacher adds you to a group (for example a class batch), it shows up here." />
          </Card>
        ) : (
          <Grid container spacing={2.5}>
            {(data || []).map((g) => (
              <Grid item xs={12} sm={6} md={4} key={g.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', '&:last-child': { pb: 2.5 } }}>
                    <Stack direction="row" gap={1.5} alignItems="center" mb={1.5}>
                      <IconBadge icon={GroupsOutlinedIcon} size={42} />
                      <Box minWidth={0}>
                        <Typography variant="h5" sx={{ wordBreak: 'break-word' }}>{g.name}</Typography>
                        {g.createdAt && <Typography fontSize="0.78rem" color="text.disabled">Since {formatDate(g.createdAt)}</Typography>}
                      </Box>
                    </Stack>
                    <Typography fontSize="0.9rem" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                      {g.description || 'No description.'}
                    </Typography>
                    <Box flex={1} minHeight={16} />
                    <Stack direction="row" justifyContent="space-between" alignItems="center" pt={1.5} borderTop={1} borderColor="divider" gap={1}>
                      <Stack direction="row" alignItems="center" gap={1} minWidth={0}>
                        <UserAvatar name={g.teacherName} size={28} />
                        <Typography fontSize="0.85rem" fontWeight={600} noWrap>{g.teacherName}</Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" gap={0.5} color="text.secondary" flexShrink={0}>
                        <PeopleAltOutlinedIcon sx={{ fontSize: 17 }} />
                        <Typography fontSize="0.85rem">{g.memberCount ?? 0} member{g.memberCount === 1 ? '' : 's'}</Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Async>
    </>
  )
}
