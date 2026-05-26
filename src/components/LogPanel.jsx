import { useRef, useEffect } from 'react'
import './LogPanel.css'

function LogPanel({ logs }) {
  const el = useRef(null)

  useEffect(() => {
    if (el.current) el.current.scrollTop = el.current.scrollHeight
  }, [logs])

  if (!logs.length) return null

  return (
    <div className="log-section" ref={el}>
      {logs.map((entry, i) => (
        <div key={i} className={`log-line ${entry.type || ''}`}>
          [{entry.time}]  {entry.msg}
        </div>
      ))}
    </div>
  )
}

export default LogPanel
