// Small pieces shared by the student pages.
import { useState } from 'react'
import { Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import { fileUrl } from '../../api/client'
import { parseDate } from '../../utils/format'
import { chartColors, fonts } from '../../theme'

// Two letters from a title, skipping words that start with a symbol, e.g. "Microservices (draft)" -> "M".
function titleInitials(title = '') {
  const words = title.split(/\s+/).filter((w) => /^[\p{L}\p{N}]/u.test(w))
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'
}

// Pick a stable color pair from a text, so each course keeps the same fallback look.
function pickColors(text = '') {
  const n = text.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const a = chartColors[n % chartColors.length]
  const b = chartColors[(n + 2) % chartColors.length]
  return [a, b]
}

// Course cover image. If there is no thumbnail (or it fails to load) show a gradient with initials.
export function CourseThumb({ course, height = 150, radius = 0 }) {
  const [broken, setBroken] = useState(false)
  const src = !broken && fileUrl(course?.thumbnail)
  const [a, b] = pickColors(course?.title)
  return (
    <Box sx={{ height, borderRadius: radius, overflow: 'hidden', position: 'relative', flexShrink: 0, background: `linear-gradient(135deg, ${a}, ${b})` }}>
      {src ? (
        <Box component="img" src={src} alt="" onError={() => setBroken(true)} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: height > 120 ? '2.6rem' : '1.4rem', color: 'rgba(255,255,255,.92)', letterSpacing: '-0.02em' }}>
            {titleInitials(course?.title)}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

// Read-only star row. value 0..5 (may be a decimal).
export function Stars({ value = 0, size = 16 }) {
  return (
    <Stack direction="row" sx={{ color: '#F5A524' }} aria-label={`${Number(value || 0).toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (i <= Math.round(value || 0)
        ? <StarRoundedIcon key={i} sx={{ fontSize: size }} />
        : <StarOutlineRoundedIcon key={i} sx={{ fontSize: size, opacity: 0.6 }} />))}
    </Stack>
  )
}

// Card used in the catalog (and anywhere a course is listed).
export function CourseCard({ course, onClick, footer, enrolled }) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={onClick} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <Box position="relative">
          <CourseThumb course={course} height={140} />
          {enrolled && <Chip size="small" label="Enrolled" sx={{ position: 'absolute', top: 10, left: 10, bgcolor: 'rgba(255,255,255,.92)', color: '#14142B' }} />}
        </Box>
        <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {course.categoryName && (
            <Typography variant="overline" color="primary" lineHeight={1.4}>{course.categoryName}</Typography>
          )}
          <Typography variant="h5" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{course.title}</Typography>
          <Typography fontSize="0.85rem" color="text.secondary" noWrap>{course.teacherName || 'Teacher'}</Typography>
          <Box flex={1} />
          <Stack direction="row" alignItems="center" gap={1.5} mt={0.5} flexWrap="wrap">
            <Stack direction="row" alignItems="center" gap={0.5}>
              <StarRoundedIcon sx={{ fontSize: 17, color: '#F5A524' }} />
              <Typography fontSize="0.85rem" fontWeight={700}>{course.avgRating ? Number(course.avgRating).toFixed(1) : 'New'}</Typography>
              {course.reviewCount ? <Typography fontSize="0.8rem" color="text.disabled">({course.reviewCount})</Typography> : null}
            </Stack>
            <Stack direction="row" alignItems="center" gap={0.5} color="text.secondary">
              <PeopleAltOutlinedIcon sx={{ fontSize: 16 }} />
              <Typography fontSize="0.82rem">{course.enrollmentCount ?? 0} enrolled</Typography>
            </Stack>
          </Stack>
          {footer}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

// "due in 3 days" / "overdue by 2 days" / "due today". Returns { text, tone }.
export function dueInfo(due) {
  const d = parseDate(due)
  if (!d) return { text: 'No due date', tone: 'muted' }
  const ms = d.getTime() - Date.now()
  const day = 24 * 3600 * 1000
  if (ms < 0) {
    const days = Math.floor(-ms / day)
    return { text: days === 0 ? 'Overdue today' : `Overdue by ${days} day${days === 1 ? '' : 's'}`, tone: 'bad' }
  }
  if (ms < day) {
    const h = Math.max(1, Math.round(ms / 3600000))
    return { text: `Due in ${h} hour${h === 1 ? '' : 's'}`, tone: 'warn' }
  }
  const days = Math.ceil(ms / day)
  return { text: `Due in ${days} day${days === 1 ? '' : 's'}`, tone: days <= 3 ? 'warn' : 'muted' }
}

// Minutes as "1h 20m" or "45m".
export function minutesText(min) {
  const m = Math.round(min || 0)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`
}

// Find a YouTube video id in a link, or null.
export function youtubeId(url = '') {
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

// Icon for a lesson type.
export const lessonIcon = (type) => (type === 'VIDEO' ? PlayCircleOutlineRoundedIcon : type === 'PDF' ? PictureAsPdfOutlinedIcon : ArticleOutlinedIcon)
