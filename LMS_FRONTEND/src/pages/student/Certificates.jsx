import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, GlobalStyles, Grid, IconButton, Stack, Tooltip, Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import api from '../../api/client'
import useApi from '../../components/ui/useApi'
import { useFeedback } from '../../components/ui/Feedback'
import { PageHeader, EmptyState, Async, LinkButton } from '../../components/ui'
import { formatDate } from '../../utils/format'
import { fonts } from '../../theme'

const verifyLink = (code) => `${window.location.origin}/verify/${encodeURIComponent(code)}`

export default function Certificates() {
  const { notify } = useFeedback()
  const { data, loading, error, reload } = useApi(() => api.get('/certificates/my').then((r) => r.data), [])
  const [preview, setPreview] = useState(null)

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text)
      notify.success(`${what} copied`)
    } catch {
      notify.error('Could not copy. Please copy it by hand: ' + text)
    }
  }

  return (
    <>
      <PageHeader title="Certificates" subtitle="Earned by finishing every lesson of a course" />
      <Async loading={loading} error={error} onRetry={reload}>
        {data?.length === 0 ? (
          <Card>
            <EmptyState icon={WorkspacePremiumOutlinedIcon} title="No certificates yet"
              description="Complete all lessons of a course and your certificate appears here automatically."
              action={<LinkButton to="/student/learning" variant="contained">Go to My learning</LinkButton>} />
          </Card>
        ) : (
          <Grid container spacing={2.5}>
            {(data || []).map((c) => (
              <Grid item xs={12} md={6} key={c.id}>
                <CertificateCard cert={c} onCopy={copy} onPrint={() => setPreview(c)} />
              </Grid>
            ))}
          </Grid>
        )}
      </Async>
      <PrintDialog cert={preview} onClose={() => setPreview(null)} />
    </>
  )
}

function CertificateCard({ cert, onCopy, onPrint }) {
  const t = useTheme().palette.lms
  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ height: 6, background: `linear-gradient(90deg, ${t.accent}, #A855F7, #F59E0B)` }} />
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack direction="row" gap={2} alignItems="flex-start">
          <Box sx={{ width: 52, height: 52, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: t.warnSoft, color: t.warn, flexShrink: 0 }}>
            <WorkspacePremiumRoundedIcon sx={{ fontSize: 30 }} />
          </Box>
          <Box minWidth={0} flex={1}>
            <Typography variant="overline" color="text.disabled">Certificate of completion</Typography>
            <Typography variant="h4" sx={{ wordBreak: 'break-word' }}>{cert.courseTitle}</Typography>
            <Typography fontSize="0.88rem" color="text.secondary" mt={0.5}>
              Teacher {cert.teacherName} · Issued {formatDate(cert.issuedAt)}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" gap={1} mt={2.5} sx={{ bgcolor: t.sunk, borderRadius: '10px', px: 1.5, py: 1 }}>
          <Typography fontSize="0.75rem" color="text.disabled" fontWeight={700}>CODE</Typography>
          <Typography fontFamily={fonts.mono} fontWeight={700} fontSize="0.9rem" flex={1} noWrap>{cert.code}</Typography>
          <Tooltip title="Copy code">
            <IconButton size="small" onClick={() => onCopy(cert.code, 'Code')} aria-label="Copy code"><ContentCopyRoundedIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Stack>
        <Stack direction="row" gap={1} mt={2} flexWrap="wrap">
          <Button size="small" variant="outlined" startIcon={<VerifiedOutlinedIcon />} href={`/verify/${encodeURIComponent(cert.code)}`} target="_blank" rel="noopener">
            Verify link
          </Button>
          <Button size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={() => onCopy(verifyLink(cert.code), 'Verify link')}>
            Copy link
          </Button>
          <Button size="small" variant="contained" startIcon={<PrintOutlinedIcon />} onClick={onPrint}>
            View & print
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

// The certificate itself. Fixed colors on purpose: it is a printed document, the same in light and dark mode.
function CertificateSheet({ cert }) {
  return (
    <Box sx={{
      bgcolor: '#FFFFFF', color: '#14142B', p: { xs: 2, sm: 4 }, aspectRatio: { sm: '1.414 / 1' }, display: 'flex',
      '@media print': { p: 0, aspectRatio: 'auto', height: '100%' },
    }}>
      <Box sx={{ flex: 1, border: '2px solid #5B4CF0', outline: '1px solid #F59E0B', outlineOffset: '-10px', borderRadius: '8px', p: { xs: 3, sm: 5 },
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 1.5 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <WorkspacePremiumRoundedIcon sx={{ color: '#F59E0B', fontSize: 34 }} />
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '1.3rem', color: '#5B4CF0' }}>Learnly</Typography>
        </Stack>
        <Typography sx={{ letterSpacing: '0.2em', fontWeight: 700, fontSize: '0.75rem', color: '#5A5F7A' }}>CERTIFICATE OF COMPLETION</Typography>
        <Typography sx={{ color: '#5A5F7A', fontSize: '0.95rem', mt: 1 }}>This certifies that</Typography>
        <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, fontSize: { xs: '1.7rem', sm: '2.4rem' }, lineHeight: 1.1 }}>{cert.studentName}</Typography>
        <Typography sx={{ color: '#5A5F7A', fontSize: '0.95rem' }}>has successfully completed the course</Typography>
        <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, fontSize: { xs: '1.2rem', sm: '1.6rem' }, color: '#5B4CF0' }}>{cert.courseTitle}</Typography>
        <Stack direction="row" gap={{ xs: 3, sm: 6 }} mt={2} flexWrap="wrap" justifyContent="center">
          <Box>
            <Typography fontWeight={700}>{cert.teacherName}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#8A8FA8', borderTop: '1px solid #CFD4E3', pt: 0.5, mt: 0.5 }}>Teacher</Typography>
          </Box>
          <Box>
            <Typography fontWeight={700}>{formatDate(cert.issuedAt)}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#8A8FA8', borderTop: '1px solid #CFD4E3', pt: 0.5, mt: 0.5 }}>Date issued</Typography>
          </Box>
        </Stack>
        <Typography sx={{ fontFamily: fonts.mono, fontSize: '0.75rem', color: '#8A8FA8', mt: 2, wordBreak: 'break-all' }}>
          Certificate code {cert.code} · verify at {verifyLink(cert.code)}
        </Typography>
      </Box>
    </Box>
  )
}

// Preview dialog. When printing, only the copy in #certificate-print is shown (see the print styles).
function PrintDialog({ cert, onClose }) {
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    if (!printing) return undefined
    const done = () => setPrinting(false)
    window.addEventListener('afterprint', done)
    // Let React render the print copy, then open the print window.
    const id = setTimeout(() => window.print(), 50)
    return () => { clearTimeout(id); window.removeEventListener('afterprint', done) }
  }, [printing])

  return (
    <>
      <GlobalStyles styles={{
        '@media screen': { '#certificate-print': { display: 'none' } },
        '@media print': {
          '@page': { size: 'A4 landscape', margin: '12mm' },
          'body > *:not(#certificate-print)': { display: 'none !important' },
          '#certificate-print': { display: 'block', height: '100%' },
          body: { background: '#fff !important' },
        },
      }} />
      <Dialog open={!!cert} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: { xs: 1, sm: 2 }, bgcolor: 'background.default' }}>
          {cert && <Box sx={{ borderRadius: '8px', overflow: 'hidden', border: 1, borderColor: 'divider' }}><CertificateSheet cert={cert} /></Box>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={onClose}>Close</Button>
          <Button variant="contained" startIcon={<PrintOutlinedIcon />} onClick={() => setPrinting(true)}>Print</Button>
        </DialogActions>
      </Dialog>
      {cert && printing && createPortal(<div id="certificate-print"><CertificateSheet cert={cert} /></div>, document.body)}
    </>
  )
}
