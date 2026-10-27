import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Alert, Box, Button, Grid, IconButton, Link, Stack, TextField, Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import api, { errorMessage, fieldErrors, fileUrl } from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { PageHeader, Panel, Async, StatusChip, FileDrop } from '../../components/ui'
import { formatDateTime, fileSize } from '../../utils/format'
import { fonts } from '../../theme'
import { dueInfo } from './studentShared'

// The assignment, its row in my list (status, course name) and my submission (404 = not submitted yet).
async function loadAll(id) {
  const [assignment, mine] = await Promise.all([
    api.get(`/assignment/${id}`).then((r) => r.data),
    api.get('/assignment/my').then((r) => r.data.find((a) => String(a.id) === String(id)) || null).catch(() => null),
  ])
  // Only ask for my submission when my list says there is one (avoids a 404 for "not submitted yet").
  let submission = null
  if (!mine || mine.submissionId) {
    submission = await api.get(`/assignment-controller/assignment/${id}/my`).then((r) => r.data).catch((e) => {
      if (e.response?.status === 404) return null
      throw e
    })
  }
  return { assignment, mine, submission }
}

export default function StudentAssignmentDetail() {
  const { id } = useParams()
  const { data, loading, error, reload, setData } = useApi(() => loadAll(id), [id])

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Assignments', to: '/student/assignments' }, { label: data?.assignment.title || 'Assignment' }]}
        eyebrow={data?.mine?.courseTitle}
        title={data?.assignment.title || 'Assignment'}
        actions={data?.mine && <StatusChip status={data.mine.status} label={data.mine.status === 'PENDING' ? 'To do' : undefined} />}
      />
      <Async loading={loading && !data} error={error} onRetry={reload}>
        {data && (
          <Detail
            {...data}
            onSubmitted={(sub) => { setData((d) => ({ ...d, submission: sub })); reload() }}
          />
        )}
      </Async>
    </>
  )
}

function Detail({ assignment, mine, submission, onSubmitted }) {
  const t = useTheme().palette.lms
  const due = dueInfo(assignment.dueDate)
  const graded = submission?.status === 'GRADED' || submission?.marks != null
  const [editing, setEditing] = useState(!submission)
  const dueColor = { bad: t.bad, warn: t.warn, muted: t.muted }[due.tone]

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={7}>
        <Stack gap={3}>
          <Panel title="Instructions">
            <Typography sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word', lineHeight: 1.7 }} color="text.secondary">
              {assignment.description || 'No instructions were added.'}
            </Typography>
            <Stack direction="row" gap={3} mt={2.5} flexWrap="wrap">
              <Fact icon={EventOutlinedIcon} label="Due" value={assignment.dueDate ? formatDateTime(assignment.dueDate) : 'No due date'}
                extra={!submission && assignment.dueDate ? <Typography fontSize="0.8rem" fontWeight={700} color={dueColor}>{due.text}</Typography> : null} />
              <Fact icon={EmojiEventsOutlinedIcon} label="Marks" value={assignment.totalMarks != null ? `${assignment.totalMarks} marks` : '-'} />
            </Stack>
          </Panel>

          {graded && (
            <Panel title="Your grade">
              <Stack direction="row" alignItems="baseline" gap={1} mb={1.5}>
                <Typography sx={{ fontFamily: fonts.display, fontSize: '2.6rem', fontWeight: 600, lineHeight: 1, color: t.ok }}>{submission.marks}</Typography>
                <Typography color="text.disabled" fontSize="1.1rem">/ {assignment.totalMarks}</Typography>
                {assignment.totalMarks ? (
                  <Typography ml={1} fontWeight={700} color="text.secondary">{Math.round((submission.marks * 100) / assignment.totalMarks)}%</Typography>
                ) : null}
              </Stack>
              <Typography fontSize="0.75rem" fontWeight={700} color="text.disabled" textTransform="uppercase" letterSpacing="0.06em">Teacher feedback</Typography>
              <Typography sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word', mt: 0.5 }}>{submission.feedback || 'No written feedback.'}</Typography>
              {submission.gradedAt && <Typography fontSize="0.8rem" color="text.disabled" mt={1.5}>Graded {formatDateTime(submission.gradedAt)}</Typography>}
            </Panel>
          )}
        </Stack>
      </Grid>

      <Grid item xs={12} md={5}>
        {submission && !editing ? (
          <Panel sx={{ height: "auto" }} title="Your submission"
            subtitle={`Submitted ${formatDateTime(submission.submittedAt)}${submission.late ? ' · late' : ''}`}
            action={!graded && <Button size="small" variant="outlined" onClick={() => setEditing(true)}>Resubmit</Button>}>
            <SubmissionFiles submission={submission} />
            {submission.late && <Alert severity="warning" sx={{ mt: 2 }}>This was submitted after the due date.</Alert>}
            {!graded && <Typography fontSize="0.8rem" color="text.disabled" mt={2}>You can change your submission until it is graded.</Typography>}
          </Panel>
        ) : (
          <SubmitForm
            assignment={assignment}
            mine={mine}
            submission={submission}
            onCancel={submission ? () => setEditing(false) : null}
            onDone={(s) => { setEditing(false); onSubmitted(s) }}
          />
        )}
      </Grid>
    </Grid>
  )
}

function Fact({ icon: Icon, label, value, extra }) {
  return (
    <Stack direction="row" gap={1.25} alignItems="flex-start">
      <Icon sx={{ fontSize: 20, color: 'text.disabled', mt: '2px' }} />
      <Box>
        <Typography fontSize="0.75rem" color="text.disabled" fontWeight={700} textTransform="uppercase" letterSpacing="0.06em">{label}</Typography>
        <Typography fontWeight={600}>{value}</Typography>
        {extra}
      </Box>
    </Stack>
  )
}

function SubmissionFiles({ submission }) {
  const files = submission.files || []
  if (!files.length && !submission.filePath) return <Typography color="text.disabled">Nothing attached.</Typography>
  return (
    <Stack gap={1}>
      {submission.filePath && (
        <FileRow icon={LinkRoundedIcon} name={submission.filePath} href={/^https?:\/\//.test(submission.filePath) ? submission.filePath : undefined} />
      )}
      {files.map((f) => <FileRow key={f.id} icon={InsertDriveFileOutlinedIcon} name={f.originalName} meta={fileSize(f.sizeBytes)} href={fileUrl(f.url)} />)}
    </Stack>
  )
}

function FileRow({ icon: Icon, name, meta, href, onRemove }) {
  return (
    <Stack direction="row" alignItems="center" gap={1.25} sx={{ border: 1, borderColor: 'divider', borderRadius: '10px', px: 1.5, py: 1 }}>
      <Icon sx={{ fontSize: 20, color: 'primary.main' }} />
      <Box flex={1} minWidth={0}>
        {href
          ? <Link href={href} target="_blank" rel="noopener" fontWeight={600} fontSize="0.9rem" underline="hover" noWrap display="block">{name}</Link>
          : <Typography fontWeight={600} fontSize="0.9rem" noWrap>{name}</Typography>}
        {meta && <Typography fontSize="0.75rem" color="text.disabled">{meta}</Typography>}
      </Box>
      {onRemove && <IconButton size="small" onClick={onRemove} aria-label={`Remove ${name}`}><CloseRoundedIcon fontSize="small" /></IconButton>}
    </Stack>
  )
}

function SubmitForm({ assignment, submission, onCancel, onDone }) {
  const { notify } = useFeedback()
  const [files, setFiles] = useState(submission?.files || [])
  const [link, setLink] = useState(submission?.filePath || '')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const overdue = assignment.dueDate && new Date(assignment.dueDate) < new Date()

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    setErrors({})
    if (!files.length && !link.trim()) {
      setFormError('Add a file or a link before submitting.')
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/assignment-controller', {
        assignmentId: assignment.id, filePath: link.trim() || null, fileIds: files.map((f) => f.id),
      })
      notify.success(submission ? 'Submission updated' : 'Assignment submitted')
      onDone(res.data)
    } catch (err) {
      setErrors(fieldErrors(err))
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel sx={{ height: "auto" }} title={submission ? "Update your submission" : "Submit your work"} subtitle="Upload files, add a link, or both">
      <Stack component="form" onSubmit={submit} gap={2}>
        {overdue && <Alert severity="warning">The due date has passed. You can still submit, but it will be marked late.</Alert>}
        <FileDrop purpose="ASSIGNMENT_FILE" label="Drop a file here or" accept=".pdf,.jpg,.jpeg,.png,.zip,.docx" hint="PDF, JPG, PNG, ZIP or DOCX, up to 20 MB. Add files one at a time."
          onUploaded={(f) => setFiles((list) => [...list, f])} />
        {files.length > 0 && (
          <Stack gap={1}>
            {files.map((f) => (
              <FileRow key={f.id} icon={InsertDriveFileOutlinedIcon} name={f.originalName} meta={fileSize(f.sizeBytes)} href={fileUrl(f.url)}
                onRemove={() => setFiles((list) => list.filter((x) => x.id !== f.id))} />
            ))}
          </Stack>
        )}
        <TextField label="Link (optional)" placeholder="https://github.com/you/project" value={link} onChange={(e) => setLink(e.target.value)}
          error={!!errors.filePath} helperText={errors.filePath || 'For example a GitHub repository or a Google Drive link'} />
        {formError && <Alert severity="error">{formError}</Alert>}
        <Stack direction="row" gap={1} justifyContent="flex-end">
          {onCancel && <Button variant="outlined" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" variant="contained" disabled={saving} endIcon={<SendRoundedIcon />}>
            {saving ? 'Submitting...' : submission ? 'Resubmit' : 'Submit'}
          </Button>
        </Stack>
      </Stack>
    </Panel>
  )
}
