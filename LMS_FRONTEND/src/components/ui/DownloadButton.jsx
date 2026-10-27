import { useState } from 'react'
import { Button, CircularProgress, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import { downloadFile, errorMessage } from '../../api/client'
import { useFeedback } from './Feedback'

const ICONS = { xlsx: TableChartOutlinedIcon, pdf: PictureAsPdfOutlinedIcon }

// "Download" button for backend reports. formats: [{ format: 'xlsx' | 'pdf', label, path, params, fileName }].
// One format = a plain button; several = a button that opens a small menu.
export default function DownloadButton({ formats, label = 'Download', variant = 'outlined', size }) {
  const { notify } = useFeedback()
  const [anchor, setAnchor] = useState(null)
  const [busy, setBusy] = useState(false)

  const run = async (f) => {
    setAnchor(null)
    setBusy(true)
    try {
      const name = await downloadFile(f.path, f.fileName, f.params)
      notify.success(`Downloaded ${name}`)
    } catch (e) {
      notify.error(errorMessage(e, 'Could not download the file'))
    } finally {
      setBusy(false)
    }
  }

  const icon = busy ? <CircularProgress size={16} /> : <FileDownloadOutlinedIcon />
  if (formats.length === 1) {
    return <Button variant={variant} size={size} startIcon={icon} disabled={busy} onClick={() => run(formats[0])}>{formats[0].label || label}</Button>
  }
  return (
    <>
      <Button variant={variant} size={size} startIcon={icon} disabled={busy} onClick={(e) => setAnchor(e.currentTarget)}>{label}</Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {formats.map((f) => {
          const Icon = ICONS[f.format] || FileDownloadOutlinedIcon
          return (
            <MenuItem key={f.format} onClick={() => run(f)}>
              <ListItemIcon><Icon fontSize="small" /></ListItemIcon>
              <ListItemText>{f.label}</ListItemText>
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}
