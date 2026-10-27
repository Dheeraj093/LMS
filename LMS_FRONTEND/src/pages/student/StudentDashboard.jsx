import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Box, Button, Grid, Stack, Typography } from '@mui/material'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined'
import api from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import useApi from '../../components/ui/useApi'
import {
  PageHeader, StatCard, Panel, ProgressList, RangeToggle, EmptyState, Async, useChartStyle, LinkButton,
} from '../../components/ui'
import { hours, shortDate } from '../../utils/format'
import { fonts } from '../../theme'
import { minutesText } from './studentShared'
import { AnnouncementCard } from '../common/AnnouncementParts'
import { DeadlineRow, dayKey } from '../common/CalendarParts'

const RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '6m', label: '6 months' },
]
const RANGE_TEXT = { '7d': 'the last 7 days', '30d': 'the last 30 days', '6m': 'the last 6 months' }

// Small text shown inside a chart panel when there is nothing to plot.
function ChartEmpty({ text }) {
  return (
    <Box sx={{ height: '100%', minHeight: 200, display: 'grid', placeItems: 'center', textAlign: 'center', px: 2 }}>
      <Typography color="text.disabled" fontSize="0.9rem">{text}</Typography>
    </Box>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [range, setRange] = useState('30d')
  const { data, loading, error, reload } = useApi(
    () => api.get('/dashboard/student', { params: { range } }).then((r) => r.data), [range],
  )

  const firstName = (user?.name || '').split(' ')[0]
  const subtitle = data
    ? `${user?.name} · ${data.coursesEnrolled} course${data.coursesEnrolled === 1 ? '' : 's'} · Data for ${RANGE_TEXT[range]}`
    : `Welcome back${firstName ? ', ' + firstName : ''}`

  return (
    <>
      <PageHeader
        title="My progress"
        subtitle={subtitle}
        actions={<RangeToggle value={range} options={RANGES} onChange={setRange} />}
      />
      <Async loading={loading && !data} error={error} onRetry={reload}>
        {data && (data.coursesEnrolled === 0
          ? <NewStudent onBrowse={() => navigate('/catalog')} name={firstName} />
          : <DashboardBody d={data} range={range} />)}
      </Async>
    </>
  )
}

// A brand-new student: nothing to chart yet, so point them at the catalog.
function NewStudent({ onBrowse, name }) {
  return (
    <Panel>
      <EmptyState
        icon={ExploreOutlinedIcon}
        title={`Welcome to Learnly${name ? ', ' + name : ''}!`}
        description="You are not enrolled in any course yet. Pick a course from the catalog and your progress, quiz scores and study time will show up here."
        action={<Button variant="contained" onClick={onBrowse}>Browse the catalog</Button>}
      />
    </Panel>
  )
}

function DashboardBody({ d, range }) {
  const { axis, grid, tooltip, t } = useChartStyle()
  const inProgress = Math.max(0, d.coursesEnrolled - d.coursesCompleted)

  const quizData = (d.quizScores || []).map((q, i) => ({
    key: i, label: shortDate(q.date), percent: Math.round(q.percent * 10) / 10, title: q.quizTitle,
  }))

  // Short ranges: show each day. 6 months: the backend still sends days, so label them by date.
  const minutes = d.minutesPerDay || []
  const totalMinutes = minutes.reduce((a, m) => a + (m.minutes || 0), 0)
  // For long ranges, 180 thin bars are hard to read, so add the days up per week.
  const weekly = minutes.length > 45
  const buckets = []
  minutes.forEach((m, i) => {
    if (!weekly || i % 7 === 0) buckets.push({ date: m.date, minutes: 0 })
    buckets[buckets.length - 1].minutes += m.minutes || 0
  })
  const useHours = buckets.some((m) => m.minutes >= 90)
  const barData = buckets.map((m) => ({
    label: range === '7d'
      ? new Date(m.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })
      : shortDate(m.date + 'T00:00:00'),
    value: useHours ? Math.round((m.minutes / 60) * 10) / 10 : m.minutes,
  }))

  const a = d.assignments || { onTime: 0, late: 0, pending: 0 }
  const totalAssignments = a.onTime + a.late + a.pending
  const donut = [
    { name: 'Submitted on time', value: a.onTime, color: t.ok },
    { name: 'Submitted late', value: a.late, color: t.warn },
    { name: 'Pending', value: a.pending, color: t.line2 },
  ]

  return (
    <Stack gap={3}>
      <Grid container spacing={{ xs: 1.5, sm: 2.5 }}>
        <Grid item xs={6} md={4} lg>
          <StatCard icon={MenuBookOutlinedIcon} label="Courses enrolled" value={d.coursesEnrolled}
            hint={`${d.coursesCompleted} completed, ${inProgress} in progress`} />
        </Grid>
        <Grid item xs={6} md={4} lg>
          <StatCard icon={TaskAltRoundedIcon} tone="teal" label="Lessons completed" value={d.lessonsCompleted} suffix={`/ ${d.totalLessons}`}
            hint={d.totalLessons ? `${Math.round((d.lessonsCompleted * 100) / d.totalLessons)}% of all your lessons` : 'No lessons yet'} hintTone="ok" />
        </Grid>
        <Grid item xs={6} md={4} lg>
          <StatCard icon={QuizOutlinedIcon} tone="amber" label="Avg quiz score" value={quizData.length || d.avgQuizScore ? `${Math.round(d.avgQuizScore)}%` : '-'}
            hint={quizData.length ? `${quizData.length} attempt${quizData.length === 1 ? '' : 's'} in this period` : 'No quiz attempts in this period'} />
        </Grid>
        <Grid item xs={6} md={6} lg>
          <StatCard icon={ScheduleRoundedIcon} tone="rose" label="Learning time" value={d.learningMinutes < 60 ? `${Math.round(d.learningMinutes)}m` : hours(d.learningMinutes)}
            hint={`${Math.round(d.learningMinutes)} minutes in this period`} />
        </Grid>
        <Grid item xs={12} md={6} lg>
          <StatCard icon={WorkspacePremiumOutlinedIcon} tone="teal" label="Certificates" value={d.certificates}
            hint={d.certificates ? 'View them in Certificates' : 'Finish a course to earn one'} />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <UpcomingDeadlines />
        </Grid>
        <Grid item xs={12} md={6}>
          <LatestAnnouncements />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <Panel title="Quiz scores" subtitle="Your submitted attempts, % of marks">
            {quizData.length ? (
              <Box height={260}>
                <ResponsiveContainer>
                  <LineChart data={quizData} margin={{ top: 16, right: 16, left: -12, bottom: 0 }}>
                    <CartesianGrid {...grid} />
                    <XAxis dataKey="key" {...axis} interval="preserveStartEnd" tickFormatter={(k) => quizData[k]?.label ?? ''} />
                    <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} {...axis} />
                    <Tooltip {...tooltip} cursor={{ stroke: t.line2 }}
                      formatter={(v) => [`${v}%`, 'Score']}
                      labelFormatter={(k, p) => { const x = p?.[0]?.payload; return x ? `${x.title} · ${x.label}` : '' }} />
                    <Line type="linear" isAnimationActive={false} dataKey="percent" stroke={t.accent} strokeWidth={2}
                      dot={{ r: 4, fill: t.accent, stroke: t.surface, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ) : <ChartEmpty text="No quiz attempts in this period. Take a quiz to see your scores here." />}
          </Panel>
        </Grid>
        <Grid item xs={12} md={5}>
          <Panel title="Course progress" subtitle="% of lessons completed"
            action={<LinkButton to="/student/learning" size="small">Open</LinkButton>}>
            <ProgressList
              items={(d.courseProgress || []).map((c) => ({ key: c.courseId, label: c.title, value: c.percent, color: c.percent >= 100 ? 'success' : 'primary' }))}
              empty="No courses yet."
            />
          </Panel>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Panel title={weekly ? 'Study time per week' : useHours ? 'Hours per day' : 'Minutes per day'} subtitle={`Study time · ${minutesText(totalMinutes)} total`}>
            {totalMinutes > 0 ? (
              <Box height={250}>
                <ResponsiveContainer>
                  <BarChart data={barData} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid {...grid} />
                    <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={8} />
                    <YAxis {...axis} allowDecimals={useHours} tickFormatter={(v) => (useHours ? `${v}h` : `${v}m`)} />
                    <Tooltip {...tooltip} formatter={(v) => [useHours ? `${v} h` : `${v} min`, 'Study time']} />
                    <Bar dataKey="value" fill={t.accent} radius={[4, 4, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : <ChartEmpty text="No study time recorded in this period. Time is counted while a lesson is open." />}
          </Panel>
        </Grid>
        <Grid item xs={12} md={6}>
          <Panel title="Assignments" subtitle={`${totalAssignments} assignment${totalAssignments === 1 ? '' : 's'} across your courses`}
            action={<LinkButton to="/student/assignments" size="small">Open</LinkButton>}>
            {totalAssignments ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" gap={3}>
                <Box sx={{ width: 170, height: 170, position: 'relative', flexShrink: 0 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={donut.filter((x) => x.value > 0)} dataKey="value" nameKey="name" innerRadius={58} outerRadius={80}
                        startAngle={90} endAngle={-270} stroke={t.surface} strokeWidth={2} isAnimationActive={false}>
                        {donut.filter((x) => x.value > 0).map((x) => <Cell key={x.name} fill={x.color} />)}
                      </Pie>
                      <Tooltip {...tooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', textAlign: 'center' }}>
                    <Box>
                      <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, fontSize: '1.7rem', lineHeight: 1 }}>{totalAssignments}</Typography>
                      <Typography fontSize="0.75rem" color="text.disabled">assignments</Typography>
                    </Box>
                  </Box>
                </Box>
                <Stack gap={1.5} flex={1} width="100%">
                  {donut.map((x) => (
                    <Stack key={x.name} direction="row" alignItems="center" gap={1.25}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '4px', bgcolor: x.color, flexShrink: 0 }} />
                      <Typography fontSize="0.9rem" flex={1}>{x.name}</Typography>
                      <Typography fontFamily={fonts.mono} fontSize="0.85rem" fontWeight={600}>
                        {x.value} · {Math.round((x.value * 100) / totalAssignments)}%
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            ) : <ChartEmpty text="No assignments yet." />}
          </Panel>
        </Grid>
      </Grid>
    </Stack>
  )
}

// Next deadlines that still need something from the student (next 30 days), from the calendar endpoint.
function UpcomingDeadlines() {
  const navigate = useNavigate()
  const today = new Date()
  const until = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30)
  const { data, loading, error, reload } = useApi(
    () => api.get('/calendar', { params: { from: dayKey(today), to: dayKey(until) } }).then((r) => r.data), [],
  )
  const now = Date.now()
  const upcoming = (data || [])
    .filter((e) => (e.status === 'PENDING' || e.status === 'OPEN') && new Date(e.date).getTime() >= now)
    .slice(0, 5)
  return (
    <Panel title="Upcoming deadlines" subtitle="Assignments and quizzes due in the next 30 days"
      action={<LinkButton to="/calendar" size="small">Calendar</LinkButton>}>
      <Async loading={loading} error={error} onRetry={reload}>
        {upcoming.length === 0
          ? <EmptyState icon={EventAvailableOutlinedIcon} title="You are all caught up" description="Nothing is due in the next 30 days." />
          : upcoming.map((e) => <DeadlineRow key={`${e.type}-${e.id}`} event={e} onClick={() => navigate(e.link)} />)}
      </Async>
    </Panel>
  )
}

// The newest announcements of the student's courses (pinned ones first, as the server orders them).
function LatestAnnouncements() {
  const { data, loading, error, reload } = useApi(() => api.get('/announcements/my').then((r) => r.data), [])
  const latest = (data || []).slice(0, 2)
  return (
    <Panel title="Latest announcements" subtitle={data?.length ? `${data.length} from your courses` : 'News from your teachers'}
      action={<LinkButton to="/announcements" size="small">View all</LinkButton>}>
      <Async loading={loading} error={error} onRetry={reload}>
        {latest.length === 0
          ? <EmptyState icon={CampaignOutlinedIcon} title="No announcements yet" description="When a teacher posts news for one of your courses, it shows up here." />
          : (
            <Stack gap={1.5}>
              {latest.map((a) => (
                <Box key={a.id} component={RouterLink} to={`/announcements?id=${a.id}`} sx={{ textDecoration: 'none', color: 'inherit' }}>
                  <AnnouncementCard item={a} compact />
                </Box>
              ))}
            </Stack>
          )}
      </Async>
    </Panel>
  )
}
