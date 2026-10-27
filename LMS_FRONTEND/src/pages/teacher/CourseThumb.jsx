import { useState } from 'react'
import { Box } from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded'
import { fileUrl } from '../../api/client'

// Course picture. Falls back to a soft blue pattern when there is no image or it fails to load.
export default function CourseThumb({ src, height = 140, width = '100%', radius = 0, iconSize = 34 }) {
  const t = useTheme().palette.lms
  const [broken, setBroken] = useState(false)
  const url = !broken && fileUrl(src)

  return (
    <Box
      sx={{
        width, height, borderRadius: `${radius}px`, overflow: 'hidden', flexShrink: 0, position: 'relative',
        bgcolor: t.accentSoft,
        backgroundImage: `radial-gradient(${alpha(t.accent, 0.22)} 1.2px, transparent 1.2px), linear-gradient(135deg, ${alpha(t.accent, 0.18)}, ${alpha(t.accent, 0.04)})`,
        backgroundSize: '12px 12px, 100% 100%',
        display: 'grid', placeItems: 'center',
      }}
    >
      {url ? (
        <Box component="img" src={url} alt="" onError={() => setBroken(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <MenuBookRoundedIcon sx={{ color: t.accent, fontSize: iconSize, opacity: 0.8 }} />
      )}
    </Box>
  )
}
