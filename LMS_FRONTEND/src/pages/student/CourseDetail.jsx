import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Card, CardContent, Grid, LinearProgress, Stack, Typography,
} from '@mui/material'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import api, { errorMessage } from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { PageHeader, Panel, Async, UserAvatar, EmptyState } from '../../components/ui'
import { formatDate } from '../../utils/format'
import { CourseThumb, minutesText, lessonIcon } from './studentShared'
import CourseReviews from './CourseReviews'
import { AllAnnouncementsLink, AnnouncementCard } from '../common/AnnouncementParts'

export default function CourseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { notify } = useFeedback()
  const [enrolling, setEnrolling] = useState(false)
  const { data, loading, error, reload } = useApi(() => api.get(`/courses/${id}/curriculum`).then((r) => r.data), [id])

  const enroll = async () => {
    setEnrolling(true)
    try {
      await api.post('/enrollments', { courseId: Number(id) })
      notify.success('You are enrolled. Happy learning!')
      navigate(`/learn/${id}`)
    } catch (e) {
      notify.error(errorMessage(e))
      setEnrolling(false)
    }
  }

  return (
    <Async loading={loading && !data} error={error} onRetry={reload}>
      {data && <Detail data={data} onEnroll={enroll} enrolling={enrolling} onReviewed={reload} />}
    </Async>
  )
}

function Detail({ data, onEnroll, enrolling, onReviewed }) {
  const navigate = useNavigate()
  const { course, enrolled, progress, completedAt } = data
  const modules = data.modules || []
  const lessons = modules.flatMap((m) => m.lessons || [])
  const totalMinutes = lessons.reduce((a, l) => a + (l.duration || 0), 0)
  const percent = Math.round((progress?.completionPercentage || 0) * 100)

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Catalog', to: '/catalog' }, { label: course.title }]}
        eyebrow={course.categoryName}
        title={course.title}
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Stack gap={3}>
            <Panel title="About this course">
              <Typography color="text.secondary" sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                {course.description || 'No description yet.'}
              </Typography>
              <Stack direction="row" gap={1.5} alignItems="center" mt={2.5}>
                <UserAvatar name={course.teacherName} size={40} />
                <Box>
                  <Typography fontSize="0.75rem" color="text.disabled">Teacher</Typography>
                  <Typography fontWeight={700}>{course.teacherName}</Typography>
                </Box>
              </Stack>
            </Panel>

            {enrolled && <CourseAnnouncementsPanel courseId={course.id} />}

            <Panel title="Course content" subtitle={`${modules.length} module${modules.length === 1 ? '' : 's'} · ${lessons.length} lesson${lessons.length === 1 ? '' : 's'}${totalMinutes ? ' · ' + minutesText(totalMinutes) : ''}`}>
              {modules.length === 0 ? (
                <EmptyState icon={LibraryBooksOutlinedIcon} title="No lessons yet" description="The teacher has not added lessons to this course yet." />
              ) : modules.map((m, i) => (
                <Accordion key={m.id} defaultExpanded={i === 0} disableGutters elevation={0}
                  sx={{ border: 1, borderColor: 'divider', borderRadius: '12px !important', mb: 1.25, '&::before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                    <Box minWidth={0}>
                      <Typography fontWeight={700}>{m.title}</Typography>
                      <Typography fontSize="0.8rem" color="text.disabled">{(m.lessons || []).length} lessons</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Stack gap={0.5}>
                      {(m.lessons || []).map((l) => {
                        const Icon = lessonIcon(l.contentType)
                        const canOpen = enrolled && !l.locked
                        return (
                          <Stack key={l.id} direction="row" alignItems="center" gap={1.25}
                            onClick={canOpen ? () => navigate(`/learn/${course.id}/${l.id}`) : undefined}
                            sx={{ py: 1, px: 1, borderRadius: '8px', cursor: canOpen ? 'pointer' : 'default', '&:hover': canOpen ? { bgcolor: 'action.hover' } : {} }}>
                            {l.completed ? <CheckCircleRoundedIcon color="success" fontSize="small" /> : <Icon fontSize="small" color="action" />}
                            <Typography fontSize="0.9rem" flex={1} minWidth={0} noWrap>{l.title}</Typography>
                            {l.duration ? <Typography fontSize="0.78rem" color="text.disabled" fontFamily="monospace">{l.duration} min</Typography> : null}
                            {l.locked && <LockOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
                          </Stack>
                        )
                      })}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Panel>

            <Panel title="Reviews">
              <CourseReviews courseId={course.id} canReview={enrolled} onChanged={onReviewed} />
            </Panel>
          </Stack>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ position: { md: 'sticky' }, top: { md: 88 }, overflow: 'hidden' }}>
            <CourseThumb course={course} height={190} />
            <CardContent sx={{ p: 2.5 }}>
              <Stack gap={1.25} mb={2.5}>
                <InfoRow icon={StarRoundedIcon} iconColor="#F5A524"
                  text={course.avgRating ? `${Number(course.avgRating).toFixed(1)} rating · ${course.reviewCount} review${course.reviewCount === 1 ? '' : 's'}` : 'No ratings yet'} />
                <InfoRow icon={PeopleAltOutlinedIcon} text={`${course.enrollmentCount ?? 0} students enrolled`} />
                <InfoRow icon={LibraryBooksOutlinedIcon} text={`${lessons.length} lessons`} />
                {totalMinutes > 0 && <InfoRow icon={ScheduleRoundedIcon} text={`${minutesText(totalMinutes)} of content`} />}
              </Stack>

              {enrolled ? (
                <>
                  <Stack direction="row" justifyContent="space-between" mb={0.75}>
                    <Typography fontSize="0.85rem" color="text.secondary">
                      {completedAt ? `Completed ${formatDate(completedAt)}` : `${progress?.completedLessons || 0} of ${progress?.totalLessons || 0} lessons done`}
                    </Typography>
                    <Typography fontSize="0.85rem" fontWeight={700}>{percent}%</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={percent} color={completedAt ? 'success' : 'primary'} sx={{ mb: 2 }} />
                  <Button fullWidth size="large" variant="contained" onClick={() => navigate(`/learn/${course.id}`)}>
                    {completedAt ? 'Review course' : percent > 0 ? 'Continue learning' : 'Start learning'}
                  </Button>
                </>
              ) : (
                <>
                  <Button fullWidth size="large" variant="contained" onClick={onEnroll} disabled={enrolling}>
                    {enrolling ? 'Enrolling...' : 'Enroll for free'}
                  </Button>
                  <Typography fontSize="0.78rem" color="text.disabled" textAlign="center" mt={1}>
                    Get full access to every lesson, quizzes and a certificate.
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  )
}

function InfoRow({ icon: Icon, text, iconColor }) {
  return (
    <Stack direction="row" alignItems="center" gap={1.25}>
      <Icon sx={{ fontSize: 19, color: iconColor || 'text.secondary' }} />
      <Typography fontSize="0.9rem">{text}</Typography>
    </Stack>
  )
}

// Enrolled students: the course's announcements, the first few with a "show all" toggle.
function CourseAnnouncementsPanel({ courseId }) {
  const { data, loading, error, reload } = useApi(() => api.get(`/courses/${courseId}/announcements`).then((r) => r.data), [courseId])
  const [all, setAll] = useState(false)
  const list = data || []
  const shown = all ? list : list.slice(0, 2)
  return (
    <Panel title="Announcements" subtitle={list.length ? `${list.length} from your teacher` : undefined}
      action={list.length > 0 && <AllAnnouncementsLink courseId={courseId}>Open page</AllAnnouncementsLink>}>
      <Async loading={loading} error={error} onRetry={reload}>
        {list.length === 0 ? (
          <Typography color="text.disabled" fontSize="0.9rem">No announcements yet. News from the teacher will show up here.</Typography>
        ) : (
          <Stack gap={1.5}>
            {shown.map((a) => <AnnouncementCard key={a.id} item={a} showCourse={false} compact={!all} />)}
            {list.length > 2 && (
              <Button onClick={() => setAll(!all)} sx={{ alignSelf: 'flex-start' }}>{all ? 'Show less' : `Show all ${list.length}`}</Button>
            )}
          </Stack>
        )}
      </Async>
    </Panel>
  )
}
