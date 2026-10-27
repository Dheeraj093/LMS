import { useCallback, useEffect, useRef, useState } from 'react'

// Loads data once (and again when deps change).
// const { data, loading, error, reload, setData } = useApi(() => api.get('/x').then(r => r.data), [])
export default function useApi(loader, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const alive = useRef(true)

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await loader()
      if (alive.current) setData(result)
    } catch (e) {
      if (alive.current) setError(e)
    } finally {
      if (alive.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    alive.current = true
    run()
    return () => { alive.current = false }
  }, [run])

  return { data, loading, error, reload: run, setData }
}
