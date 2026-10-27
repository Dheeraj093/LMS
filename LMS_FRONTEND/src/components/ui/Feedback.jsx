import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material'

const FeedbackContext = createContext(null)

// Snackbar messages and confirm dialogs for the whole app.
export function FeedbackProvider({ children }) {
  const [toast, setToast] = useState(null)
  const [dialog, setDialog] = useState(null)
  const resolver = useRef(null)

  const show = useCallback((message, severity = 'success') => setToast({ message, severity, key: Date.now() }), [])
  const notify = {
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
    info: (m) => show(m, 'info'),
  }

  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve
    setDialog({ confirmText: 'Confirm', ...opts })
  }), [])

  const close = (answer) => {
    setDialog(null)
    resolver.current?.(answer)
  }

  return (
    <FeedbackContext.Provider value={{ notify, confirm }}>
      {children}
      <Snackbar
        key={toast?.key}
        open={!!toast}
        autoHideDuration={4000}
        onClose={(_, reason) => reason !== 'clickaway' && setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>{toast.message}</Alert> : <span />}
      </Snackbar>
      <Dialog open={!!dialog} onClose={() => close(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{dialog?.title}</DialogTitle>
        {dialog?.message && (
          <DialogContent><DialogContentText>{dialog.message}</DialogContentText></DialogContent>
        )}
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => close(false)}>Cancel</Button>
          <Button variant="contained" color={dialog?.danger ? 'error' : 'primary'} onClick={() => close(true)}>
            {dialog?.confirmText}
          </Button>
        </DialogActions>
      </Dialog>
    </FeedbackContext.Provider>
  )
}

// const { notify, confirm } = useFeedback()
// notify.success('Saved'); if (await confirm({ title: 'Delete?', danger: true })) ...
export function useFeedback() {
  return useContext(FeedbackContext)
}
