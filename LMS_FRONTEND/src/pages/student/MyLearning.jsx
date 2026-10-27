import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Card, CardActionArea, CardContent, Chip, Grid, LinearProgress, Stack, Tab, Tabs, Typography } from '@mui/material'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import api from '../../api/client'
import useApi from '../../components/ui/useApi'
import { PageHeader, EmptyState, Async, LinkButton } from '../../components/ui'
import { formatDate } from '../../utils/format'
import { CourseThumb } from './studentShared'

// Load my enrollments, then the curriculum of each course (it has the course info and my progress).
async function loadMyCourses() {
  const enrollments = (await api.get('/enrollments/my')).data
  return Promise.all(enrollments.map(async (e) => {
    try {
      const c = (await api.get(`/courses/${e.courseId}/curriculum`)).data
      return { ...e, curriculum: c }
    } catch {
      // The course may have been unpublished; still list it with what we know.
      return { ...e, curriculum: null }
    }
  }))
}

export default function MyLearning() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('progress')
  const { data, loading, error, reload } = useApi(loadMyCourses, [])

  const all = data || []
  const completed = all.filter((x) => x.curriculum?.completedAt)
  const inProgress = all.filter((x) => !x.curriculum?.completedAt)
  const list = tab === 'progress' ? inProgress : completed

  return (
    <>
      <PageHeader
        title="My learning"
        subtitle="Courses you are enrolled in"
        actions={<LinkButton to="/catalog" variant="outlined">Browse catalog</LinkButton>}
      />
      <Async loading={loading} error={error} onRetry={reload}>
        {all.length === 0 ? (
          <Card>
            <EmptyState
              icon={MenuBookOutlinedIcon}
              title="No courses yet"
              description="Enroll in a course from the catalog to start learning."
              action={<Button variant="contained" onClick={() => navigate('/catalog')}>Browse the catalog</Button>}
            />
          </Card>
        ) : (
          <>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Tab value="progress" label={`In progress (${inProgress.length})`} />
              <Tab value="done" label={`Completed (${completed.length})`} />
            </Tabs>
            {list.length === 0 ? (
              <Card>
                <EmptyState
                  title={tab === 'progress' ? 'Nothing in progress' : 'No completed courses yet'}
                  description={tab === 'progress' ? 'You have finished all your courses. Find something new in the catalog.' : 'Finish every lesson of a course to complete it and earn a certificate.'}
                />
              </Card>
            ) : (
              <Grid container spacing={2.5}>
                {list.map((x) => <Grid item xs={12} sm={6} md={4} key={x.enrollmentId}><LearningCard item={x} /></Grid>)}
              </Grid>
            )}
          </>
        )}
      </Async>
    </>
  )
}

function LearningCard({ item }) {
  const navigate = useNavigate()
  const c = item.curriculum
  const course = c?.course || { id: item.courseId, title: item.courseTitle }
  const p = c?.progress
  const percent = Math.round((p?.completionPercentage || 0) * 100)
  const done = !!c?.completedAt
  const go = () => navigate(`/learn/${item.courseId}`)

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={go} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <Box position="relative">
          <CourseThumb course={course} height={140} />
          {done && (
            <Chip icon={<CheckCircleRoundedIcon />} label="Completed" size="small" color="success"
              sx={{ position: 'absolute', top: 12, left: 12, color: '#fff', '& .MuiChip-icon': { color: '#fff' } }} />
          )}
        </Box>
        <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {course.categoryName && <Typography variant="overline" color="primary" lineHeight={1.4}>{course.categoryName}</Typography>}
          <Typography variant="h5" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{course.title}</Typography>
          <Typography fontSize="0.85rem" color="text.secondary">{course.teacherName || ''}</Typography>
          <Box flex={1} />
          <Stack direction="row" justifyContent="space-between" mt={1.5} mb={0.75}>
            <Typography fontSize="0.8rem" color="text.secondary">
              {p ? `${p.completedLessons} of ${p.totalLessons} lessons` : 'Not available'}
            </Typography>
            <Typography fontSize="0.8rem" fontWeight={700}>{percent}%</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={percent} color={done ? 'success' : 'primary'} />
          <Typography fontSize="0.75rem" color="text.disabled" mt={1}>
            {done ? `Completed ${formatDate(c.completedAt)}` : `Enrolled ${formatDate(item.enrolledDate + 'T00:00:00')}`}
          </Typography>
        </CardContent>
      </CardActionArea>
      <Box px={2} pb={2}>
        <Button fullWidth variant={done ? 'outlined' : 'contained'} startIcon={done ? null : <PlayArrowRoundedIcon />} onClick={go} disabled={!c}>
          {done ? 'Review course' : percent > 0 ? 'Continue' : 'Start learning'}
        </Button>
      </Box>
    </Card>
  )
}
