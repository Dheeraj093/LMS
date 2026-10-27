import { useState } from 'react'
import { Box, Grid, Stack, Typography } from '@mui/material'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import api from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useAuth } from '../../auth/AuthContext'
import {
  Async, EmptyState, LinkButton, PageHeader, Panel, ProgressList, RangeToggle, StatCard, useChartStyle,
} from '../../components/ui'
import { number, shortDate } from '../../utils/format'
import { chartColors, fonts } from '../../theme'

const RANGES = [
  { value: '30d', label: '30 days' },
  { value: '12w', label: '12 weeks' },
  { value: '1y', label: '1 year' },
]
const RANGE_TEXT = { '30d': 'the last 30 days', '12w': 'the last 12 weeks', '1y': 'the last year' }

// Small "No data" text centered in a chart area.
function ChartEmpty({ text, height = 260 }) {
  return (
    <Box height={height} display="grid" sx={{ placeItems: 'center' }}>
      <Typography color="text.disabled" fontSize="0.9rem" textAlign="center" px={2}>{text}</Typography>
    </Box>
  )
}

function LegendDot({ color, label }) {
  return (
    <Stack direction="row" alignItems="center" gap={0.75}>
      <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: color }} />
      <Typography fontSize="0.8rem" color="text.secondary" fontWeight={600}>{label}</Typography>
    </Stack>
  )
}

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [range, setRange] = useState('12w')
  const { data, loading, error, reload } = useApi(
    () => api.get('/dashboard/teacher', { params: { range } }).then((r) => r.data), [range],
  )
  const { axis, grid, tooltip, t } = useChartStyle()

  const weeks = (data?.enrollmentsPerWeek || []).map((w) => ({ label: shortDate(w.weekStart), count: w.count }))
  const thisWeek = weeks.length ? weeks[weeks.length - 1].count : 0
  const buckets = data?.scoreBuckets || []
  const attemptsTotal = buckets.reduce((s, b) => s + b.count, 0)
  const submissions = (data?.submissions || []).map((s) => ({ ...s, name: s.title }))
  const hasSubmissionData = submissions.some((s) => s.onTime + s.late + s.missing > 0)
  const lateColor = chartColors[2]
  const missingColor = t.line2

  const subtitle = data
    ? `${user?.name || 'Teacher'} · ${data.totalCourses} course${data.totalCourses === 1 ? '' : 's'} · Data for ${RANGE_TEXT[range]}`
    : `Data for ${RANGE_TEXT[range]}`

  return (
    <Box>
      <PageHeader
        title="Teaching overview"
        subtitle={subtitle}
        actions={<RangeToggle value={range} options={RANGES} onChange={setRange} />}
      />
      <Async loading={loading && !data} error={error} onRetry={reload}>
        {data && data.totalCourses === 0 ? (
          <Panel>
            <EmptyState
              icon={MenuBookOutlinedIcon}
              title="No courses yet"
              description="Create your first course. Enrollments, quiz scores and submissions will show up here once students join."
              action={<LinkButton to="/teacher/courses/new" variant="contained" startIcon={<AddRoundedIcon />}>Create a course</LinkButton>}
            />
          </Panel>
        ) : data && (
          <Box sx={{ opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>
            {/* Stat cards: 5 across on desktop */}
            <Grid container spacing={2} columns={{ xs: 12, md: 10 }} mb={2}>
              <Grid item xs={6} sm={6} md={2}>
                <StatCard icon={PeopleAltOutlinedIcon} label="Total students" value={number(data.totalStudents)}
                  hint={thisWeek > 0 ? `+${thisWeek} enrolled this week` : 'No new enrollments this week'} hintTone={thisWeek > 0 ? 'ok' : undefined} />
              </Grid>
              <Grid item xs={6} sm={6} md={2}>
                <StatCard icon={InsightsOutlinedIcon} tone="teal" label="Avg completion" value={`${data.avgCompletion}%`}
                  hint="Across all enrolled students" />
              </Grid>
              <Grid item xs={6} sm={6} md={2}>
                <StatCard icon={HelpOutlineOutlinedIcon} tone="amber" label="Avg quiz score" value={`${Math.round(data.avgQuizScore)}%`}
                  hint={`From ${number(attemptsTotal)} attempt${attemptsTotal === 1 ? '' : 's'}`} />
              </Grid>
              <Grid item xs={6} sm={6} md={2}>
                <StatCard icon={StarBorderRoundedIcon} tone="rose" label="Avg rating"
                  value={data.avgRating != null ? data.avgRating.toFixed(1) : '-'} suffix={data.avgRating != null ? '/ 5' : undefined}
                  hint={`From ${number(data.reviewCount)} review${data.reviewCount === 1 ? '' : 's'}`} />
              </Grid>
              <Grid item xs={12} sm={12} md={2}>
                <StatCard icon={MenuBookOutlinedIcon} label="Total courses" value={number(data.totalCourses)} hint="Courses you teach" />
              </Grid>
            </Grid>

            <Grid container spacing={2} mb={2}>
              <Grid item xs={12} md={8}>
                <Panel title="New enrollments" subtitle="Students per week, all your courses">
                  {weeks.length === 0 || weeks.every((w) => w.count === 0) ? (
                    <ChartEmpty text="No enrollments in this period yet." />
                  ) : (
                    <Box height={260}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={weeks} margin={{ top: 16, right: 12, left: -18, bottom: 0 }}>
                          <defs>
                            <linearGradient id="enrollFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={t.accent} stopOpacity={0.18} />
                              <stop offset="100%" stopColor={t.accent} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid {...grid} />
                          <XAxis dataKey="label" {...axis} minTickGap={24} />
                          <YAxis {...axis} allowDecimals={false} />
                          <Tooltip {...tooltip} cursor={{ stroke: t.line2 }} formatter={(v) => [v, 'Enrollments']} labelFormatter={(l) => `Week of ${l}`} />
                          <Area type="monotone" dataKey="count" stroke={t.accent} strokeWidth={2} fill="url(#enrollFill)"
                            dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: t.surface }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </Panel>
              </Grid>
              <Grid item xs={12} md={4}>
                <Panel title="Completion by course" subtitle="Average % of lessons finished">
                  <ProgressList
                    items={(data.completionByCourse || []).map((c) => ({ key: c.courseId, label: c.title, value: c.percent }))}
                    empty="No courses yet."
                  />
                </Panel>
              </Grid>
            </Grid>

            <Grid container spacing={2} mb={2}>
              <Grid item xs={12} md={6}>
                <Panel title="Quiz score distribution" subtitle={`${number(attemptsTotal)} attempts, grouped by score %`}>
                  {attemptsTotal === 0 ? (
                    <ChartEmpty text="No quiz attempts yet." />
                  ) : (
                    <Box height={260}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={buckets} margin={{ top: 20, right: 8, left: -18, bottom: 0 }}>
                          <CartesianGrid {...grid} />
                          <XAxis dataKey="range" {...axis} />
                          <YAxis {...axis} allowDecimals={false} />
                          <Tooltip {...tooltip} formatter={(v) => [v, 'Attempts']} labelFormatter={(l) => `Score ${l}%`} />
                          <Bar dataKey="count" fill={t.accent} radius={[4, 4, 0, 0]} maxBarSize={48}>
                            <LabelList dataKey="count" position="top" style={{ fill: t.ink, fontSize: 12, fontFamily: fonts.body }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </Panel>
              </Grid>
              <Grid item xs={12} md={6}>
                <Panel
                  title="Assignment submissions"
                  subtitle="Per assignment"
                  action={hasSubmissionData && (
                    <Stack direction="row" gap={1.5} flexWrap="wrap" justifyContent="flex-end">
                      <LegendDot color={t.accent} label="On time" />
                      <LegendDot color={lateColor} label="Late" />
                      <LegendDot color={missingColor} label="Missing" />
                    </Stack>
                  )}
                >
                  {!hasSubmissionData ? (
                    <ChartEmpty text={submissions.length ? 'No students are expected to submit yet.' : 'No assignments yet.'} />
                  ) : (
                    <Box height={260}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={submissions} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                          <CartesianGrid {...grid} />
                          <XAxis dataKey="name" {...axis} interval={0}
                            tickFormatter={(v) => (v.length > 14 ? v.slice(0, 13) + '…' : v)} />
                          <YAxis {...axis} allowDecimals={false} />
                          <Tooltip {...tooltip} />
                          {/* white stroke = small gap between stacked segments */}
                          <Bar dataKey="onTime" name="On time" stackId="s" fill={t.accent} stroke={t.surface} strokeWidth={2} maxBarSize={48} />
                          <Bar dataKey="late" name="Late" stackId="s" fill={lateColor} stroke={t.surface} strokeWidth={2} maxBarSize={48} />
                          <Bar dataKey="missing" name="Missing" stackId="s" fill={missingColor} stroke={t.surface} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={48} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </Panel>
              </Grid>
            </Grid>

            <Panel title="Hardest questions" subtitle="Lowest % of answers that were correct (top 5)">
              <ProgressList
                color="warning"
                items={(data.hardestQuestions || []).map((q) => ({
                  key: q.questionId,
                  label: q.text,
                  value: q.percentCorrect,
                  right: `${q.percentCorrect}%`,
                }))}
                empty="No answered questions yet."
              />
            </Panel>
          </Box>
        )}
      </Async>
    </Box>
  )
}
