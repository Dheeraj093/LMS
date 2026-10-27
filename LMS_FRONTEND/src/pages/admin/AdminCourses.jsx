import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Card, InputAdornment, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import api, { fileUrl } from '../../api/client'
import useApi from '../../components/ui/useApi'
import { Async, EmptyState, PageHeader, StatusChip } from '../../components/ui'
import { number } from '../../utils/format'
import { fonts } from '../../theme'

// Every course on the platform, drafts included. Opening one goes to the course editor (admins may edit any course).
export default function AdminCourses() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useApi(() => api.get('/admin/courses').then((r) => r.data), [])
  const [q, setQ] = useState('')
  const [state, setState] = useState('all')

  const rows = useMemo(() => (data || []).filter((c) => {
    const text = `${c.title} ${c.teacherName || ''} ${c.categoryName || ''}`.toLowerCase()
    if (q && !text.includes(q.toLowerCase())) return false
    if (state === 'published' && !c.published) return false
    if (state === 'draft' && c.published) return false
    return true
  }), [data, q, state])

  return (
    <>
      <PageHeader title="All courses" subtitle="Every course on the platform, including drafts." />
      <Card>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} p={2}>
          <TextField placeholder="Search by title, teacher or category" value={q} onChange={(e) => setQ(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }} />
          <TextField select value={state} onChange={(e) => setState(e.target.value)} sx={{ width: { sm: 180 } }}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="published">Published</MenuItem>
            <MenuItem value="draft">Drafts</MenuItem>
          </TextField>
        </Stack>
        <Async loading={loading} error={error} onRetry={reload}>
          {rows.length === 0 ? (
            <EmptyState icon={MenuBookOutlinedIcon} title="No courses found" description={data?.length ? 'Try another search.' : 'Teachers have not created any course yet.'} />
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow><TableCell>Course</TableCell><TableCell>Teacher</TableCell><TableCell>Category</TableCell><TableCell>Students</TableCell><TableCell>Rating</TableCell><TableCell>Status</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.id} hover onClick={() => navigate(`/teacher/courses/${c.id}`)} sx={{ cursor: 'pointer' }}>
                      <TableCell>
                        <Stack direction="row" gap={1.5} alignItems="center">
                          <Box sx={{ width: 56, height: 36, borderRadius: '8px', flexShrink: 0, bgcolor: 'action.hover', backgroundImage: c.thumbnail ? `url(${fileUrl(c.thumbnail)})` : 'linear-gradient(135deg,#5B4CF0,#A855F7)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                          <Typography fontWeight={700} fontSize="0.9rem">{c.title}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{c.teacherName}</TableCell>
                      <TableCell>{c.categoryName}</TableCell>
                      <TableCell sx={{ fontFamily: fonts.mono }}>{number(c.enrollmentCount)}</TableCell>
                      <TableCell>
                        {c.reviewCount ? (
                          <Stack direction="row" alignItems="center" gap={0.5}><StarRoundedIcon sx={{ fontSize: 16, color: '#F59E0B' }} /><Typography fontSize="0.85rem" fontFamily={fonts.mono}>{c.avgRating?.toFixed(1)} ({c.reviewCount})</Typography></Stack>
                        ) : <Typography color="text.disabled" fontSize="0.85rem">No reviews</Typography>}
                      </TableCell>
                      <TableCell><StatusChip status={c.published ? 'PUBLISHED' : 'DRAFT'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Async>
      </Card>
    </>
  )
}
