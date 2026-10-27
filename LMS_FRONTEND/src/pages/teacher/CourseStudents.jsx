import { useMemo, useState } from 'react'
import { Box, Card, LinearProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import api from '../../api/client'
import useApi from '../../components/ui/useApi'
import DownloadButton from '../../components/ui/DownloadButton'
import { Async, EmptyState, StatusChip, UserAvatar } from '../../components/ui'
import { formatDate, timeAgo } from '../../utils/format'
import { fonts } from '../../theme'
import { SearchField } from './TeacherShared'

// Students enrolled in one course, with their progress (GET /enrollments/course/{id}/students).
export default function CourseStudents({ courseId }) {
  const { data, loading, error, reload } = useApi(() => api.get(`/enrollments/course/${courseId}/students`).then((r) => r.data), [courseId])
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...(data || [])]
      .filter((s) => !q || `${s.name} ${s.email}`.toLowerCase().includes(q))
      .sort((a, b) => String(b.enrolledDate).localeCompare(String(a.enrolledDate)))
  }, [data, search])
  const all = data || []
  const avg = all.length ? all.reduce((sum, s) => sum + (s.progress || 0), 0) / all.length : 0
  const done = all.filter((s) => s.completedAt).length

  return (
    <Async loading={loading} error={error} onRetry={reload}>
      <Card>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} p={{ xs: 2, sm: 2.5 }} pb={2}>
          <Box>
            <Typography variant="h4">Enrolled students</Typography>
            <Typography fontSize="0.82rem" color="text.secondary">
              {all.length} student{all.length === 1 ? '' : 's'} · average progress {Math.round(avg)}% · {done} completed
            </Typography>
          </Box>
          {all.length > 0 && (
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <SearchField value={search} onChange={setSearch} placeholder="Search students" />
              <DownloadButton formats={[{ format: 'xlsx', label: 'Download (Excel)', path: `/enrollments/course/${courseId}/export`, fileName: 'students.xlsx' }]} />
            </Stack>
          )}
        </Stack>
        {all.length === 0 ? (
          <EmptyState icon={PeopleAltOutlinedIcon} title="No students yet"
            description="When students enroll from the catalog they will show up here. Make sure the course is published." />
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell sx={{ minWidth: 160 }}>Progress</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Enrolled on</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Last active</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.studentId} hover>
                    <TableCell>
                      <Stack direction="row" gap={1.5} alignItems="center" py={0.75} minWidth={0} maxWidth={{ xs: 190, sm: 'none' }}>
                        <UserAvatar name={s.name} src={s.avatarUrl} size={34} />
                        <Box minWidth={0}>
                          <Typography fontWeight={600} fontSize="0.9rem" noWrap>{s.name}</Typography>
                          <Typography fontSize="0.8rem" color="text.secondary" noWrap>{s.email}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <LinearProgress variant="determinate" value={s.progress || 0} color={s.completedAt ? 'success' : 'primary'} sx={{ flex: 1, minWidth: 60 }} />
                        <Typography fontFamily={fonts.mono} fontSize="0.8rem" width={44} textAlign="right">{Math.round(s.progress || 0)}%</Typography>
                      </Stack>
                      <Stack direction="row" gap={0.75} alignItems="center" mt={0.5}>
                        <Typography fontSize="0.75rem" color="text.secondary">{s.completedLessons} / {s.totalLessons} lessons</Typography>
                        {s.completedAt && <StatusChip status="GRADED" label="Completed" />}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography fontSize="0.88rem" whiteSpace="nowrap">{formatDate(s.enrolledDate)}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography fontSize="0.88rem" whiteSpace="nowrap" color="text.secondary">{s.lastActiveAt ? timeAgo(s.lastActiveAt) : '-'}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={4}><Typography color="text.disabled" fontSize="0.9rem">No matching students.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Async>
  )
}
