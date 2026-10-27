import { Box, Card, Grid, LinearProgress, Rating, Stack, Typography, Divider } from '@mui/material'
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined'
import api from '../../api/client'
import useApi from '../../components/ui/useApi'
import { Async, EmptyState, UserAvatar } from '../../components/ui'
import { formatDate } from '../../utils/format'
import { fonts } from '../../theme'

// Student reviews of one course with the average and a 5..1 star breakdown.
export default function CourseReviews({ course }) {
  const { data, loading, error, reload } = useApi(() => api.get(`/courses/${course.id}/reviews`).then((r) => r.data), [course.id])
  const reviews = (data || []).slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  const avg = reviews.length ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0

  return (
    <Async loading={loading} error={error} onRetry={reload}>
      {reviews.length === 0 ? (
        <Card>
          <EmptyState icon={RateReviewOutlinedIcon} title="No reviews yet"
            description="Enrolled students can rate the course and leave a comment. Their reviews will appear here." />
        </Card>
      ) : (
        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 2.5 }}>
              <Typography variant="overline" color="text.disabled">Average rating</Typography>
              <Stack direction="row" alignItems="baseline" gap={1} mt={0.5}>
                <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, fontSize: '2.6rem', lineHeight: 1 }}>{avg.toFixed(1)}</Typography>
                <Typography color="text.disabled">/ 5</Typography>
              </Stack>
              <Rating value={avg} precision={0.1} readOnly sx={{ mt: 1 }} />
              <Typography fontSize="0.85rem" color="text.secondary" mb={2}>{reviews.length} review{reviews.length === 1 ? '' : 's'}</Typography>
              <Stack gap={1}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = reviews.filter((r) => r.rating === star).length
                  return (
                    <Stack key={star} direction="row" alignItems="center" gap={1.25}>
                      <Typography fontSize="0.8rem" fontWeight={600} width={14}>{star}</Typography>
                      <LinearProgress variant="determinate" value={(n / reviews.length) * 100} color="warning" sx={{ flex: 1 }} />
                      <Typography fontSize="0.8rem" color="text.secondary" width={22} textAlign="right">{n}</Typography>
                    </Stack>
                  )
                })}
              </Stack>
            </Card>
          </Grid>
          <Grid item xs={12} md={8}>
            <Card>
              {reviews.map((r, i) => (
                <Box key={r.id}>
                  {i > 0 && <Divider />}
                  <Stack direction="row" gap={1.5} p={{ xs: 2, sm: 2.5 }}>
                    <UserAvatar name={r.studentName} size={38} />
                    <Box flex={1} minWidth={0}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={0.5}>
                        <Typography fontWeight={700} fontSize="0.92rem">{r.studentName || 'Student'}</Typography>
                        <Typography fontSize="0.78rem" color="text.disabled">{formatDate(r.createdAt)}</Typography>
                      </Stack>
                      <Rating value={r.rating || 0} readOnly size="small" sx={{ my: 0.5 }} />
                      <Typography color="text.secondary" fontSize="0.9rem" whiteSpace="pre-wrap">{r.comment || 'No comment.'}</Typography>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Card>
          </Grid>
        </Grid>
      )}
    </Async>
  )
}
