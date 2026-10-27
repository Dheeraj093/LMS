import { useState } from 'react'
import { Button, Card, Stack, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import api, { errorMessage } from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { Async, EmptyState } from '../../components/ui'
import { AnnouncementCard, AnnouncementDialog } from '../common/AnnouncementParts'

// "Announcements" tab of the course editor: post, edit, pin and delete this course's announcements.
export default function CourseAnnouncements({ course }) {
  const { notify, confirm } = useFeedback()
  const { data, loading, error, reload, setData } = useApi(
    () => api.get(`/courses/${course.id}/announcements`).then((r) => r.data), [course.id],
  )
  const [dialog, setDialog] = useState(null) // { item } while open
  const students = course.enrollmentCount ?? 0

  const saved = (item, created) => {
    setDialog(null)
    notify.success(created ? `Announcement posted${students ? ` · ${students} student${students === 1 ? '' : 's'} notified` : ''}` : 'Announcement saved')
    reload() // the server decides the order (pinned first, then newest)
  }

  const remove = async (item) => {
    if (!(await confirm({ title: 'Delete announcement?', message: `"${item.title}" will be removed for every student.`, confirmText: 'Delete', danger: true }))) return
    try {
      await api.delete(`/announcements/${item.id}`)
      setData((list) => list.filter((a) => a.id !== item.id))
      notify.success('Announcement deleted')
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  const newButton = <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setDialog({ item: null })}>New announcement</Button>

  return (
    <Async loading={loading && !data} error={error} onRetry={reload}>
      {data && (data.length === 0 ? (
        <Card>
          <EmptyState icon={CampaignOutlinedIcon} title="No announcements yet"
            description={`Share news, changes or reminders. ${students ? `All ${students} enrolled student${students === 1 ? '' : 's'} get a notification.` : 'Students who enroll will see them on the course page.'}`}
            action={newButton} />
        </Card>
      ) : (
        <Stack gap={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={1.5}>
            <Typography color="text.secondary" fontSize="0.9rem">
              {data.length} announcement{data.length === 1 ? '' : 's'} · pinned ones stay on top
            </Typography>
            {newButton}
          </Stack>
          {data.map((a) => (
            <AnnouncementCard key={a.id} item={a} showCourse={false} onEdit={(item) => setDialog({ item })} onDelete={remove} />
          ))}
        </Stack>
      ))}
      <AnnouncementDialog open={!!dialog} item={dialog?.item} courseId={course.id} onClose={() => setDialog(null)} onSaved={saved} />
    </Async>
  )
}
