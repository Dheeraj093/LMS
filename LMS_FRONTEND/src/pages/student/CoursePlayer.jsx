import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Box, Breadcrumbs, Button, Card, Collapse, Dialog, DialogContent, Grid, LinearProgress, Link, Stack, Tab, Tabs, Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import RadioButtonCheckedRoundedIcon from '@mui/icons-material/RadioButtonCheckedRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined'
import api, { errorMessage, fileUrl } from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { Async, EmptyState, Loading, PageError } from '../../components/ui'
import { fonts } from '../../theme'
import { lessonIcon, youtubeId } from './studentShared'
import CourseReviews from './CourseReviews'
import LessonQA from './LessonQA'

const STUDY_PING_SECONDS = 60

// Sends study time for the open lesson every minute while the browser tab is visible.
function useStudyTime(lessonId) {
  useEffect(() => {
    if (!lessonId) return undefined
    let visibleSeconds = 0
    // Count seconds only while the tab is visible; send a minute at a time.
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      visibleSeconds += 1
      if (visibleSeconds >= STUDY_PING_SECONDS) {
        visibleSeconds = 0
        api.post(`/progress/lessons/${lessonId}/time`, { seconds: STUDY_PING_SECONDS }).catch(() => {})
      }
    }, 1000)
    return () => clearInterval(id)
  }, [lessonId])
}

export default function CoursePlayer() {
  const { courseId, lessonId } = useParams()
  const { data, loading, error, reload, setData } = useApi(
    () => api.get(`/courses/${courseId}/curriculum`).then((r) => r.data), [courseId],
  )

  if (loading && !data) return <Loading />
  if (error) {
    // 403/404: the course is not available to this student.
    return <Box><PageError error={error} onRetry={reload} /></Box>
  }
  if (!data) return null
  if (!data.enrolled) return <Navigate to={`/catalog/${courseId}`} replace />
  return <Player curriculum={data} setCurriculum={setData} lessonId={lessonId ? Number(lessonId) : null} />
}

function Player({ curriculum, setCurriculum, lessonId }) {
  const navigate = useNavigate()
  const { notify } = useFeedback()
  const course = curriculum.course
  const [celebrate, setCelebrate] = useState(false)
  const [saving, setSaving] = useState(false)
  // The open tab lives in the URL (?tab=qa) so notification links can open the Q&A tab.
  // Going to another lesson drops the query, which brings back Overview.
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = ['reviews', 'qa'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  const setTab = (v) => setSearchParams(v === 'overview' ? {} : { tab: v }, { replace: true })

  // Every lesson in order, with its module, so Previous/Next work across modules.
  const flat = useMemo(() => curriculum.modules.flatMap((m, mi) => (m.lessons || [])
    .filter((l) => !l.locked)
    .map((l, li) => ({ ...l, module: m, moduleIndex: mi, indexInModule: li, moduleSize: m.lessons.length }))), [curriculum])

  // No lesson in the URL: open the first lesson not done yet (or the first one).
  const fallback = flat.find((l) => !l.completed) || flat[0]
  const current = flat.find((l) => l.id === lessonId)
  const index = current ? flat.indexOf(current) : -1
  const prev = index > 0 ? flat[index - 1] : null
  const next = index >= 0 && index < flat.length - 1 ? flat[index + 1] : null

  useStudyTime(current?.id)
  const lessonApi = useApi(() => (current ? api.get(`/lessons/${current.id}`).then((r) => r.data) : Promise.resolve(null)), [current?.id])
  const lesson = lessonApi.data && lessonApi.data.id === current?.id ? lessonApi.data : null

  if (!flat.length) {
    return (
      <Card>
        <EmptyState icon={LibraryBooksOutlinedIcon} title="No lessons yet"
          description="The teacher has not published any lessons in this course yet. Check back soon."
          action={<Button component={RouterLink} to="/student/learning" variant="outlined">Back to My learning</Button>} />
      </Card>
    )
  }
  if (!lessonId || !current) return <Navigate to={`/learn/${course.id}/${fallback.id}`} replace />

  const progress = curriculum.progress || { totalLessons: flat.length, completedLessons: 0 }
  const percent = progress.totalLessons ? (progress.completedLessons * 100) / progress.totalLessons : 0

  const completeAndNext = async () => {
    if (current.completed) {
      if (next) navigate(`/learn/${course.id}/${next.id}`)
      return
    }
    setSaving(true)
    try {
      const res = (await api.post(`/progress/lessons/${current.id}/complete`)).data
      const doneIds = new Set(res.completedLessonIds || [])
      const nowComplete = res.totalLessons > 0 && res.completedLessons >= res.totalLessons
      const wasComplete = !!curriculum.completedAt
      // Update the sidebar right away instead of reloading everything.
      setCurriculum((c) => ({
        ...c,
        progress: res,
        completedAt: c.completedAt || (nowComplete ? new Date().toISOString() : null),
        modules: c.modules.map((m) => ({ ...m, lessons: m.lessons.map((l) => ({ ...l, completed: l.completed || doneIds.has(l.id) || l.id === current.id })) })),
      }))
      if (nowComplete && !wasComplete) setCelebrate(true)
      else if (next) navigate(`/learn/${course.id}/${next.id}`)
      else notify.success('Lesson completed')
    } catch (e) {
      notify.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const primaryLabel = current.completed ? (next ? 'Next lesson' : 'Completed') : next ? 'Complete & next' : 'Complete course'

  return (
    <>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8} minWidth={0}>
          <Breadcrumbs sx={{ mb: 2, fontSize: '0.85rem', '& ol': { flexWrap: 'wrap' } }}>
            <Link component={RouterLink} to="/student/learning" underline="hover" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ArrowBackRoundedIcon sx={{ fontSize: 16 }} />My learning
            </Link>
            <Link component={RouterLink} to={`/catalog/${course.id}`} underline="hover" color="text.secondary">{course.title}</Link>
            <Typography fontSize="0.85rem" fontWeight={600} color="text.primary">{current.title}</Typography>
          </Breadcrumbs>

          <Async loading={lessonApi.loading || (!lesson && !lessonApi.error)} error={lessonApi.error} onRetry={lessonApi.reload}>
            {lesson && <LessonBody lesson={lesson} />}
          </Async>

          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-end' }} gap={2} mt={3}>
            <Box minWidth={0}>
              <Typography variant="overline" color="text.disabled">
                Module {current.moduleIndex + 1} · Lesson {current.indexInModule + 1} of {current.moduleSize}
              </Typography>
              <Typography variant="h2" component="h1" sx={{ wordBreak: 'break-word' }}>{current.title}</Typography>
            </Box>
            <Stack direction="row" gap={1.25} flexShrink={0}>
              <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} disabled={!prev}
                onClick={() => navigate(`/learn/${course.id}/${prev.id}`)} sx={{ flex: { xs: 1, sm: 'none' } }}>
                Previous
              </Button>
              <Button variant="contained" onClick={completeAndNext} disabled={saving || (current.completed && !next)}
                startIcon={current.completed ? null : <CheckRoundedIcon />} endIcon={current.completed && next ? <ArrowForwardRoundedIcon /> : null}
                sx={{ flex: { xs: 1, sm: 'none' } }}>
                {saving ? 'Saving...' : primaryLabel}
              </Button>
            </Stack>
          </Stack>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 3, mb: 2.5, borderBottom: 1, borderColor: 'divider' }}>
            <Tab value="overview" label="Overview" />
            <Tab value="qa" label="Q&A" />
            <Tab value="reviews" label={`Reviews${course.reviewCount ? ` (${course.reviewCount})` : ''}`} />
          </Tabs>
          {tab === 'overview' && <Overview course={course} curriculum={curriculum} lesson={lesson} />}
          {tab === 'qa' && <LessonQA courseId={course.id} lessonId={current.id} />}
          {tab === 'reviews' && <CourseReviews courseId={course.id} canReview />}
        </Grid>

        <Grid item xs={12} lg={4}>
          <ContentList course={course} curriculum={curriculum} current={current} percent={percent} progress={progress} />
        </Grid>
      </Grid>

      <Dialog open={celebrate} onClose={() => setCelebrate(false)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <Box sx={{ width: 72, height: 72, mx: 'auto', mb: 2, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'warning.light', color: 'warning.main' }}>
            <EmojiEventsRoundedIcon sx={{ fontSize: 40 }} />
          </Box>
          <Typography variant="h3" mb={1}>Course completed!</Typography>
          <Typography color="text.secondary" mb={3}>
            Well done. You finished every lesson of <b>{course.title}</b>. Your certificate is ready.
          </Typography>
          <Stack gap={1.25}>
            <Button variant="contained" size="large" onClick={() => navigate('/student/certificates')}>View my certificate</Button>
            <Button variant="outlined" onClick={() => { setCelebrate(false); navigate('/student/learning') }}>Back to My learning</Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  )
}

// The lesson itself: video, PDF or text.
function LessonBody({ lesson }) {
  const type = lesson.contentType || 'TEXT'
  const frame = { borderRadius: '14px', overflow: 'hidden', bgcolor: '#0D0E1C', position: 'relative' }

  if (type === 'VIDEO' && lesson.videoUrl) {
    const yt = youtubeId(lesson.videoUrl)
    return (
      <Box sx={{ ...frame, aspectRatio: '16 / 9' }}>
        {yt ? (
          <Box component="iframe" src={`https://www.youtube-nocookie.com/embed/${yt}`} title={lesson.title} allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sx={{ border: 0, width: '100%', height: '100%', display: 'block' }} />
        ) : (
          <Box component="video" controls src={fileUrl(lesson.videoUrl)} sx={{ width: '100%', height: '100%', display: 'block', bgcolor: '#000' }} />
        )}
      </Box>
    )
  }

  if (type === 'PDF' && lesson.pdfUrl) {
    const url = fileUrl(lesson.pdfUrl)
    return (
      <Card>
        <Stack direction="row" justifyContent="space-between" alignItems="center" px={2} py={1.25} borderBottom={1} borderColor="divider" gap={1}>
          <Typography fontWeight={600} fontSize="0.9rem" noWrap>PDF document</Typography>
          <Button size="small" endIcon={<OpenInNewRoundedIcon />} href={url} target="_blank" rel="noopener">Open in new tab</Button>
        </Stack>
        <Box component="iframe" src={url} title={lesson.title} sx={{ border: 0, width: '100%', height: { xs: '60vh', md: '72vh' }, display: 'block' }} />
      </Card>
    )
  }

  // TEXT lesson (or a video/PDF lesson without a file): show the written content.
  return (
    <Card sx={{ p: { xs: 2.5, sm: 4 }, minHeight: { md: 260 } }}>
      <Stack direction="row" alignItems="center" gap={1} mb={2} color="text.disabled">
        <ArticleOutlinedIcon sx={{ fontSize: 18 }} />
        <Typography fontSize="0.8rem" fontWeight={700} letterSpacing="0.06em" textTransform="uppercase">
          Reading{lesson.duration ? ` · ${lesson.duration} min` : ''}
        </Typography>
      </Stack>
      {type !== 'TEXT' && (
        <Typography color="text.disabled" fontSize="0.85rem" mb={2}>The {type === 'VIDEO' ? 'video' : 'PDF'} for this lesson is not available yet.</Typography>
      )}
      <Typography sx={{ whiteSpace: 'pre-line', fontSize: '1.02rem', lineHeight: 1.75, wordBreak: 'break-word' }}>
        {lesson.content || 'This lesson has no written content.'}
      </Typography>
    </Card>
  )
}

// Overview tab: notes of a video/PDF lesson (text lessons already show them above), then the course info.
function Overview({ course, curriculum, lesson }) {
  const notes = lesson && lesson.contentType !== 'TEXT' && lesson.content
  return (
    <Stack gap={2}>
      {notes && <Typography sx={{ whiteSpace: 'pre-line', lineHeight: 1.7, wordBreak: 'break-word' }}>{lesson.content}</Typography>}
      {notes && <Typography variant="h5" mt={1}>About this course</Typography>}
      <Typography color="text.secondary" sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{course.description || 'No course description.'}</Typography>
      <Typography fontSize="0.85rem" color="text.disabled">
        Teacher: {course.teacherName} · {curriculum.modules.length} modules · {curriculum.progress?.totalLessons ?? 0} lessons
      </Typography>
    </Stack>
  )
}

// Right-hand list of modules and lessons with progress.
function ContentList({ course, curriculum, current, percent, progress }) {
  const navigate = useNavigate()
  const t = useTheme().palette.lms
  const [open, setOpen] = useState(() => new Set([current.module.id]))
  useEffect(() => { setOpen((s) => new Set(s).add(current.module.id)) }, [current.module.id])
  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <Card sx={{ position: { lg: 'sticky' }, top: { lg: 88 }, maxHeight: { lg: 'calc(100vh - 110px)' }, display: 'flex', flexDirection: 'column' }}>
      <Box p={2.5} borderBottom={1} borderColor="divider">
        <Typography variant="overline" color="text.disabled">Course content</Typography>
        <Typography variant="h4" mb={1.5}>{course.title}</Typography>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <LinearProgress variant="determinate" value={percent} sx={{ flex: 1 }} color={curriculum.completedAt ? 'success' : 'primary'} />
          <Typography fontFamily={fonts.mono} fontSize="0.82rem" fontWeight={600}>{progress.completedLessons}/{progress.totalLessons}</Typography>
        </Stack>
      </Box>
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {curriculum.modules.map((m) => {
          const lessons = m.lessons || []
          const done = lessons.filter((l) => l.completed).length
          const all = lessons.length > 0 && done === lessons.length
          const isOpen = open.has(m.id)
          return (
            <Box key={m.id} borderBottom={1} borderColor="divider">
              <Stack direction="row" alignItems="center" gap={1.25} px={2.5} py={1.75} onClick={() => toggle(m.id)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                {all ? <CheckCircleRoundedIcon sx={{ color: t.ok, fontSize: 22 }} />
                  : <Box sx={{ width: 20, height: 20, mx: '1px', borderRadius: '50%', border: `2.5px solid ${t.line2}`, borderTopColor: done ? t.accent : t.line2, borderRightColor: done ? t.accent : t.line2 }} />}
                <Typography fontWeight={700} fontSize="0.92rem" flex={1} minWidth={0}>{m.title}</Typography>
                <Typography fontFamily={fonts.mono} fontSize="0.78rem" color="text.disabled">{done}/{lessons.length}</Typography>
                <ExpandMoreRoundedIcon sx={{ fontSize: 18, color: 'text.disabled', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </Stack>
              <Collapse in={isOpen}>
                <Box pb={1}>
                  {lessons.map((l) => {
                    const active = l.id === current.id
                    const Icon = lessonIcon(l.contentType)
                    return (
                      <Stack key={l.id} direction="row" alignItems="center" gap={1.25}
                        onClick={() => !l.locked && navigate(`/learn/${course.id}/${l.id}`)}
                        sx={{
                          pl: 3, pr: 2.5, py: 1.1, cursor: l.locked ? 'default' : 'pointer',
                          bgcolor: active ? t.accentSoft : 'transparent',
                          boxShadow: active ? `inset 3px 0 0 ${t.accent}` : 'none',
                          '&:hover': { bgcolor: active ? t.accentSoft : 'action.hover' },
                        }}>
                        {l.completed ? <CheckCircleRoundedIcon sx={{ color: t.ok, fontSize: 20 }} />
                          : active ? <RadioButtonCheckedRoundedIcon sx={{ color: t.accent, fontSize: 20 }} />
                            : <RadioButtonUncheckedRoundedIcon sx={{ color: t.line2, fontSize: 20 }} />}
                        <Typography fontSize="0.88rem" flex={1} minWidth={0} noWrap fontWeight={active ? 700 : 500} color={active ? 'text.primary' : 'text.secondary'}>
                          {l.title}
                        </Typography>
                        {l.duration ? <Typography fontFamily={fonts.mono} fontSize="0.75rem" color="text.disabled">{l.duration}m</Typography>
                          : <Icon sx={{ fontSize: 16, color: 'text.disabled' }} />}
                      </Stack>
                    )
                  })}
                </Box>
              </Collapse>
            </Box>
          )
        })}
      </Box>
    </Card>
  )
}
