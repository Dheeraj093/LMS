import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Box, Button, Divider, IconButton, Popover, Stack, Typography } from '@mui/material'
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded'
import api, { notificationSocketUrl } from '../../api/client'
import { useFeedback } from '../ui/Feedback'
import { timeAgo } from '../../utils/format'
import { resolveLink } from './links'

// Bell with unread count. New notifications arrive live over a WebSocket and show a small message.
// If the live connection is down, it reconnects with a growing wait and checks the count every 60 seconds.
// Other pages can listen to the "lms:notification" window event to reload their data.
export default function NotificationBell({ role }) {
  const navigate = useNavigate()
  const { notify } = useFeedback()
  const notifyRef = useRef(notify)
  notifyRef.current = notify
  const [anchor, setAnchor] = useState(null)
  const [count, setCount] = useState(0)
  const [items, setItems] = useState([])
  const [live, setLive] = useState(false)

  const loadCount = useCallback(() => {
    return api.get('/notifications/unread-count').then((r) => setCount(r.data.unread ?? 0)).catch(() => {})
  }, [])

  useEffect(() => {
    loadCount()
  }, [loadCount])

  // Polling only while the live connection is down.
  useEffect(() => {
    if (live) return undefined
    const id = setInterval(loadCount, 60000)
    return () => clearInterval(id)
  }, [live, loadCount])

  useEffect(() => {
    if (typeof WebSocket === 'undefined') return undefined
    let socket = null
    let stopped = false
    let wait = 2000
    let retryTimer = null
    let pingTimer = null

    const connect = () => {
      if (stopped) return
      socket = new WebSocket(notificationSocketUrl())
      socket.onopen = () => {
        wait = 2000
        setLive(true)
        pingTimer = setInterval(() => socket?.readyState === 1 && socket.send('ping'), 25000)
      }
      socket.onmessage = (event) => {
        let data
        try { data = JSON.parse(event.data) } catch { return }
        if (data.type !== 'NOTIFICATION' || !data.notification) return
        setCount(data.unread ?? ((c) => c + 1))
        setItems((list) => [data.notification, ...list.filter((n) => n.id !== data.notification.id)].slice(0, 8))
        notifyRef.current.info(data.notification.message)
        window.dispatchEvent(new CustomEvent('lms:notification', { detail: data.notification }))
      }
      socket.onclose = () => {
        clearInterval(pingTimer)
        setLive(false)
        if (stopped) return
        // An expired access token closes the handshake. This normal API call renews it before the next try.
        retryTimer = setTimeout(() => loadCount().finally(connect), wait)
        wait = Math.min(wait * 2, 30000)
      }
    }
    connect()
    return () => {
      stopped = true
      clearTimeout(retryTimer)
      clearInterval(pingTimer)
      // Closing a socket that is still connecting prints a browser warning, so close it once it opens.
      if (socket?.readyState === 0) socket.onopen = () => socket.close()
      else socket?.close()
    }
  }, [loadCount])

  const open = (e) => {
    setAnchor(e.currentTarget)
    api.get('/notifications').then((r) => setItems(r.data.slice(0, 8))).catch(() => setItems([]))
  }

  const click = async (n) => {
    setAnchor(null)
    if (!n.read) {
      await api.patch(`/notifications/${n.id}/read`).catch(() => {})
      loadCount()
    }
    if (n.link) navigate(resolveLink(n.link, role))
  }

  const readAll = async () => {
    await api.patch('/notifications/read-all').catch(() => {})
    setItems((list) => list.map((n) => ({ ...n, read: true })))
    setCount(0)
  }

  return (
    <>
      <IconButton onClick={open} sx={{ border: 1, borderColor: 'divider', borderRadius: '10px', width: 40, height: 40 }} aria-label="Notifications">
        <Badge badgeContent={count} color="error" max={99}><NotificationsNoneRoundedIcon fontSize="small" /></Badge>
      </IconButton>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, maxWidth: 'calc(100vw - 24px)', mt: 1, border: 1, borderColor: 'divider' } } }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" px={2} py={1.5}>
          <Typography variant="h5">Notifications</Typography>
          {count > 0 && <Button size="small" onClick={readAll}>Mark all read</Button>}
        </Stack>
        <Divider />
        {items.length === 0 ? (
          <Typography color="text.secondary" p={3} textAlign="center" fontSize="0.9rem">You have no notifications.</Typography>
        ) : items.map((n) => (
          <Box key={n.id} onClick={() => click(n)} sx={{ px: 2, py: 1.5, cursor: 'pointer', display: 'flex', gap: 1.5, borderBottom: 1, borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', mt: 0.8, flexShrink: 0, bgcolor: n.read ? 'transparent' : 'primary.main' }} />
            <Box minWidth={0}>
              <Typography fontSize="0.88rem" fontWeight={n.read ? 400 : 600}>{n.message}</Typography>
              <Typography fontSize="0.75rem" color="text.disabled">{timeAgo(n.createdAt)}</Typography>
            </Box>
          </Box>
        ))}
        <Box p={1} textAlign="center">
          <Button size="small" onClick={() => { setAnchor(null); navigate('/notifications') }}>See all</Button>
        </Box>
      </Popover>
    </>
  )
}
