import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_DURATION = 3200

/**
 * Message + tone + auto-dismiss timer for <Toast>.
 *
 * `show(message, tone)` raises a notice. Successes auto-clear after
 * `duration`; errors stay until the next notice replaces them, because
 * a failure the user never saw is worse than one lingering.
 */
export default function useToast(duration = DEFAULT_DURATION) {
  const [notice, setNotice] = useState(null)
  const timerRef = useRef(null)

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setNotice(null)
  }, [])

  const show = useCallback(
    (message, tone = 'success') => {
      if (!message) return
      if (timerRef.current) clearTimeout(timerRef.current)

      setNotice({ message, tone })

      if (tone === 'success') {
        timerRef.current = setTimeout(() => {
          timerRef.current = null
          setNotice(null)
        }, duration)
      }
    },
    [duration],
  )

  useEffect(() => () => clear(), [clear])

  return [notice, show, clear]
}