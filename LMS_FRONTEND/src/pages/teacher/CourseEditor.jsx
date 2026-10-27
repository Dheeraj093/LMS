import { useState } from 'react'
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom'
import { Box, Breadcrumbs, Button, Card, Link, Stack, Tab, Tabs, Typography } from '@mui/material'
import PublicRoundedIcon from '@mui/icons-material/PublicRounded'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import api, { errorMessage } from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { Async, PageHeader, StatusChip } from '../../components/ui'
import { useAuth, ROLE } from '../../auth/AuthContext'
import CourseThumb from './CourseThumb'
import CourseDetailsForm from './CourseDetailsForm'
import CourseBuilder from './CourseBuilder'
import CourseStudents from './CourseStudents'
import CourseReviews from './CourseReviews'
import CourseAnnouncements from './CourseAnnouncements'
import { saveCourse } from './CourseApi'

const TABS = [
  { value: 'details', label: 'Details' },
  { value: 'builder', label: 'Builder' },
  { value: 'students', label: 'Students' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'announcements', label: 'Announcements' },
]

export default function CourseEditor() {
  const { id } = useParams()
  const isNew = !id
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'details'
  const { notify } = useFeedback()
  const [publishing, setPublishing] = useState(false)

  const { data: course, loading, error, reload, setData: setCourse } = useApi(
    () => (isNew ? Promise.resolve(null) : api.get(`/courses/${id}`).then((r) => r.data)), [id],
  )

  const coursesCrumb = { label: user?.role === ROLE.ADMIN ? 'All courses' : 'My courses', to: '/teacher/courses' }

  const setTab = (value) => {
    const next = new URLSearchParams(params)
    next.set('tab', value)
    setParams(next, { replace: true })
  }

  const togglePublish = async () => {
    setPublishing(true)
    try {
      const saved = await saveCourse(id, { published: !course.published })
      setCourse(saved)
      notify.success(saved.published ? 'Course published. Students can now find it in the catalog.' : 'Course moved back to draft')
    } catch (e) {
      notify.error(errorMessage(e))
    } finally {
      setPublishing(false)
    }
  }

  if (isNew) {
    return (
      <Box>
        <PageHeader crumbs={[coursesCrumb, { label: 'New course' }]} title="Create a course"
          subtitle="Start with the basics. You will add modules and lessons in the builder next." />
        <CourseDetailsForm />
      </Box>
    )
  }

  return (
    <Async loading={loading && !course} error={error} onRetry={reload}>
      {course && (
        <Box>
          <Breadcrumbs sx={{ mb: 1.5, fontSize: '0.85rem' }}>
            <Link component={RouterLink} to={coursesCrumb.to} underline="hover" color="text.secondary">{coursesCrumb.label}</Link>
            <Typography fontSize="0.85rem" fontWeight={600} noWrap maxWidth={{ xs: 200, sm: 480 }}>{course.title}</Typography>
          </Breadcrumbs>
          <Card sx={{ mb: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ xs: 'flex-start', sm: 'center' }} p={{ xs: 2, sm: 2.5 }} pb={{ xs: 1, sm: 1.5 }}>
              <Stack direction="row" gap={2} alignItems="center" flex={1} minWidth={0}>
                <CourseThumb src={course.thumbnail} width={84} height={58} radius={10} iconSize={24} />
                <Box minWidth={0}>
                  <Typography variant="overline" color="text.disabled" component="div" lineHeight={1.6}>
                    Course builder{course.teacherName && user?.role === ROLE.ADMIN ? ` · ${course.teacherName}` : ''}
                  </Typography>
                  <Typography variant="h3" component="h1" sx={{ wordBreak: 'break-word' }}>{course.title}</Typography>
                </Box>
              </Stack>
              <Stack direction="row" gap={1} alignItems="center" flexShrink={0}>
                <StatusChip status={course.published ? 'PUBLISHED' : 'DRAFT'} />
                <Button
                  variant={course.published ? 'outlined' : 'contained'}
                  onClick={togglePublish}
                  disabled={publishing}
                  startIcon={course.published ? <VisibilityOffOutlinedIcon /> : <PublicRoundedIcon />}
                >
                  {course.published ? 'Unpublish' : 'Publish'}
                </Button>
              </Stack>
            </Stack>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile sx={{ px: { xs: 1, sm: 1.5 } }}>
              {TABS.map((t) => (
                <Tab key={t.value} value={t.value}
                  label={t.value === 'students' ? `Students (${course.enrollmentCount ?? 0})` : t.value === 'reviews' ? `Reviews (${course.reviewCount ?? 0})` : t.label} />
              ))}
            </Tabs>
          </Card>

          {tab === 'details' && <CourseDetailsForm course={course} onSaved={setCourse} />}
          {tab === 'builder' && <CourseBuilder course={course} onCourse={setCourse} />}
          {tab === 'students' && <CourseStudents courseId={course.id} />}
          {tab === 'reviews' && <CourseReviews course={course} />}
          {tab === 'announcements' && <CourseAnnouncements course={course} />}
        </Box>
      )}
    </Async>
  )
}
