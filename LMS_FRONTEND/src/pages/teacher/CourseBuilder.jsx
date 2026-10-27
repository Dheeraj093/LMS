import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert, Box, Button, Card, Chip, Drawer, Grid, IconButton, ListItemIcon, Menu, MenuItem, Stack, Tooltip, Typography, useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded'
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import PublicRoundedIcon from '@mui/icons-material/PublicRounded'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import SyncRoundedIcon from '@mui/icons-material/SyncRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined'
import TouchAppOutlinedIcon from '@mui/icons-material/TouchAppOutlined'
import api, { errorMessage } from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { Async, EmptyState, StatusChip } from '../../components/ui'
import { hours } from '../../utils/format'
import { structureRequest } from './CourseApi'
import { LessonIcon, ModuleDialog, AddLessonDialog, SharedLessonDialog } from './CourseBuilderDialogs'
import LessonSettings, { usageCourses } from './LessonSettings'
import { useAuth, ROLE } from '../../auth/AuthContext'

// Curriculum response -> the builder's own list of modules with lessons.
const fromCurriculum = (cur) => (cur?.modules || []).map((m) => ({
  id: m.id, title: m.title, description: m.description || '', published: m.published !== false,
  lessons: (m.lessons || []).map((l) => ({ id: l.id, title: l.title, contentType: l.contentType, duration: l.duration, published: l.published })),
}))

// Pure helpers that return a new module list.
function moveLesson(modules, lessonId, toModuleId, toIndex) {
  let lesson = null
  let fromModuleId = null
  let fromIndex = -1
  modules.forEach((m) => m.lessons.forEach((l, i) => { if (l.id === lessonId) { lesson = l; fromModuleId = m.id; fromIndex = i } }))
  if (!lesson) return modules
  // Removing the lesson first shifts later positions in the same module by one.
  const index = fromModuleId === toModuleId && fromIndex < toIndex ? toIndex - 1 : toIndex
  if (fromModuleId === toModuleId && index === fromIndex) return modules
  const without = modules.map((m) => (m.id === fromModuleId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m))
  return without.map((m) => {
    if (m.id !== toModuleId) return m
    const lessons = [...m.lessons]
    lessons.splice(Math.max(0, Math.min(index, lessons.length)), 0, lesson)
    return { ...m, lessons }
  })
}

function moveModule(modules, moduleId, toIndex) {
  const from = modules.findIndex((m) => m.id === moduleId)
  if (from < 0) return modules
  const index = from < toIndex ? toIndex - 1 : toIndex
  if (index === from) return modules
  const next = modules.filter((m) => m.id !== moduleId)
  next.splice(Math.max(0, Math.min(index, next.length)), 0, modules[from])
  return next
}

export default function CourseBuilder({ course, onCourse }) {
  const theme = useTheme()
  const t = theme.palette.lms
  const wide = useMediaQuery(theme.breakpoints.up('md'))
  const { notify, confirm } = useFeedback()
  const { user } = useAuth()
  // The backend only links modules/lessons owned by the course teacher. When an admin builds someone else's course,
  // new modules and lessons are created for that teacher with ?ownerId=.
  const adminOnOthers = user?.role === ROLE.ADMIN && course.teacherId !== user.id
  const ownerQuery = adminOnOthers ? `?ownerId=${course.teacherId}` : ''
  const owner = useMemo(() => (adminOnOthers ? { id: course.teacherId, name: course.teacherName || '' } : null), [adminOnOthers, course.teacherId, course.teacherName])

  const cur = useApi(() => api.get(`/courses/${course.id}/curriculum`).then((r) => r.data), [course.id])
  const [modules, setModules] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const [status, setStatus] = useState('saved') // saved | saving | error
  const [moduleDialog, setModuleDialog] = useState(null) // { module } to edit, {} to add
  const [lessonDialogFor, setLessonDialogFor] = useState(null) // module id
  const drag = useRef(null) // what is being dragged: { type: 'module' | 'lesson', id }
  const [over, setOver] = useState(null) // drop indicator: { type, id, pos }
  const latest = useRef(0)
  // How many courses use each lesson (from GET /lessons/library), for the "Shared" chips. Best effort: no chips if it fails.
  const [courseCounts, setCourseCounts] = useState({})
  // Shared-lesson question: { lesson, moduleId, count, others } while the dialog is open.
  const [sharedAsk, setSharedAsk] = useState(null)
  const [copying, setCopying] = useState(false)
  // Shared lessons the teacher chose to "Edit everywhere" in this visit: lessonId -> number of courses (for the banner).
  const [editAll, setEditAll] = useState({})

  useEffect(() => { if (cur.data) setModules(fromCurriculum(cur.data)) }, [cur.data])

  const loadCounts = () => api.get('/lessons/library')
    .then((r) => setCourseCounts(Object.fromEntries(r.data.map((l) => [l.id, l.courseCount || 0]))))
    .catch(() => {})
  useEffect(() => { loadCounts() }, [course.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    const lessons = modules.flatMap((m) => m.lessons)
    return { lessons: lessons.length, minutes: lessons.reduce((s, l) => s + (l.duration || 0), 0) }
  }, [modules])

  const moduleOf = (lessonId) => modules.find((m) => m.lessons.some((l) => l.id === lessonId))

  // Shows the new order at once, then saves it with PUT /courses/{id}/structure.
  // Only the answer to the latest request is applied, so quick moves cannot overwrite each other.
  const persist = async (next, { quiet = true } = {}) => {
    const before = modules
    setModules(next)
    setStatus('saving')
    const req = ++latest.current
    try {
      const res = (await api.put(`/courses/${course.id}/structure`, structureRequest(next))).data
      if (req === latest.current) {
        setModules(fromCurriculum(res))
        setStatus('saved')
        if (res.course) onCourse?.(res.course)
      }
      if (!quiet) notify.success('Curriculum saved')
      return true
    } catch (e) {
      if (req === latest.current) {
        setModules(before)
        setStatus('error')
      }
      notify.error(errorMessage(e))
      return false
    }
  }

  // ---------- drag and drop (HTML5) ----------
  const startDrag = (type, id) => (e) => {
    drag.current = { type, id }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `${type}:${id}`) // Firefox needs some data to start a drag
    e.stopPropagation()
  }
  const endDrag = () => { drag.current = null; setOver(null) }
  const half = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    return e.clientY < r.top + r.height / 2 ? 'before' : 'after'
  }
  const showOver = (next) => setOver((o) => (o && next && o.type === next.type && o.id === next.id && o.pos === next.pos ? o : next))

  // Over a lesson row: lessons drop before/after it.
  const lessonDragOver = (lessonId) => (e) => {
    if (drag.current?.type !== 'lesson') return
    e.preventDefault()
    e.stopPropagation()
    showOver({ type: 'lesson', id: lessonId, pos: half(e) })
  }
  const lessonDrop = (moduleId, index) => (e) => {
    const d = drag.current
    if (d?.type !== 'lesson') return
    e.preventDefault()
    e.stopPropagation()
    const to = index + (half(e) === 'after' ? 1 : 0)
    endDrag()
    const next = moveLesson(modules, d.id, moduleId, to)
    if (next !== modules) persist(next)
  }
  // Over a module header: modules drop before/after it, lessons go to the end of that module.
  const moduleDragOver = (moduleId) => (e) => {
    const d = drag.current
    if (!d) return
    e.preventDefault()
    showOver(d.type === 'module' ? { type: 'module', id: moduleId, pos: half(e) } : { type: 'into', id: moduleId })
  }
  const moduleDrop = (moduleId, index) => (e) => {
    const d = drag.current
    if (!d) return
    e.preventDefault()
    const pos = half(e)
    endDrag()
    let next = modules
    if (d.type === 'module') next = moveModule(modules, d.id, index + (pos === 'after' ? 1 : 0))
    else next = moveLesson(modules, d.id, moduleId, modules[index].lessons.length)
    if (next !== modules) persist(next)
  }
  // The empty area at the bottom of a module (the "Add lesson" row) takes lessons too.
  const tailDragOver = (moduleId) => (e) => {
    if (drag.current?.type !== 'lesson') return
    e.preventDefault()
    showOver({ type: 'into', id: moduleId })
  }
  const tailDrop = (moduleId) => (e) => {
    const d = drag.current
    if (d?.type !== 'lesson') return
    e.preventDefault()
    endDrag()
    const m = modules.find((x) => x.id === moduleId)
    const next = moveLesson(modules, d.id, moduleId, m.lessons.length)
    if (next !== modules) persist(next)
  }

  // ---------- buttons (touch friendly) ----------
  // Up from the first lesson moves it to the end of the previous module; down from the last to the start of the next.
  const nudgeLesson = (lessonId, dir) => {
    const mi = modules.findIndex((m) => m.lessons.some((l) => l.id === lessonId))
    const li = modules[mi].lessons.findIndex((l) => l.id === lessonId)
    const count = modules[mi].lessons.length
    let next = modules
    if (dir < 0 && li > 0) next = moveLesson(modules, lessonId, modules[mi].id, li - 1)
    else if (dir > 0 && li < count - 1) next = moveLesson(modules, lessonId, modules[mi].id, li + 2)
    else if (dir < 0 && mi > 0) next = moveLesson(modules, lessonId, modules[mi - 1].id, modules[mi - 1].lessons.length)
    else if (dir > 0 && mi < modules.length - 1) next = moveLesson(modules, lessonId, modules[mi + 1].id, 0)
    if (next !== modules) persist(next)
  }
  const nudgeModule = (moduleId, dir) => {
    const i = modules.findIndex((m) => m.id === moduleId)
    const next = moveModule(modules, moduleId, dir < 0 ? i - 1 : i + 2)
    if (next !== modules) persist(next)
  }

  // ---------- module actions ----------
  const saveModule = async ({ title, description, published }) => {
    const editing = moduleDialog?.module
    try {
      if (editing) {
        const lessonsIds = modules.find((m) => m.id === editing.id)?.lessons.map((l) => l.id) || []
        // ModuleRequest.lessonsIds replaces the module's lessons, so the current ones are sent back.
        const res = (await api.put(`/modules/${editing.id}`, { title, description, published, lessonsIds })).data
        setModules((list) => list.map((m) => (m.id === res.id ? { ...m, title: res.title, description: res.description || '', published: res.published } : m)))
        notify.success('Module saved')
      } else {
        const res = (await api.post(`/modules${ownerQuery}`, { title, description, published, lessonsIds: [] })).data
        const ok = await persist([...modules, { id: res.id, title: res.title, description: res.description || '', published: res.published, lessons: [] }])
        if (ok) notify.success('Module added')
      }
      setModuleDialog(null)
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  const togglePublishModule = async (m) => {
    try {
      const res = (await api.put(`/modules/${m.id}`, {
        title: m.title, description: m.description || '', published: !m.published, lessonsIds: m.lessons.map((l) => l.id),
      })).data
      setModules((list) => list.map((x) => (x.id === res.id ? { ...x, published: res.published } : x)))
      notify.success(res.published ? 'Module published' : 'Module hidden from students')
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  const deleteModule = async (m) => {
    const ok = await confirm({
      title: `Delete module "${m.title}"?`,
      message: m.lessons.length
        ? `The module is removed from this course. Its ${m.lessons.length} lesson(s) are kept in your lesson library and can be added again with "Add lesson".`
        : 'The empty module is removed from this course.',
      confirmText: 'Delete module',
      danger: true,
    })
    if (!ok) return
    try {
      await api.delete(`/modules/${m.id}`)
      setModules((list) => list.filter((x) => x.id !== m.id))
      if (m.lessons.some((l) => l.id === selectedId)) setSelectedId(null)
      notify.success('Module deleted')
      loadCounts()
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  // ---------- lesson actions ----------
  // Opens a lesson for editing. A lesson that other courses use too asks first: edit everywhere or copy it.
  // `hint` ({ lesson, moduleId }) is passed right after adding a lesson, before `modules` holds it.
  const openLesson = async (lessonId, hint = {}) => {
    if (lessonId === selectedId) return
    if (editAll[lessonId]) { setSelectedId(lessonId); return }
    const lesson = hint.lesson || modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId)
    const moduleId = hint.moduleId || moduleOf(lessonId)?.id
    let usedIn = []
    try {
      usedIn = (await api.get(`/lessons/${lessonId}/usage`)).data
    } catch {
      // Without the usage list the lesson still opens; the warning is only a safety net.
      setSelectedId(lessonId)
      return
    }
    const courses = usageCourses(usedIn)
    setCourseCounts((c) => ({ ...c, [lessonId]: courses.length }))
    if (courses.length <= 1) { setSelectedId(lessonId); return }
    setSharedAsk({ lesson, moduleId, count: courses.length, others: courses.filter((c) => c.id !== course.id) })
  }

  const editEverywhere = () => {
    const { lesson, count } = sharedAsk
    setEditAll((e) => ({ ...e, [lesson.id]: count }))
    setSharedAsk(null)
    setSelectedId(lesson.id)
  }

  // POST /lessons/{id}/copy with the module: the copy takes the original's place in that module only.
  const copyForThisCourse = async () => {
    const { lesson, moduleId } = sharedAsk
    setCopying(true)
    try {
      const copy = (await api.post(`/lessons/${lesson.id}/copy`, { moduleId })).data
      await cur.reload()
      loadCounts()
      setSharedAsk(null)
      setSelectedId(copy.id)
      notify.success(`"${copy.title}" now belongs to this course only`)
    } catch (e) {
      notify.error(errorMessage(e))
    } finally {
      setCopying(false)
    }
  }

  const addLessons = async (moduleId, lessons) => {
    const next = modules.map((m) => (m.id === moduleId ? { ...m, lessons: [...m.lessons, ...lessons] } : m))
    const ok = await persist(next)
    if (ok) loadCounts()
    if (ok && lessons.length === 1) openLesson(lessons[0].id, { lesson: lessons[0], moduleId })
    return ok
  }

  const lessonSaved = (lesson) => {
    setModules((list) => list.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) => (l.id === lesson.id
        ? { ...l, title: lesson.title, contentType: lesson.contentType, duration: lesson.duration, published: lesson.published } : l)),
    })))
  }

  const lessonDeleted = (lessonId) => {
    setModules((list) => list.map((m) => ({ ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) })))
    setSelectedId(null)
  }

  const removeFromModule = async (lessonId) => {
    const ok = await persist(modules.map((m) => ({ ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) })))
    if (ok) {
      setSelectedId(null)
      loadCounts()
      notify.success('Lesson removed from the course (still in your library)')
    }
  }

  const statusChip = {
    saved: { icon: <CheckCircleOutlineRoundedIcon />, label: 'All changes saved', color: 'success' },
    saving: { icon: <SyncRoundedIcon />, label: 'Saving...', color: 'default' },
    error: { icon: <ErrorOutlineRoundedIcon />, label: 'Not saved', color: 'error' },
  }[status]

  const settings = selectedId && (
    <LessonSettings
      key={selectedId}
      lessonId={selectedId}
      moduleTitle={moduleOf(selectedId)?.title}
      notice={editAll[selectedId] > 1 ? `Changes here update all ${editAll[selectedId]} courses that use this lesson.` : null}
      onSaved={lessonSaved}
      onDeleted={lessonDeleted}
      onRemove={() => removeFromModule(selectedId)}
      onClose={() => setSelectedId(null)}
    />
  )

  return (
    <Async loading={cur.loading && !cur.data} error={cur.error} onRetry={cur.reload}>
      <Grid container spacing={3} alignItems="flex-start">
        <Grid item xs={12} md={8}>
          <Card sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} mb={2} flexWrap="wrap" px={{ xs: 0.5, sm: 0 }}>
              <Box>
                <Typography variant="h4">Curriculum</Typography>
                <Typography fontSize="0.82rem" color="text.secondary">
                  {modules.length} module{modules.length === 1 ? '' : 's'} · {totals.lessons} lesson{totals.lessons === 1 ? '' : 's'} · {hours(totals.minutes)} total
                </Typography>
              </Box>
              <Chip size="small" variant="outlined" icon={statusChip.icon} label={statusChip.label} color={statusChip.color} data-testid="save-status" />
            </Stack>

            {adminOnOthers && (
              <Alert severity="info" sx={{ mb: 2 }}>
                You are editing {course.teacherName || 'a teacher'}'s course as an admin. New modules and lessons are created in
                their library.
              </Alert>
            )}
            {modules.length === 0 ? (
              <EmptyState icon={LayersOutlinedIcon} title="No modules yet"
                description="Modules are the sections of your course. Add one, then add lessons inside it." />
            ) : (
              <Stack gap={1.5}>
                {modules.map((m, mi) => (
                  <Box key={m.id} data-testid="builder-module" data-module-id={m.id}>
                    <ModuleHeader
                      module={m}
                      index={mi}
                      count={modules.length}
                      collapsed={!!collapsed[m.id]}
                      indicator={over?.id === m.id ? (over.type === 'module' ? over.pos : over.type === 'into' ? 'into' : null) : null}
                      onToggle={() => setCollapsed((c) => ({ ...c, [m.id]: !c[m.id] }))}
                      onDragStart={startDrag('module', m.id)}
                      onDragEnd={endDrag}
                      onDragOver={moduleDragOver(m.id)}
                      onDrop={moduleDrop(m.id, mi)}
                      onMove={(dir) => nudgeModule(m.id, dir)}
                      onEdit={() => setModuleDialog({ module: m })}
                      onPublish={() => togglePublishModule(m)}
                      onDelete={() => deleteModule(m)}
                    />
                    {!collapsed[m.id] && (
                      <Stack gap={1} pl={{ xs: 1, sm: 3.5 }} pt={1}>
                        {m.lessons.map((l, li) => (
                          <LessonRow
                            key={l.id}
                            lesson={l}
                            shared={courseCounts[l.id] > 1 ? courseCounts[l.id] : 0}
                            selected={l.id === selectedId}
                            first={mi === 0 && li === 0}
                            last={mi === modules.length - 1 && li === m.lessons.length - 1}
                            indicator={over?.type === 'lesson' && over.id === l.id ? over.pos : null}
                            onClick={() => openLesson(l.id)}
                            onDragStart={startDrag('lesson', l.id)}
                            onDragEnd={endDrag}
                            onDragOver={lessonDragOver(l.id)}
                            onDrop={lessonDrop(m.id, li)}
                            onMove={(dir) => nudgeLesson(l.id, dir)}
                          />
                        ))}
                        <Box
                          onDragOver={tailDragOver(m.id)}
                          onDrop={tailDrop(m.id)}
                          onDragLeave={() => setOver(null)}
                          sx={{
                            borderRadius: '12px', border: `1.5px dashed ${over?.type === 'into' && over.id === m.id ? t.accent : t.line2}`,
                            bgcolor: over?.type === 'into' && over.id === m.id ? t.accentSoft : 'transparent',
                          }}
                        >
                          <Button fullWidth startIcon={<AddRoundedIcon />} onClick={() => setLessonDialogFor(m.id)}
                            sx={{ justifyContent: 'flex-start', color: 'text.secondary', py: 1.25, px: 2 }}>
                            {m.lessons.length ? 'Add lesson' : 'Add the first lesson (or drop one here)'}
                          </Button>
                        </Box>
                      </Stack>
                    )}
                  </Box>
                ))}
              </Stack>
            )}

            <Button fullWidth startIcon={<AddRoundedIcon />} onClick={() => setModuleDialog({})}
              sx={{ mt: 1.5, justifyContent: 'flex-start', color: 'text.secondary', py: 1.5, px: 2, border: `1.5px dashed ${t.line2}`, borderRadius: '12px' }}>
              Add module
            </Button>
          </Card>
        </Grid>

        <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 88 }}>
          {wide && (settings || (
            <Card sx={{ p: 2.5 }}>
              <Typography variant="overline" color="text.disabled">Lesson settings</Typography>
              <EmptyState icon={TouchAppOutlinedIcon} title="Select a lesson"
                description="Pick a lesson on the left to edit its title, type, video, PDF or text. Drag rows to reorder them." />
            </Card>
          ))}
        </Grid>
      </Grid>

      {/* Phones and tablets: the lesson settings slide up from the bottom. */}
      {!wide && (
        <Drawer anchor="bottom" open={!!selectedId} onClose={() => setSelectedId(null)}
          PaperProps={{ sx: { maxHeight: '92vh', borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}>
          {settings}
        </Drawer>
      )}

      <ModuleDialog
        open={!!moduleDialog}
        module={moduleDialog?.module}
        onClose={() => setModuleDialog(null)}
        onSave={saveModule}
      />
      <AddLessonDialog
        open={lessonDialogFor != null}
        moduleTitle={modules.find((m) => m.id === lessonDialogFor)?.title}
        usedIds={modules.flatMap((m) => m.lessons.map((l) => l.id))}
        owner={owner}
        onClose={() => setLessonDialogFor(null)}
        onAdd={(lessons) => addLessons(lessonDialogFor, lessons)}
      />
      <SharedLessonDialog
        open={!!sharedAsk}
        lesson={sharedAsk?.lesson}
        count={sharedAsk?.count}
        others={sharedAsk?.others || []}
        busy={copying}
        onEditAll={editEverywhere}
        onCopy={copyForThisCourse}
        onClose={() => setSharedAsk(null)}
      />
    </Async>
  )
}

const dropLine = (t, pos) => (pos === 'before' ? `0 -3px 0 0 ${t.accent}` : pos === 'after' ? `0 3px 0 0 ${t.accent}` : 'none')

function ModuleHeader({ module: m, index, count, collapsed, indicator, onToggle, onDragStart, onDragEnd, onDragOver, onDrop, onMove, onEdit, onPublish, onDelete }) {
  const t = useTheme().palette.lms
  const [anchor, setAnchor] = useState(null)
  const close = (fn) => () => { setAnchor(null); fn() }

  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={{ xs: 0.5, sm: 1 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-testid="module-header"
      sx={{
        bgcolor: indicator === 'into' ? t.accentSoft : t.sunk, borderRadius: '12px', py: 1, pl: { xs: 0.5, sm: 1 }, pr: 1,
        border: `1px solid ${indicator === 'into' ? t.accent : t.line}`, boxShadow: dropLine(t, indicator), cursor: 'grab',
      }}
    >
      <DragIndicatorRoundedIcon sx={{ color: 'text.disabled', fontSize: 20, flexShrink: 0 }} />
      <IconButton size="small" onClick={onToggle} aria-label={collapsed ? 'Expand module' : 'Collapse module'}>
        <ExpandMoreRoundedIcon fontSize="small" sx={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .15s' }} />
      </IconButton>
      <Typography fontWeight={700} fontSize="0.95rem" flex={1} minWidth={0} sx={{ wordBreak: 'break-word' }} onClick={onToggle}>
        Module {index + 1} · {m.title}
      </Typography>
      {!m.published && <StatusChip status="DRAFT" />}
      <Chip size="small" label={`${m.lessons.length} item${m.lessons.length === 1 ? '' : 's'}`} sx={{ bgcolor: t.line, display: { xs: 'none', sm: 'inline-flex' } }} />
      <IconButton size="small" aria-label="Module actions" onClick={(e) => setAnchor(e.currentTarget)}>
        <MoreHorizRoundedIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <MenuItem onClick={close(onEdit)}><ListItemIcon><EditOutlinedIcon fontSize="small" /></ListItemIcon>Rename / edit</MenuItem>
        <MenuItem onClick={close(onPublish)}>
          <ListItemIcon>{m.published ? <VisibilityOffOutlinedIcon fontSize="small" /> : <PublicRoundedIcon fontSize="small" />}</ListItemIcon>
          {m.published ? 'Unpublish module' : 'Publish module'}
        </MenuItem>
        <MenuItem disabled={index === 0} onClick={close(() => onMove(-1))}><ListItemIcon><KeyboardArrowUpRoundedIcon fontSize="small" /></ListItemIcon>Move up</MenuItem>
        <MenuItem disabled={index === count - 1} onClick={close(() => onMove(1))}><ListItemIcon><KeyboardArrowDownRoundedIcon fontSize="small" /></ListItemIcon>Move down</MenuItem>
        <MenuItem onClick={close(onDelete)} sx={{ color: 'error.main' }}><ListItemIcon><DeleteOutlineRoundedIcon fontSize="small" color="error" /></ListItemIcon>Delete module</MenuItem>
      </Menu>
    </Stack>
  )
}

function LessonRow({ lesson: l, shared, selected, first, last, indicator, onClick, onDragStart, onDragEnd, onDragOver, onDrop, onMove }) {
  const t = useTheme().palette.lms
  const meta = [l.contentType === 'PDF' ? 'PDF' : l.contentType === 'VIDEO' ? 'Video' : 'Text', l.duration ? `${l.duration} min` : null].filter(Boolean).join(' · ')
  const sharedLabel = `Shared · ${shared} courses`

  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={{ xs: 1, sm: 1.5 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      data-testid="lesson-row"
      data-lesson-id={l.id}
      sx={{
        bgcolor: 'background.paper', borderRadius: '12px', py: 1.1, pl: { xs: 0.75, sm: 1.25 }, pr: 0.75, cursor: 'pointer',
        border: `1px solid ${selected ? t.accent : t.line}`,
        boxShadow: indicator ? dropLine(t, indicator) : selected ? `0 0 0 3px ${t.accentSoft}` : 'none',
        transition: 'border-color .15s, box-shadow .15s',
        '&:hover': { borderColor: selected ? t.accent : t.line2 },
        '&:focus-visible': { outline: `2px solid ${t.accent}`, outlineOffset: 2 },
      }}
    >
      <DragIndicatorRoundedIcon sx={{ color: 'text.disabled', fontSize: 18, cursor: 'grab', flexShrink: 0, display: { xs: 'none', sm: 'block' } }} />
      <LessonIcon type={l.contentType} />
      <Box flex={1} minWidth={0}>
        <Typography fontSize="0.93rem" fontWeight={500} sx={{ wordBreak: 'break-word' }}>
          {l.title}
          <Typography component="span" fontSize="0.78rem" color="text.disabled" ml={1} whiteSpace="nowrap">{meta}</Typography>
        </Typography>
        {shared > 0 && (
          <Tooltip title={`Used in ${shared} courses. Changes show up in all of them.`}>
            <Chip size="small" label={sharedLabel} data-testid="shared-chip"
              sx={{ mt: 0.5, height: 20, fontSize: '0.7rem', fontWeight: 600, color: t.warn, bgcolor: t.warnSoft }} />
          </Tooltip>
        )}
      </Box>
      <StatusChip status={l.published ? 'PUBLISHED' : 'DRAFT'} />
      <Stack direction={{ xs: 'column', sm: 'row' }} flexShrink={0} onClick={(e) => e.stopPropagation()}>
        <Tooltip title="Move up"><span>
          <IconButton size="small" disabled={first} onClick={() => onMove(-1)} aria-label="Move lesson up" sx={{ p: { xs: 0.25, sm: 0.5 } }}>
            <KeyboardArrowUpRoundedIcon fontSize="small" />
          </IconButton>
        </span></Tooltip>
        <Tooltip title="Move down"><span>
          <IconButton size="small" disabled={last} onClick={() => onMove(1)} aria-label="Move lesson down" sx={{ p: { xs: 0.25, sm: 0.5 } }}>
            <KeyboardArrowDownRoundedIcon fontSize="small" />
          </IconButton>
        </span></Tooltip>
      </Stack>
    </Stack>
  )
}
