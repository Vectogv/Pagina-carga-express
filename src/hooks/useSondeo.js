import { useEffect } from 'react'

/** Llama a `fn` al montar y luego cada `ms` mientras la pestaña está visible. */
export default function useSondeo(fn, ms) {
  useEffect(() => {
    fn()
    const id = setInterval(() => { if (document.visibilityState === 'visible') fn() }, ms)
    return () => clearInterval(id)
  }, [fn, ms])
}
