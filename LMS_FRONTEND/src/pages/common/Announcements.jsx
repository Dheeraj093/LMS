import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Card, MenuItem, Stack, TextField, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import api, { errorMessage } from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { Async, EmptyState, PageHeader } from '../../components/ui'
import { useAuth, ROLE } from '../../auth/AuthContext'
import { AnnouncementCard, AnnouncementDialog } from './AnnouncementParts'

// Student: announcements of joined courses. Teacher: of own courses (can post, edit, delete). Admin: all.
// ?id=12 (from a notification) highlights and scrolls to one; ?course=3 filters by course.
async function loadAll(canPost) {
  const [items, courses] = await Promise.all([
    api.get('/announcements/my').then((r) => r.data),
    // Teachers get their own courses (admins all) for the "New announcement" course picker.
    canPost ? api.get('/courses').then((r) => r.data) : [],
  ])
  return { items, courses }
}

export default function Announcements() {
  const { user } = useAuth()
  const canPost = user?.role === ROLE.TEACHER || user?.role === ROLE.ADMIN
  const { notify, confirm } = useFeedback()
  const [params, setParams] = useSearchParams()
  const { data, loading, error, reload, setData } = useApi(() => loadAll(canPost), [canPost])
  const [dialog, setDialog] = useState(null) // { item } while the dialog is open
  const highlightId = Number(params.get('id')) || null
  const courseFilter = params.get('course') || ''
  const highlightRef = useRef(null)

  const items = data?.items || []
  // Filter choices: every course that has announcements, plus (for teachers) their own courses.
  const courseOptions = useMemo(() => {
    const map = new Map()
    items.forEach((a) => map.set(String(a.courseId), a.courseTitle))
    ;(data?.courses || []).forEach((c) => map.set(String(c.id), c.title))
    return [...map.entries()].map(([id, title]) => ({ id, title })).sort((a, b) => String(a.title).localeCompare(String(b.title)))
  }, [items, data?.courses])
  const shown = courseFilter ? items.filter((a) => String(a.courseId) === courseFilter) : items

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  // A highlighted announcement hidden by the course filter: drop the filter so it can be seen.
  useEffect(() => {
    if (highlightId && courseFilter && items.some((a) => a.id === highlightId && String(a.courseId) !== courseFilter)) {
      setParam('course', '')
    }
  }, [highlightId, courseFilter, items]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to the highlighted one once it is on the page.
  useEffect(() => {
    if (highlightId && highlightRef.current) highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [highlightId, shown.length])

  const saved = (item, created) => {
    setDialog(null)
    notify.success(created ? 'Announcement posted. Enrolled students were notified.' : 'Announcement saved')
    reload()
    if (created) setParam('id', String(item.id))
  }

  const remove = async (item) => {
    if (!(await confirm({ title: 'Delete announcement?', message: `"${item.title}" will be removed for every student.`, confirmText: 'Delete', danger: true }))) return
    try {
      await api.delete(`/announcements/${item.id}`)
      setData((d) => ({ ...d, items: d.items.filter((a) => a.id !== item.id) }))
      notify.success('Announcement deleted')
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  return (
    <>
      <PageHeader
        title="Announcements"
        subtitle={canPost ? 'News and updates you share with the students of your courses.' : 'News and updates from your teachers.'}
        actions={canPost && (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setDialog({ item: null })} disabled={!data}>
            New announcement
          </Button>
        )}
      />
      <Async loading={loading && !data} error={error} onRetry={reload}>
        {data && (
          <>
            {courseOptions.length > 1 && (
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1.5} mb={2.5}>
                <TextField select size="small" value={courseFilter} onChange={(e) => setParam('course', e.target.value)}
                  SelectProps={{ displayEmpty: true }} sx={{ width: { xs: '100%', sm: 300 } }} inputProps={{ 'aria-label': 'Course' }}>
                  <MenuItem value="">All courses</MenuItem>
                  {courseOptions.map((c) => <MenuItem key={c.id} value={c.id}>{c.title}</MenuItem>)}
                </TextField>
                <Typography fontSize="0.85rem" color="text.disabled">{shown.length} announcement{shown.length === 1 ? '' : 's'}</Typography>
              </Stack>
            )}
            {shown.length === 0 ? (
              <Card>
                <EmptyState icon={CampaignOutlinedIcon} title="No announcements yet"
                  description={canPost
                    ? 'Post an announcement to tell every student of a course about a change, a deadline or a live session.'
                    : 'When your teachers post news for your courses, it shows up here and under the bell.'}
                  action={canPost && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setDialog({ item: null })}>New announcement</Button>} />
              </Card>
            ) : (
              <Stack gap={2} maxWidth={860}>
                {shown.map((a) => (
                  <AnnouncementCard key={a.id} item={a} highlighted={a.id === highlightId}
                    ref={a.id === highlightId ? highlightRef : undefined}
                    onEdit={(item) => setDialog({ item })} onDelete={remove} />
                ))}
              </Stack>
            )}
          </>
        )}
      </Async>
      <AnnouncementDialog open={!!dialog} item={dialog?.item} courses={data?.courses || []}
        courseId={!dialog?.item && courseFilter ? Number(courseFilter) : undefined}
        onClose={() => setDialog(null)} onSaved={saved} />
    </>
  )
}
