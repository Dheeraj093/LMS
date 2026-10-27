import { useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, LinearProgress, Stack,
  ToggleButton, ToggleButtonGroup, Typography, Alert, IconButton, Breadcrumbs, Link,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined'
import { errorMessage, fileUrl, uploadFile } from '../../api/client'
import { initials, fileSize } from '../../utils/format'
import { fonts } from '../../theme'

// Page title row: eyebrow, title, subtitle on the left, actions on the right.
export function PageHeader({ title, subtitle, eyebrow, actions, crumbs }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'flex-end' }} gap={2} mb={3}>
      <Box minWidth={0}>
        {crumbs && (
          <Breadcrumbs sx={{ mb: 1, fontSize: '0.85rem' }}>
            {crumbs.map((c, i) => c.to
              ? <Link key={i} component={RouterLink} to={c.to} underline="hover" color="text.secondary">{c.label}</Link>
              : <Typography key={i} fontSize="0.85rem" color="text.primary" fontWeight={600}>{c.label}</Typography>)}
          </Breadcrumbs>
        )}
        {eyebrow && <Typography variant="overline" color="text.disabled">{eyebrow}</Typography>}
        <Typography variant="h1" component="h1" sx={{ wordBreak: 'break-word' }}>{title}</Typography>
        {subtitle && <Typography color="text.secondary" mt={0.5}>{subtitle}</Typography>}
      </Box>
      {actions && <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">{actions}</Stack>}
    </Stack>
  )
}

const toneColors = (t, tone) => ({
  accent: [t.accent, t.accentSoft], ok: [t.ok, t.okSoft], warn: [t.warn, t.warnSoft], bad: [t.bad, t.badSoft], muted: [t.muted, t.sunk],
  teal: [t.teal, t.tealSoft], amber: [t.amber, t.amberSoft], rose: [t.rose, t.roseSoft],
}[tone] || [t.accent, t.accentSoft])

// Small square icon with a soft colored background.
export function IconBadge({ icon: Icon, tone = 'accent', size = 32 }) {
  const t = useTheme().palette.lms
  const [fg, bg] = toneColors(t, tone)
  return (
    <Box sx={{ width: size, height: size, borderRadius: '9px', bgcolor: bg, color: fg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <Icon sx={{ fontSize: size * 0.56 }} />
    </Box>
  )
}

// Number tile at the top of dashboards.
export function StatCard({ icon, tone = 'accent', label, value, suffix, hint, hintTone }) {
  const t = useTheme().palette.lms
  const hintColor = hintTone === 'ok' ? t.ok : hintTone === 'bad' ? t.bad : t.muted
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" alignItems="center" gap={1.25} mb={1.5}>
          {icon && <IconBadge icon={icon} tone={tone} />}
          <Typography fontWeight={600} fontSize="0.9rem" color="text.secondary">{label}</Typography>
        </Stack>
        <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, fontSize: '2rem', lineHeight: 1.1 }}>
          {value}
          {suffix && <Typography component="span" color="text.disabled" fontSize="1rem" fontWeight={500} ml={0.5}>{suffix}</Typography>}
        </Typography>
        {hint && <Typography mt={0.75} fontSize="0.8rem" fontWeight={600} color={hintColor}>{hint}</Typography>}
      </CardContent>
    </Card>
  )
}

// White panel with a title and subtitle, used for charts and lists.
export function Panel({ title, subtitle, action, children, sx, contentSx }) {
  return (
    <Card sx={{ height: '100%', ...sx }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } }, height: '100%', display: 'flex', flexDirection: 'column', ...contentSx }}>
        {(title || action) && (
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2} mb={2}>
            <Box minWidth={0}>
              {title && <Typography variant="h5">{title}</Typography>}
              {subtitle && <Typography fontSize="0.82rem" color="text.disabled" mt={0.25}>{subtitle}</Typography>}
            </Box>
            {action}
          </Stack>
        )}
        <Box flex={1} minHeight={0}>{children}</Box>
      </CardContent>
    </Card>
  )
}

// Rows of "label ..... value%" with a bar under each.
export function ProgressList({ items, color = 'primary', empty = 'Nothing to show yet.' }) {
  if (!items?.length) return <Typography color="text.disabled" fontSize="0.9rem">{empty}</Typography>
  return (
    <Stack gap={2}>
      {items.map((it, i) => (
        <Box key={it.key ?? i}>
          <Stack direction="row" justifyContent="space-between" gap={2} mb={0.75}>
            <Typography fontWeight={600} fontSize="0.9rem" noWrap title={it.label}>{it.label}</Typography>
            <Typography fontFamily={fonts.mono} fontSize="0.82rem" fontWeight={600} flexShrink={0}>{it.right ?? `${Math.round(it.value)}%`}</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, it.value || 0))} color={it.color || color} />
        </Box>
      ))}
    </Stack>
  )
}

export function RangeToggle({ value, options, onChange }) {
  return (
    <ToggleButtonGroup size="small" exclusive value={value} onChange={(_, v) => v && onChange(v)}>
      {options.map((o) => <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>)}
    </ToggleButtonGroup>
  )
}

export function EmptyState({ icon: Icon = InboxOutlinedIcon, title, description, action }) {
  return (
    <Box textAlign="center" py={6} px={2}>
      <Box sx={{ width: 56, height: 56, mx: 'auto', mb: 2, borderRadius: '14px', bgcolor: 'action.hover', display: 'grid', placeItems: 'center' }}>
        <Icon color="disabled" />
      </Box>
      <Typography variant="h5" mb={0.5}>{title}</Typography>
      {description && <Typography color="text.secondary" maxWidth={420} mx="auto">{description}</Typography>}
      {action && <Box mt={2.5}>{action}</Box>}
    </Box>
  )
}

export function Loading({ py = 10 }) {
  return <Box display="flex" justifyContent="center" py={py}><CircularProgress size={30} /></Box>
}

export function PageError({ error, onRetry }) {
  return (
    <Alert severity="error" action={onRetry && <Button color="inherit" size="small" onClick={onRetry}>Try again</Button>}>
      {errorMessage(error)}
    </Alert>
  )
}

// Loading / error / content in one place.
export function Async({ loading, error, onRetry, children }) {
  if (loading) return <Loading />
  if (error) return <PageError error={error} onRetry={onRetry} />
  return children
}

const STATUS = {
  ACTIVE: ['Active', 'ok'], PENDING: ['Pending', 'warn'], BLOCKED: ['Blocked', 'bad'],
  PUBLISHED: ['Published', 'ok'], DRAFT: ['Draft', 'warn'],
  SUBMITTED: ['Submitted', 'accent'], LATE: ['Late', 'warn'], GRADED: ['Graded', 'ok'], MISSING: ['Missing', 'bad'],
  IN_PROGRESS: ['In progress', 'accent'], PASSED: ['Passed', 'ok'], FAILED: ['Failed', 'bad'], COMPLETED: ['Completed', 'ok'],
  ALL: ['Everyone enrolled', 'muted'], GROUPS: ['Groups', 'accent'], LINK: ['Join code', 'warn'],
  ADMIN: ['Admin', 'warn'], TEACHER: ['Teacher', 'accent'], STUDENT: ['Student', 'muted'],
}

// Colored pill for a status word.
export function StatusChip({ status, label }) {
  const t = useTheme().palette.lms
  const [text, tone] = STATUS[status] || [status, 'muted']
  const [fg, bg] = toneColors(t, tone)
  return <Chip size="small" label={label || text} sx={{ color: fg, bgcolor: bg }} />
}

export function UserAvatar({ name, src, size = 36 }) {
  const t = useTheme().palette.lms
  const palette = ['#5B4CF0', '#A855F7', '#0FA88F', '#F0567A', '#F59E0B', '#0EA5E9']
  const color = palette[(name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length]
  return (
    <Avatar src={fileUrl(src) || undefined} sx={{ width: size, height: size, fontSize: size * 0.38, fontWeight: 700, bgcolor: src ? t.sunk : color }}>
      {initials(name)}
    </Avatar>
  )
}

// Upload box. Shows the current file, a progress bar while uploading, and calls onUploaded(fileResponse).
export function FileDrop({ purpose, accept, label = 'Upload a file', hint, current, onUploaded, onClear, disabled }) {
  const input = useRef(null)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [over, setOver] = useState(false)
  const t = useTheme().palette.lms

  const send = async (file) => {
    if (!file) return
    setError('')
    setProgress(0)
    try {
      const res = await uploadFile(file, purpose, setProgress)
      onUploaded?.(res)
    } catch (e) {
      setError(errorMessage(e, 'Upload failed'))
    } finally {
      setProgress(null)
    }
  }

  return (
    <Box>
      <Box
        onClick={() => !disabled && progress === null && input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) send(e.dataTransfer.files?.[0]) }}
        sx={{
          border: `1.5px dashed ${over ? t.accent : t.line2}`, borderRadius: '12px', p: 2.5, textAlign: 'center', cursor: disabled ? 'default' : 'pointer',
          bgcolor: over ? t.accentSoft : t.sunk, transition: 'all .15s',
        }}
      >
        {progress !== null ? (
          <Box>
            <Typography fontSize="0.9rem" mb={1}>Uploading... {progress}%</Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        ) : current ? (
          <Stack direction="row" alignItems="center" justifyContent="center" gap={1}>
            <CheckCircleRoundedIcon color="success" fontSize="small" />
            <Typography fontWeight={600} color="success.main" noWrap maxWidth="70%">{current.originalName || current.name || 'File uploaded'}</Typography>
            {current.sizeBytes ? <Typography color="text.secondary" fontSize="0.85rem">{fileSize(current.sizeBytes)}</Typography> : null}
            <Typography color="primary" fontWeight={600} fontSize="0.85rem">Replace</Typography>
            {onClear && (
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onClear() }}><CloseRoundedIcon fontSize="small" /></IconButton>
            )}
          </Stack>
        ) : (
          <Box>
            <CloudUploadOutlinedIcon color="action" />
            <Typography fontSize="0.9rem">{label} <Typography component="span" color="primary" fontWeight={600}>browse</Typography></Typography>
            {hint && <Typography fontSize="0.78rem" color="text.disabled" mt={0.5}>{hint}</Typography>}
          </Box>
        )}
      </Box>
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      <input ref={input} type="file" hidden accept={accept} onChange={(e) => { send(e.target.files?.[0]); e.target.value = '' }} />
    </Box>
  )
}

// Recharts styling shared by every chart.
export function useChartStyle() {
  const theme = useTheme()
  const t = theme.palette.lms
  return {
    axis: { stroke: t.faint, fontSize: 12, tickLine: false, axisLine: false },
    grid: { stroke: t.line, strokeDasharray: '0', vertical: false },
    tooltip: {
      contentStyle: { background: t.surface, border: `1px solid ${t.line}`, borderRadius: 10, fontSize: 13, color: t.ink },
      labelStyle: { color: t.muted, fontWeight: 600 },
      cursor: { fill: t.sunk },
    },
    t,
  }
}

export function LinkButton({ to, children, ...props }) {
  return <Button component={RouterLink} to={to} {...props}>{children}</Button>
}
