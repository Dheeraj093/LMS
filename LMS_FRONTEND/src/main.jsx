import { StrictMode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { makeTheme } from './theme'
import { AuthProvider } from './auth/AuthContext'
import { FeedbackProvider } from './components/ui/Feedback'
import App from './App'
import { ColorModeContext } from './colorMode'

function initialMode() {
  try {
    const saved = localStorage.getItem('lms.mode')
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* private window */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function Root() {
  const [mode, setMode] = useState(initialMode)
  const theme = useMemo(() => makeTheme(mode), [mode])
  const colorMode = useMemo(() => ({
    mode,
    toggle: () => setMode((m) => {
      const next = m === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem('lms.mode', next) } catch { /* ignore */ }
      return next
    }),
  }), [mode])

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <FeedbackProvider>
              <App />
            </FeedbackProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><Root /></StrictMode>)
