import { useState, useRef, useCallback } from 'react'
import DropZone from '../components/DropZone.jsx'
import Preview from '../components/Preview.jsx'
import LogPanel from '../components/LogPanel.jsx'
import ResultTable from '../components/ResultTable.jsx'
import { run } from '../engine/pipeline.js'

function Scan() {
  const [img, setImg] = useState(null)
  const [logs, setLogs] = useState([])
  const [progress, setProgress] = useState(null)
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)

  const pref = useRef(null)
  const wref = useRef(null)

  const log = useCallback((msg, type = '') => {
    const ts = new Date().toTimeString().slice(0, 8)
    setLogs((prev) => [...prev, { time: ts, msg, type }])
  }, [])

  const prog = useCallback((pct, label) => {
    setProgress({ pct, label })
  }, [])

  const load = useCallback((image) => {
    setImg(image)
    setRows([])
    log(`Image loaded: ${image.width}x${image.height}px`)
  }, [log])

  const scan = useCallback(async () => {
    if (!img || busy) return
    setBusy(true)
    setRows([])

    try {
      const result = await run(img, {
        log,
        prog,
        previewCanvas: pref.current?.getCanvas(),
        workCanvas: wref.current,
      })

      if (!result.rows || result.rows.length === 0) {
        log('No table found. Try a clearer image.', 'warn')
      } else {
        log(`Done, ${result.rows.length} rows extracted`, 'ok')
        setRows(result.rows)
      }
      setProgress(null)
    } catch (err) {
      log('Error: ' + err.message, 'err')
      setProgress(null)
    }
    setBusy(false)
  }, [img, busy, log, prog])

  const reset = useCallback(() => {
    setImg(null)
    setLogs([])
    setProgress(null)
    setRows([])
  }, [])

  const update = useCallback((idx, field, val) => {
    setRows((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: val }
      return next
    })
  }, [])

  const csv = useCallback(() => {
    const lines = ['Subject,Credits,Grade']
    rows.forEach((r) => lines.push(`"${r.subject}","${r.credits}","${r.grade}"`))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
    a.download = 'calci_grades.csv'
    a.click()
  }, [rows])

  return (
    <>
      <DropZone onLoad={load} />
      <canvas ref={wref} style={{ display: 'none' }} />

      {img && (
        <>
          <Preview ref={pref} image={img} />
          <div className="actions-row">
            <button className="btn primary" onClick={scan} disabled={busy}>
              {busy ? 'Scanning...' : 'Scan table'}
            </button>
            <button className="btn" onClick={reset}>Clear</button>
          </div>
        </>
      )}

      {progress && (
        <div style={{ fontSize: '0.75rem', color: '#888' }}>{progress.label}</div>
      )}

      <LogPanel logs={logs} />
      <ResultTable rows={rows} onUpdate={update} onExport={csv} onReset={reset} />
    </>
  )
}

export default Scan
