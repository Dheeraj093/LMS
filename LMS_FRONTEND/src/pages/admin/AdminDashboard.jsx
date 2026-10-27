import { useState } from 'react'
import { Alert, Box, Button, Grid, LinearProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import LocalFireDepartmentOutlinedIcon from '@mui/icons-material/LocalFireDepartmentOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import api from '../../api/client'
import useApi from '../../components/ui/useApi'
import { Async, PageHeader, Panel, ProgressList, RangeToggle, StatCard, useChartStyle, EmptyState } from '../../components/ui'
import { chartColors, fonts } from '../../theme'
import { number, shortDate } from '../../utils/format'

const RANGES = [{ value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '6m', label: '6 months' }]
const RANGE_TEXT = { '7d': 'the last 7 days', '30d': 'the last 30 days', '6m': 'the last 6 months' }
const ROLE_ORDER = [['STUDENT', 'Students'], ['TEACHER', 'Teachers'], ['ADMIN', 'Admins']]

export default function AdminDashboard() {
  const [range, setRange] = useState('30d')
  const { data: d, loading, error, reload } = useApi(() => api.get('/dashboard/admin', { params: { range } }).then((r) => r.data), [range])
  const c = useChartStyle()

  const roles = d ? ROLE_ORDER.map(([key, label], i) => ({ key, label, value: d.usersByRole?.[key] || 0, color: chartColors[[0, 2, 1][i]] })) : []
  const maxCategory = d ? Math.max(1, ...d.coursesByCategory.map((x) => x.count)) : 1

  return (
    <>
      <PageHeader
        title="Platform overview"
        subtitle={`All users and courses · Data for ${RANGE_TEXT[range]}`}
        actions={<RangeToggle value={range} options={RANGES} onChange={setRange} />}
      />
      <Async loading={loading && !d} error={error} onRetry={reload}>
        {d && (
          <Stack gap={2.5}>
            {d.pendingTeachers > 0 && (
              <Alert severity="warning" action={<Button component={RouterLink} to="/admin/users?status=PENDING" color="inherit" size="small">Review</Button>}>
                {d.pendingTeachers} teacher account{d.pendingTeachers === 1 ? ' is' : 's are'} waiting for approval.
              </Alert>
            )}
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6} lg={3}><StatCard icon={PeopleAltOutlinedIcon} label="Total users" value={number(d.totalUsers)} hint={`${number(d.usersByRole?.STUDENT || 0)} students`} /></Grid>
              <Grid item xs={12} sm={6} lg={3}><StatCard icon={LocalFireDepartmentOutlinedIcon} tone="teal" label="Active today" value={number(d.activeToday)} hint={d.totalUsers ? `${Math.round((d.activeToday * 100) / d.totalUsers)}% of users` : null} hintTone="ok" /></Grid>
              <Grid item xs={12} sm={6} lg={3}><StatCard icon={MenuBookOutlinedIcon} tone="amber" label="Published courses" value={number(d.publishedCourses)} /></Grid>
              <Grid item xs={12} sm={6} lg={3}><StatCard icon={WorkspacePremiumOutlinedIcon} tone="rose" label="Certificates issued" value={number(d.certificatesIssued)} /></Grid>
            </Grid>
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={8}>
                <Panel title="Daily active users" subtitle={`Users who used the app each day, ${RANGE_TEXT[range]}`}>
                  <Box height={260}>
                    <ResponsiveContainer>
                      <AreaChart data={d.dailyActiveUsers.map((x) => ({ ...x, label: shortDate(x.date) }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="dau" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={chartColors[0]} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={chartColors[0]} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...c.grid} />
                        <XAxis dataKey="label" {...c.axis} minTickGap={24} />
                        <YAxis {...c.axis} allowDecimals={false} />
                        <Tooltip {...c.tooltip} formatter={(v) => [v, 'Active users']} />
                        <Area type="monotone" dataKey="count" stroke={chartColors[0]} strokeWidth={2} fill="url(#dau)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </Panel>
              </Grid>
              <Grid item xs={12} md={4}>
                <Panel title="Users by role" subtitle={`${number(d.totalUsers)} accounts`}>
                  <Box height={180} position="relative">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={roles} dataKey="value" nameKey="label" innerRadius={58} outerRadius={80} paddingAngle={roles.filter((r) => r.value).length > 1 ? 2 : 0} stroke="none">
                          {roles.map((r) => <Cell key={r.key} fill={r.color} />)}
                        </Pie>
                        <Tooltip {...c.tooltip} />
                      </PieChart>
                    </ResponsiveContainer>
                    <Box position="absolute" top="50%" left="50%" sx={{ transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                      <Typography fontFamily={fonts.display} fontWeight={600} fontSize="1.6rem" lineHeight={1}>{number(d.totalUsers)}</Typography>
                      <Typography fontSize="0.75rem" color="text.disabled">users</Typography>
                    </Box>
                  </Box>
                  <Stack gap={1.25} mt={2}>
                    {roles.map((r) => (
                      <Stack key={r.key} direction="row" alignItems="center" gap={1.25}>
                        <Box width={10} height={10} borderRadius="3px" bgcolor={r.color} />
                        <Typography flex={1} fontSize="0.9rem" color="text.secondary">{r.label}</Typography>
                        <Typography fontFamily={fonts.mono} fontSize="0.85rem" fontWeight={600}>
                          {number(r.value)} · {d.totalUsers ? Math.round((r.value * 100) / d.totalUsers) : 0}%
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Panel>
              </Grid>
            </Grid>
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <Panel title="Enrollments per month" subtitle="New enrollments, last 6 months">
                  <Box height={250}>
                    <ResponsiveContainer>
                      <BarChart data={d.enrollmentsPerMonth} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid {...c.grid} />
                        <XAxis dataKey="month" {...c.axis} />
                        <YAxis {...c.axis} allowDecimals={false} />
                        <Tooltip {...c.tooltip} formatter={(v) => [v, 'Enrollments']} />
                        <Bar dataKey="count" fill={chartColors[0]} radius={[6, 6, 0, 0]} maxBarSize={46}>
                          <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: c.t.ink, fontFamily: fonts.mono }} formatter={(v) => (v ? v : '')} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Panel>
              </Grid>
              <Grid item xs={12} md={6}>
                <Panel title="Courses by category" subtitle="Published courses">
                  <ProgressList
                    empty="No published courses yet."
                    items={d.coursesByCategory.map((x) => ({ label: x.category, value: (x.count * 100) / maxCategory, right: x.count }))}
                  />
                </Panel>
              </Grid>
            </Grid>
            <Panel title="Top courses" subtitle="By number of enrollments">
              {d.topCourses.length === 0 ? (
                <EmptyState title="No enrollments yet" description="Top courses show up here once students enroll." />
              ) : (
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 640 }}>
                    <TableHead>
                      <TableRow><TableCell>Course</TableCell><TableCell>Teacher</TableCell><TableCell>Enrollments</TableCell><TableCell width="26%">Completion</TableCell><TableCell>Rating</TableCell></TableRow>
                    </TableHead>
                    <TableBody>
                      {d.topCourses.map((tc) => (
                        <TableRow key={tc.courseId} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{tc.title}</TableCell>
                          <TableCell>{tc.teacher}</TableCell>
                          <TableCell sx={{ fontFamily: fonts.mono }}>{number(tc.enrollments)}</TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" gap={1}>
                              <LinearProgress variant="determinate" value={tc.completion} sx={{ flex: 1, height: 6 }} />
                              <Typography fontFamily={fonts.mono} fontSize="0.8rem">{tc.completion}%</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ fontFamily: fonts.mono }}>{tc.rating != null ? tc.rating.toFixed(1) : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Panel>
          </Stack>
        )}
      </Async>
    </>
  )
}
