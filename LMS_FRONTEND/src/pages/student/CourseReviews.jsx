import { useState } from 'react'
import { Box, Button, Divider, LinearProgress, Rating, Stack, TextField, Typography } from '@mui/material'
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { Async, EmptyState, UserAvatar } from '../../components/ui'
import { timeAgo } from '../../utils/format'
import { fonts } from '../../theme'
import { Stars } from './studentShared'

// Reviews of one course: summary, list, and (when canReview) a form to add or update my review.
export default function CourseReviews({ courseId, canReview, onChanged }) {
  const { user } = useAuth()
  const { notify } = useFeedback()
  const { data, loading, error, reload } = useApi(() => api.get(`/courses/${courseId}/reviews`).then((r) => r.data), [courseId])
  const reviews = data || []
  const mine = reviews.find((r) => r.studentId === user?.id)

  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0
  const counts = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length }))

  return (
    <Async loading={loading} error={error} onRetry={reload}>
      <Stack gap={3}>
        {reviews.length > 0 && (
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={3} alignItems={{ sm: 'center' }}>
            <Box textAlign={{ sm: 'center' }} minWidth={130}>
              <Typography sx={{ fontFamily: fonts.display, fontSize: '2.6rem', fontWeight: 600, lineHeight: 1 }}>{avg.toFixed(1)}</Typography>
              <Box display="flex" justifyContent={{ sm: 'center' }} my={0.5}><Stars value={avg} size={18} /></Box>
              <Typography fontSize="0.8rem" color="text.secondary">{reviews.length} review{reviews.length === 1 ? '' : 's'}</Typography>
            </Box>
            <Stack gap={0.75} flex={1} maxWidth={360}>
              {counts.map(({ s, n }) => (
                <Stack key={s} direction="row" alignItems="center" gap={1}>
                  <Typography fontSize="0.8rem" width={14} color="text.secondary">{s}</Typography>
                  <LinearProgress variant="determinate" value={(n * 100) / reviews.length} sx={{ flex: 1, height: 6, '& .MuiLinearProgress-bar': { bgcolor: '#F5A524' } }} />
                  <Typography fontSize="0.8rem" width={20} color="text.disabled" textAlign="right">{n}</Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>
        )}

        {canReview && (
          <ReviewForm
            key={mine?.id || 'new'}
            courseId={courseId}
            mine={mine}
            onSaved={() => { notify.success(mine ? 'Your review was updated' : 'Thanks for your review!'); reload(); onChanged?.() }}
            onError={(e) => notify.error(errorMessage(e))}
          />
        )}

        {reviews.length === 0 ? (
          <EmptyState icon={RateReviewOutlinedIcon} title="No reviews yet"
            description={canReview ? 'Be the first to share what you think of this course.' : 'Students who enroll can rate this course.'} />
        ) : (
          <Stack divider={<Divider flexItem />} gap={2}>
            {reviews.map((r) => (
              <Stack key={r.id} direction="row" gap={1.5}>
                <UserAvatar name={r.studentName} size={36} />
                <Box minWidth={0} flex={1}>
                  <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                    <Typography fontWeight={700} fontSize="0.9rem">{r.studentName}{r.studentId === user?.id ? ' (you)' : ''}</Typography>
                    <Stars value={r.rating} size={15} />
                    <Typography fontSize="0.78rem" color="text.disabled">{timeAgo(r.createdAt)}</Typography>
                  </Stack>
                  {r.comment && <Typography fontSize="0.9rem" color="text.secondary" mt={0.5} sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{r.comment}</Typography>}
                </Box>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </Async>
  )
}

function ReviewForm({ courseId, mine, onSaved, onError }) {
  const [rating, setRating] = useState(mine?.rating || 0)
  const [comment, setComment] = useState(mine?.comment || '')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!rating) return
    setSaving(true)
    try {
      await api.post(`/courses/${courseId}/reviews`, { rating, comment: comment.trim() || null })
      onSaved()
    } catch (err) {
      onError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box component="form" onSubmit={submit} sx={{ p: 2, borderRadius: '12px', border: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
      <Typography fontWeight={700} mb={1}>{mine ? 'Update your review' : 'Rate this course'}</Typography>
      <Rating value={rating} onChange={(_, v) => setRating(v || 0)} size="large" />
      <TextField multiline minRows={2} placeholder="What did you like? What could be better? (optional)" value={comment}
        onChange={(e) => setComment(e.target.value)} sx={{ mt: 1 }} inputProps={{ maxLength: 1000 }} />
      <Stack direction="row" justifyContent="flex-end" mt={1.5}>
        <Button type="submit" variant="contained" disabled={!rating || saving}>{saving ? 'Saving...' : mine ? 'Update review' : 'Post review'}</Button>
      </Stack>
    </Box>
  )
}
