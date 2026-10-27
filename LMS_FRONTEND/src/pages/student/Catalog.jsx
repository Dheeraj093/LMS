import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Box, Card, Chip, Grid, InputAdornment, Pagination, Stack, TextField, Typography } from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined'
import api from '../../api/client'
import useApi from '../../components/ui/useApi'
import { PageHeader, EmptyState, Async } from '../../components/ui'
import { CourseCard } from './studentShared'

const PAGE_SIZE = 12

// Course catalog. Search, category and page live in the URL so links and the top bar search work.
export default function Catalog() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const search = params.get('search') || ''
  const categoryId = params.get('category') || ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [text, setText] = useState(search)

  // Keep the box in sync when the top bar search changes the URL.
  useEffect(() => { setText(search) }, [search])

  // Wait a moment after typing before searching.
  useEffect(() => {
    if (text.trim() === search) return undefined
    const id = setTimeout(() => update({ search: text.trim(), page: '' }), 350)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  const update = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next, { replace: true })
  }

  const mine = useApi(() => api.get('/enrollments/my').then((r) => new Set(r.data.map((e) => e.courseId))).catch(() => new Set()), [])
  const categories = useApi(() => api.get('/category').then((r) => r.data), [])
  const { data, loading, error, reload } = useApi(
    () => api.get('/courses/catalog', {
      params: { search: search || undefined, categoryId: categoryId || undefined, page: page - 1, size: PAGE_SIZE },
    }).then((r) => r.data),
    [search, categoryId, page],
  )

  const courses = data?.content || []

  return (
    <>
      <PageHeader
        title="Course catalog"
        subtitle={data ? `${data.totalElements} course${data.totalElements === 1 ? '' : 's'} to explore` : 'Find your next course'}
      />

      <Card sx={{ p: { xs: 2, sm: 2.5 }, mb: 3 }}>
        <TextField
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search by course title or description"
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
          inputProps={{ 'aria-label': 'Search courses' }}
        />
        {!!categories.data?.length && (
          <Stack direction="row" gap={1} mt={2} flexWrap="wrap">
            <Chip label="All" clickable color={!categoryId ? 'primary' : 'default'} variant={!categoryId ? 'filled' : 'outlined'}
              onClick={() => update({ category: '', page: '' })} />
            {categories.data.map((c) => {
              const on = String(c.id) === categoryId
              return (
                <Chip key={c.id} label={c.name} clickable color={on ? 'primary' : 'default'} variant={on ? 'filled' : 'outlined'}
                  onClick={() => update({ category: on ? '' : String(c.id), page: '' })} />
              )
            })}
          </Stack>
        )}
      </Card>

      <Async loading={loading} error={error} onRetry={reload}>
        {courses.length === 0 ? (
          <Card>
            <EmptyState
              icon={ExploreOutlinedIcon}
              title="No courses found"
              description={search || categoryId ? 'Try another search word or category.' : 'No courses have been published yet. Check back soon.'}
            />
          </Card>
        ) : (
          <>
            <Grid container spacing={2.5}>
              {courses.map((c) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={c.id}>
                  <CourseCard course={c} enrolled={mine.data?.has(c.id)} onClick={() => navigate(`/catalog/${c.id}`)} />
                </Grid>
              ))}
            </Grid>
            {data.totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={4}>
                <Pagination count={data.totalPages} page={page} color="primary" shape="rounded"
                  onChange={(_, p) => { update({ page: p > 1 ? String(p) : '' }); window.scrollTo({ top: 0 }) }} />
              </Box>
            )}
            {search && (
              <Typography textAlign="center" color="text.disabled" fontSize="0.85rem" mt={2}>
                Showing results for "{search}"
              </Typography>
            )}
          </>
        )}
      </Async>
    </>
  )
}
