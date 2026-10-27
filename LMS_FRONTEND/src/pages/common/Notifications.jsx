import { useNavigate } from 'react-router-dom'
import { Box, Button, Card, Stack, Typography } from '@mui/material'
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { Async, EmptyState, PageHeader } from '../../components/ui'
import { formatDateTime, timeAgo } from '../../utils/format'
import { resolveLink } from '../../components/layout/links'

export default function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { notify } = useFeedback()
  const { data, loading, error, reload, setData } = useApi(() => api.get('/notifications').then((r) => r.data), [])
  const unread = (data || []).filter((n) => !n.read).length

  const open = async (n) => {
    if (!n.read) {
      await api.patch(`/notifications/${n.id}/read`).catch(() => {})
      setData((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
    }
    if (n.link) navigate(resolveLink(n.link, user.role))
  }

  const readAll = async () => {
    try {
      await api.patch('/notifications/read-all')
      setData((list) => list.map((x) => ({ ...x, read: true })))
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  return (
    <>
      <PageHeader title="Notifications" subtitle={unread ? `${unread} unread` : 'You are all caught up'}
        actions={unread > 0 && <Button variant="outlined" onClick={readAll}>Mark all as read</Button>} />
      <Async loading={loading} error={error} onRetry={reload}>
        <Card>
          {data?.length === 0 ? (
            <EmptyState icon={NotificationsNoneRoundedIcon} title="No notifications" description="Grades, new assignments and other updates show up here." />
          ) : (data || []).map((n) => (
            <Box key={n.id} onClick={() => open(n)} sx={{ px: 2.5, py: 2, display: 'flex', gap: 2, cursor: n.link ? 'pointer' : 'default', borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 }, '&:hover': { bgcolor: 'action.hover' } }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', mt: 0.8, flexShrink: 0, bgcolor: n.read ? 'divider' : 'primary.main' }} />
              <Stack flex={1} minWidth={0}>
                <Typography fontWeight={n.read ? 400 : 600}>{n.message}</Typography>
                <Typography fontSize="0.8rem" color="text.disabled" title={formatDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</Typography>
              </Stack>
            </Box>
          ))}
        </Card>
      </Async>
    </>
  )
}
