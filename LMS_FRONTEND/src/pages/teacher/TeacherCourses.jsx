import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box, Button, Card, CardActionArea, Grid, IconButton, InputAdornment, ListItemIcon, Menu, MenuItem, Stack,
  TextField, Typography, Tooltip,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded'
import api, { errorMessage } from '../../api/client'
import { useAuth, ROLE } from '../../auth/AuthContext'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { Async, EmptyState, PageHeader, RangeToggle, StatCard, StatusChip, LinkButton } from '../../components/ui'
import { number } from '../../utils/format'
import CourseThumb from './CourseThumb'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
]

export default function TeacherCourses() {
  const { user } = useAuth()
  const isAdmin = user?.role === ROLE.ADMIN
  const navigate = useNavigate()
  const { notify, confirm } = useFeedback()
  const [params, setParams] = useSearchParams()
  const search = params.get('search') || ''
  const [filter, setFilter] = useState('all')

  const { data, loading, error, reload, setData } = useApi(() => api.get('/courses').then((r) => r.data), [])
  const courses = data || []

  // Keep the search box and the ?search= in the URL in sync (the top bar search sends people here).
  const setSearch = (value) => {
    const next = new URLSearchParams(params)
    if (value) next.set('search', value)
    else next.delete('search')
    setParams(next, { replace: true })
  }

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return courses
      .filter((c) => filter === 'all' || (filter === 'published' ? c.published : !c.published))
      .filter((c) => !q || [c.title, c.description, c.categoryName, c.teacherName].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => b.id - a.id)
  }, [courses, search, filter])

  const totals = useMemo(() => {
    const rated = courses.filter((c) => c.avgRating != null)
    return {
      published: courses.filter((c) => c.published).length,
      students: courses.reduce((s, c) => s + (c.enrollmentCount || 0), 0),
      rating: rated.length ? (rated.reduce((s, c) => s + c.avgRating, 0) / rated.length).toFixed(1) : '-',
    }
  }, [courses])

  const remove = async (course) => {
    const ok = await confirm({
      title: `Delete "${course.title}"?`,
      message: 'The course is removed for good. Courses with enrolled students cannot be deleted; unpublish them instead.',
      confirmText: 'Delete course',
      danger: true,
    })
    if (!ok) return
    try {
      await api.delete(`/courses/${course.id}`)
      setData((list) => list.filter((c) => c.id !== course.id))
      notify.success('Course deleted')
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  return (
    <Box>
      <PageHeader
        eyebrow={isAdmin ? 'Administration' : 'Teaching'}
        title={isAdmin ? 'All courses' : 'My courses'}
        subtitle={isAdmin ? 'Every course on the platform. Open one to edit its details and curriculum.' : 'Build, publish and manage your courses.'}
        actions={<LinkButton to="/teacher/courses/new" variant="contained" startIcon={<AddRoundedIcon />}>New course</LinkButton>}
      />

      <Async loading={loading} error={error} onRetry={reload}>
        {courses.length === 0 ? (
          <Card>
            <EmptyState
              icon={MenuBookOutlinedIcon}
              title="No courses yet"
              description="Create your first course, then add modules and lessons in the builder."
              action={<LinkButton to="/teacher/courses/new" variant="contained" startIcon={<AddRoundedIcon />}>Create a course</LinkButton>}
            />
          </Card>
        ) : (
          <>
            <Grid container spacing={2} mb={3}>
              <Grid item xs={6} md={3}><StatCard icon={MenuBookOutlinedIcon} label="Courses" value={number(courses.length)} /></Grid>
              <Grid item xs={6} md={3}><StatCard icon={PublicOutlinedIcon} tone="ok" label="Published" value={number(totals.published)} suffix={`/ ${courses.length}`} /></Grid>
              <Grid item xs={6} md={3}><StatCard icon={PeopleAltOutlinedIcon} tone="accent" label="Enrollments" value={number(totals.students)} /></Grid>
              <Grid item xs={6} md={3}><StatCard icon={StarRoundedIcon} tone="warn" label="Avg rating" value={totals.rating} suffix={totals.rating !== '-' ? '/ 5' : undefined} /></Grid>
            </Grid>

            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} mb={2.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
              <TextField
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, category or teacher"
                sx={{ maxWidth: { sm: 360 } }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
                inputProps={{ 'aria-label': 'Search courses' }}
              />
              <Box sx={{ overflowX: 'auto' }}><RangeToggle value={filter} options={FILTERS} onChange={setFilter} /></Box>
            </Stack>

            {shown.length === 0 ? (
              <Card>
                <EmptyState
                  icon={SearchOffRoundedIcon}
                  title="No matching courses"
                  description={search ? `Nothing matches "${search}".` : 'No courses in this filter.'}
                  action={<Button variant="outlined" onClick={() => { setSearch(''); setFilter('all') }}>Clear filters</Button>}
                />
              </Card>
            ) : (
              <Grid container spacing={2.5}>
                {shown.map((c) => (
                  <Grid item xs={12} sm={6} md={4} key={c.id}>
                    <CourseCard course={c} showTeacher={isAdmin} onOpen={() => navigate(`/teacher/courses/${c.id}`)} onDelete={() => remove(c)}
                      onBuilder={() => navigate(`/teacher/courses/${c.id}?tab=builder`)} />
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

function CourseCard({ course, showTeacher, onOpen, onBuilder, onDelete }) {
  const [anchor, setAnchor] = useState(null)
  const modules = course.moduleIds?.length || 0

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <CardActionArea onClick={onOpen} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <Box position="relative">
          <CourseThumb src={course.thumbnail} height={150} />
          <Box position="absolute" top={12} left={12}>
            <StatusChip status={course.published ? 'PUBLISHED' : 'DRAFT'} />
          </Box>
        </Box>
        <Box p={2.25} flex={1} display="flex" flexDirection="column">
          <Typography variant="overline" color="text.disabled" noWrap>{course.categoryName || 'No category'}</Typography>
          <Typography variant="h5" sx={{ mb: 0.5, pr: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {course.title}
          </Typography>
          {showTeacher && <Typography fontSize="0.85rem" color="text.secondary" mb={0.5}>by {course.teacherName || 'Unknown'}</Typography>}
          <Typography fontSize="0.85rem" color="text.secondary"
            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 2 }}>
            {course.description || 'No description yet.'}
          </Typography>
          <Stack direction="row" gap={2} mt="auto" flexWrap="wrap" color="text.secondary">
            <Meta icon={LayersOutlinedIcon} text={`${modules} module${modules === 1 ? '' : 's'}`} />
            <Meta icon={PeopleAltOutlinedIcon} text={`${number(course.enrollmentCount)} enrolled`} />
            <Meta icon={StarRoundedIcon} text={course.avgRating != null ? `${course.avgRating} (${course.reviewCount})` : 'No ratings'} star />
          </Stack>
        </Box>
      </CardActionArea>

      <Tooltip title="More">
        <IconButton size="small" aria-label="Course actions" onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ position: 'absolute', top: 166, right: 8 }}>
          <MoreVertRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { setAnchor(null); onOpen() }}><ListItemIcon><EditOutlinedIcon fontSize="small" /></ListItemIcon>Edit details</MenuItem>
        <MenuItem onClick={() => { setAnchor(null); onBuilder() }}><ListItemIcon><ViewListOutlinedIcon fontSize="small" /></ListItemIcon>Open builder</MenuItem>
        <MenuItem onClick={() => { setAnchor(null); onDelete() }} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteOutlineRoundedIcon fontSize="small" color="error" /></ListItemIcon>Delete
        </MenuItem>
      </Menu>
    </Card>
  )
}

function Meta({ icon: Icon, text, star }) {
  return (
    <Stack direction="row" alignItems="center" gap={0.5}>
      <Icon sx={{ fontSize: 17, color: star ? 'warning.main' : 'text.disabled' }} />
      <Typography fontSize="0.8rem" fontWeight={600}>{text}</Typography>
    </Stack>
  )
}
