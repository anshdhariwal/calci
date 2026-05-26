import { cvOk, loadCV } from './opencv-loader.js'
import { initTess, getWorker } from './tesseract-init.js'
import { detectTable, wordboxTable } from './detect.js'
import { mapCols } from './classify.js'

function preprocess(img, wc) {
  const MAX = 2400
  const scale = Math.min(1, MAX / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)

  wc.width = w
  wc.height = h
  wc.getContext('2d').drawImage(img, 0, 0, w, h)

  const src = cv.imread(wc)
  const gray = new cv.Mat()
  const blur = new cv.Mat()
  const thresh = new cv.Mat()

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
  cv.GaussianBlur(gray, blur, new cv.Size(3, 3), 0)
  cv.adaptiveThreshold(blur, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 15, 8)

  gray.delete()
  blur.delete()
  src.delete()

  const fixed = deskew(thresh)
  if (fixed !== thresh) thresh.delete()

  return { bin: fixed, canvas: wc, scale }
}

function deskew(mat) {
  try {
    const lines = new cv.Mat()
    cv.HoughLinesP(mat, lines, 1, Math.PI / 180, 80, 50, 10)
    if (lines.rows === 0) { lines.delete(); return mat }

    const angles = []
    for (let i = 0; i < lines.rows; i++) {
      const d = lines.data32S
      const a = Math.atan2(d[i * 4 + 3] - d[i * 4 + 1], d[i * 4 + 2] - d[i * 4]) * 180 / Math.PI
      if (Math.abs(a) < 45) angles.push(a)
    }
    lines.delete()
    if (!angles.length) return mat
    angles.sort((a, b) => a - b)
    const med = angles[Math.floor(angles.length / 2)]
    if (Math.abs(med) < 0.5) return mat

    const cx = mat.cols / 2, cy = mat.rows / 2
    const M = cv.getRotationMatrix2D(new cv.Point(cx, cy), med, 1.0)
    const rot = new cv.Mat()
    cv.warpAffine(mat, rot, M, new cv.Size(mat.cols, mat.rows), cv.INTER_LINEAR, cv.BORDER_REPLICATE)
    M.delete()
    return rot
  } catch (e) {
    return mat
  }
}

async function ocrGrid(det, canvas, prog) {
  const w = getWorker()
  const { rows, cols } = det
  const nr = rows.length - 1, nc = cols.length - 1
  if (nr < 1 || nc < 1) return []

  const pad = 3
  const table = []
  for (let r = 0; r < nr; r++) {
    const row = []
    for (let c = 0; c < nc; c++) {
      const x = Math.round(cols[c]) + pad
      const y = Math.round(rows[r]) + pad
      const cw = Math.max(4, Math.round(cols[c + 1]) - Math.round(cols[c]) - pad * 2)
      const ch = Math.max(4, Math.round(rows[r + 1]) - Math.round(rows[r]) - pad * 2)
      const tmp = document.createElement('canvas')
      tmp.width = cw; tmp.height = ch
      tmp.getContext('2d').drawImage(canvas, x, y, cw, ch, 0, 0, cw, ch)
      try {
        const res = await w.recognize(tmp)
        row.push({ text: res.data.text.trim().replace(/\s+/g, ' '), conf: res.data.confidence })
      } catch (e) {
        row.push({ text: '', conf: 0 })
      }
    }
    table.push(row)
    prog?.(40 + Math.round((r / nr) * 50), `OCR row ${r + 1}/${nr}...`)
  }
  return table
}

function canvasPrep(img, wc) {
  const MAX = 2400
  const scale = Math.min(1, MAX / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)

  const id = ctx.getImageData(0, 0, w, h)
  const d = id.data
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    const v = Math.min(255, Math.max(0, (g - 100) * 1.8 + 100))
    d[i] = d[i + 1] = d[i + 2] = v
    d[i + 3] = 255
  }
  ctx.putImageData(id, 0, 0)

  wc.width = w; wc.height = h
  wc.getContext('2d').drawImage(c, 0, 0)
  return c
}

function debugOverlay(det, scale, pc, img) {
  const ctx = pc.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const is = 1 / scale
  ctx.save()
  ctx.strokeStyle = 'rgba(110,231,183,0.75)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 3])
  for (const y of det.rows) {
    ctx.beginPath(); ctx.moveTo(0, y * is); ctx.lineTo(pc.width, y * is); ctx.stroke()
  }
  for (const x of det.cols) {
    ctx.beginPath(); ctx.moveTo(x * is, 0); ctx.lineTo(x * is, pc.height); ctx.stroke()
  }
  ctx.restore()
  const data = ctx.getImageData(0, 0, pc.width, pc.height)
  ctx.drawImage(img, 0, 0)
  return data
}

function debugWords(words, cw, ch, ds, pc, img) {
  const ctx = pc.getContext('2d')
  ctx.drawImage(img, 0, 0)
  ctx.save()
  ctx.strokeStyle = 'rgba(110,231,183,0.6)'
  ctx.lineWidth = 1
  for (const w of words) {
    const b = w.bbox
    ctx.strokeRect(b.x0 * ds, b.y0 * ds, (b.x1 - b.x0) * ds, (b.y1 - b.y0) * ds)
  }
  ctx.restore()
  const data = ctx.getImageData(0, 0, pc.width, pc.height)
  ctx.drawImage(img, 0, 0)
  return data
}

export async function run(img, { log, prog, previewCanvas, workCanvas }) {
  await initTess(log, prog)
  await loadCV(log)

  let rows, stats, overlay

  if (cvOk()) {
    prog?.(5, 'Preprocessing image...')
    log?.('Step 1: OpenCV preprocessing')
    const { bin, canvas, scale } = preprocess(img, workCanvas)

    prog?.(25, 'Detecting table...')
    log?.('Step 2: Table detection')
    const det = detectTable(bin, scale, log)
    log?.(`Mode: ${det.mode}  ${det.rows.length} rows x ${det.cols.length} cols`, 'ok')

    overlay = debugOverlay(det, scale, previewCanvas, img)
    try { bin.delete() } catch (e) {}

    prog?.(40, 'Extracting cells...')
    log?.('Step 3: Cell OCR')
    const raw = await ocrGrid(det, canvas, prog)

    prog?.(92, 'Mapping columns...')
    log?.('Step 4: Column mapping')
    rows = mapCols(raw, det, log)

    stats = {
      rows: rows.length,
      cols: (det.cols.length - 1) || raw[0]?.length || 0,
      conf: rows.length ? Math.round(rows.reduce((s, r) => s + r.conf, 0) / rows.length) : 0,
      mode: det.mode,
    }
  } else {
    log?.('OpenCV unavailable, running canvas+word-box pipeline', 'warn')
    prog?.(10, 'Canvas preprocessing...')
    log?.('Step 1: Canvas preprocessing')
    const canvas = canvasPrep(img, workCanvas)

    prog?.(20, 'Running full-image OCR...')
    log?.('Step 2: Full-image OCR + word boxes')
    const w = getWorker()
    await w.setParameters({ tessedit_pageseg_mode: '6' })
    const res = await w.recognize(canvas)
    const words = res.data.words.filter((w) => w.text.trim().length > 0 && w.confidence > 20)

    log?.(`${words.length} words detected`)
    if (!words.length) return { rows: [], stats: null, overlay: null }

    prog?.(85, 'Reconstructing table from word positions...')
    log?.('Step 3: Word-box table reconstruction')

    const table = wordboxTable(words, canvas.width, canvas.height)
    overlay = debugWords(words, canvas.width, canvas.height, img.width / canvas.width, previewCanvas, img)

    log?.(`Reconstructed: ${table.rows.length} rows x ${table.cols.length} cols`, 'ok')

    prog?.(92, 'Mapping columns...')
    rows = mapCols(table.cells, table, log)

    stats = {
      rows: rows.length,
      cols: table.cols.length - 1,
      conf: rows.length ? Math.round(rows.reduce((s, r) => s + r.conf, 0) / rows.length) : 0,
      mode: 'word-box',
    }
  }

  return { rows, stats, overlay }
}
