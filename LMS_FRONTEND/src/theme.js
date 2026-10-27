import { createTheme, alpha } from '@mui/material/styles'

// Colors (round 5: indigo-violet brand with teal and amber accents) and fonts.
export const tokens = {
  light: {
    bg: '#F5F6FB', surface: '#FFFFFF', sunk: '#EEF0F7', line: '#E3E6F0', line2: '#CFD4E3',
    ink: '#14142B', muted: '#5A5F7A', faint: '#8A8FA8',
    accent: '#5B4CF0', accent2: '#4535D6', accentSoft: '#EEEBFF',
    teal: '#0FA88F', tealSoft: '#DDF6F1', amber: '#F59E0B', amberSoft: '#FEF3DB', rose: '#F0567A', roseSoft: '#FDE6EC',
    ok: '#12976A', okSoft: '#DCF5EA', warn: '#C27400', warnSoft: '#FFF0D6', bad: '#D63A4F', badSoft: '#FDE4E8',
    gradient: 'linear-gradient(135deg, #6D5DF6 0%, #4F3FE0 55%, #3B2FC9 100%)',
  },
  dark: {
    bg: '#0D0E1C', surface: '#15172B', sunk: '#1C1F38', line: '#272A48', line2: '#363A5E',
    ink: '#EEEEFA', muted: '#A4A7C4', faint: '#7C80A0',
    accent: '#8B80FF', accent2: '#A69DFF', accentSoft: '#25224D',
    teal: '#2DD4BF', tealSoft: '#0F3330', amber: '#FBBF24', amberSoft: '#3A2D0E', rose: '#FB7193', roseSoft: '#3D1726',
    ok: '#34D399', okSoft: '#0F3326', warn: '#F5B04A', warnSoft: '#3A2A12', bad: '#FF6B81', badSoft: '#3D1A22',
    gradient: 'linear-gradient(135deg, #7C6FFF 0%, #5B4CF0 60%, #4535D6 100%)',
  },
}

// Series colors for charts (same order everywhere): indigo, teal, rose, amber, violet, sky.
export const chartColors = ['#5B4CF0', '#0FA88F', '#F0567A', '#F59E0B', '#A855F7', '#0EA5E9']

export const fonts = {
  display: '"Bricolage Grotesque", "Segoe UI", system-ui, sans-serif',
  body: '"Figtree", "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
}

export function makeTheme(mode) {
  const t = tokens[mode]
  return createTheme({
    palette: {
      mode,
      primary: { main: t.accent, dark: t.accent2, light: t.accentSoft, contrastText: '#fff' },
      secondary: { main: t.teal, light: t.tealSoft, contrastText: '#fff' },
      info: { main: chartColors[5] },
      success: { main: t.ok, light: t.okSoft },
      warning: { main: t.warn, light: t.warnSoft },
      error: { main: t.bad, light: t.badSoft },
      background: { default: t.bg, paper: t.surface },
      text: { primary: t.ink, secondary: t.muted, disabled: t.faint },
      divider: t.line,
      lms: t,
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: fonts.body,
      h1: { fontFamily: fonts.display, fontWeight: 600, fontSize: '1.9rem', letterSpacing: '-0.02em' },
      h2: { fontFamily: fonts.display, fontWeight: 600, fontSize: '1.6rem', letterSpacing: '-0.02em' },
      h3: { fontFamily: fonts.display, fontWeight: 600, fontSize: '1.3rem', letterSpacing: '-0.01em' },
      h4: { fontFamily: fonts.display, fontWeight: 600, fontSize: '1.15rem' },
      h5: { fontFamily: fonts.display, fontWeight: 600, fontSize: '1.02rem' },
      h6: { fontFamily: fonts.body, fontWeight: 700, fontSize: '0.95rem' },
      button: { textTransform: 'none', fontWeight: 600 },
      overline: { fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.7rem' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: t.bg },
          code: { fontFamily: fonts.mono, fontSize: '0.85em', background: t.sunk, padding: '1px 6px', borderRadius: 6 },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${t.line}`,
            boxShadow: mode === 'light' ? '0 1px 2px rgba(20,20,43,.04), 0 6px 20px rgba(76,64,200,.06)' : 'none',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 10, paddingInline: 16, minHeight: 40 },
          outlined: { borderColor: t.line2, color: t.ink, '&:hover': { borderColor: t.accent, background: t.accentSoft } },
          containedPrimary: {
            backgroundImage: t.gradient,
            boxShadow: mode === 'light' ? '0 4px 14px rgba(91,76,240,.28)' : 'none',
            '&:hover': { backgroundImage: t.gradient, filter: 'brightness(1.07)' },
            '&.Mui-disabled': { backgroundImage: 'none' },
          },
        },
      },
      MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
      MuiSelect: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 10, background: t.surface, '& fieldset': { borderColor: t.line2 } },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 600, borderRadius: 8 }, sizeSmall: { fontSize: '0.72rem', height: 22 } },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.muted, background: t.sunk },
          root: { borderColor: t.line },
        },
      },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44 } } },
      MuiLinearProgress: {
        styleOverrides: { root: { height: 8, borderRadius: 8, backgroundColor: t.sunk }, bar: { borderRadius: 8 } },
      },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
      MuiTooltip: { styleOverrides: { tooltip: { fontSize: '0.75rem' } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiMenuItem: { styleOverrides: { root: { fontSize: '0.9rem' } } },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none', fontWeight: 600, border: 'none', borderRadius: '8px !important', paddingInline: 12,
            '&.Mui-selected': { background: t.accent, color: '#fff', '&:hover': { background: alpha(t.accent, 0.88) } },
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: { root: { background: t.surface, border: `1px solid ${t.line}`, borderRadius: 10, padding: 3, gap: 2 } },
      },
    },
  })
}
