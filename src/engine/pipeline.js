import { cvOk, loadCV } from './opencv-loader.js'
import { initTess, getWorker, setWorkerParams } from './tesseract-init.js'
import { detectTable, wordboxTable } from './detect.js'
import { mapCols } from './classify.js'
import { postprocess } from './postprocess.js'

// ─── PREPROCESSING (OpenCV pipeline) ────────────────────────

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

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
  src.delete()

  // --- CLAHE: normalize uneven lighting from camera flash/shadows ---
  let enhanced = gray
  try {
    const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8))
    enhanced = new cv.Mat()
    clahe.apply(gray, enhanced)
    gray.delete()
    clahe.delete()
  } catch (e) {
    // CLAHE binding may be unavailable in some OpenCV.js builds
    enhanced = gray
  }

  // --- Bilateral filter: smooth noise while preserving text edges ---
  const blur = new cv.Mat()
  try {
    cv.bilateralFilter(enhanced, blur, 9, 75, 75)
  } catch (e) {
    // bilateralFilter can fail on some WASM builds; fall back to gaussian
    cv.GaussianBlur(enhanced, blur, new cv.Size(3, 3), 0)
  }
  enhanced.delete()

  // --- Adaptive threshold with dynamic blockSize ---
  const thresh = new cv.Mat()
  const blockSize = Math.max(11, (Math.round(Math.min(w, h) / 80) | 1) % 2 === 0
    ? Math.round(Math.min(w, h) / 80) + 1
    : Math.round(Math.min(w, h) / 80))
  cv.adaptiveThreshold(blur, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, blockSize, 6)
  blur.delete()

  // --- Morphological close: reconnect broken text strokes from JPEG compression ---
  try {
    const closeKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2))
    cv.morphologyEx(thresh, thresh, cv.MORPH_CLOSE, closeKernel)
    closeKernel.delete()
  } catch (e) {}

  // --- Deskew ---
  const fixed = deskew(thresh, w, h)
  if (fixed !== thresh) thresh.delete()

  return { bin: fixed, canvas: wc, scale }
}

// ─── DESKEW + PERSPECTIVE CORRECTION ─────────────────────────

function deskew(mat, w, h) {
  try {
    const lines = new cv.Mat()
    cv.HoughLinesP(mat, lines, 1, Math.PI / 180, 80, 50, 10)
    if (lines.rows === 0) { lines.delete(); return mat }

    const angles = []
    const weights = []
    for (let i = 0; i < lines.rows; i++) {
      const d = lines.data32S
      const dx = d[i * 4 + 2] - d[i * 4]
      const dy = d[i * 4 + 3] - d[i * 4 + 1]
      const a = Math.atan2(dy, dx) * 180 / Math.PI
      const len = Math.sqrt(dx * dx + dy * dy)
      if (Math.abs(a) < 45) {
        angles.push(a)
        weights.push(len)
      }
    }
    lines.delete()
    if (!angles.length) return mat

    // Weighted median: sort by angle, find the angle where cumulative weight passes 50%
    const pairs = angles.map((a, i) => ({ a, w: weights[i] })).sort((x, y) => x.a - y.a)
    const totalWeight = weights.reduce((s, w) => s + w, 0)
    let cumWeight = 0
    let med = pairs[0].a
    for (const p of pairs) {
      cumWeight += p.w
      if (cumWeight >= totalWeight / 2) { med = p.a; break }
    }

    // Lowered threshold from 0.5 to 0.3 degrees
    if (Math.abs(med) < 0.3) return mat

    const cx = mat.cols / 2, cy = mat.rows / 2
    const M = cv.getRotationMatrix2D(new cv.Point(cx, cy), med, 1.0)
    const rot = new cv.Mat()
    cv.warpAffine(mat, rot, M, new cv.Size(mat.cols, mat.rows), cv.INTER_LINEAR, cv.BORDER_REPLICATE)
    M.delete()

    // Perspective correction if angle is significant (> 2 degrees)
    if (Math.abs(med) > 2) {
      try {
        return perspectiveCorrect(rot, w, h)
      } catch (e) {
        return rot
      }
    }

    return rot
  } catch (e) {
    return mat
  }
}

/**
 * Attempt perspective correction by finding the largest quad contour
 * and warping it to a rectangle.
 */
function perspectiveCorrect(mat, w, h) {
  const inv = new cv.Mat()
  cv.bitwise_not(mat, inv)

  const dk = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(10, 10))
  const dilated = new cv.Mat()
  cv.dilate(inv, dilated, dk)

  const ctrs = new cv.MatVector()
  const hier = new cv.Mat()
  cv.findContours(dilated, ctrs, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

  let bestContour = null
  let bestArea = 0

  for (let i = 0; i < ctrs.size(); i++) {
    const area = cv.contourArea(ctrs.get(i))
    if (area > bestArea && area > w * h * 0.15) {
      bestContour = ctrs.get(i)
      bestArea = area
    }
  }

  inv.delete(); dk.delete(); dilated.delete(); hier.delete()

  if (!bestContour) {
    ctrs.delete()
    return mat
  }

  const peri = cv.arcLength(bestContour, true)
  const approx = new cv.Mat()
  cv.approxPolyDP(bestContour, approx, 0.02 * peri, true)
  ctrs.delete()

  if (approx.rows !== 4) {
    approx.delete()
    return mat
  }

  // Order points: top-left, top-right, bottom-right, bottom-left
  const pts = []
  for (let i = 0; i < 4; i++) {
    pts.push({ x: approx.data32S[i * 2], y: approx.data32S[i * 2 + 1] })
  }
  approx.delete()

  pts.sort((a, b) => a.y - b.y)
  const top = pts.slice(0, 2).sort((a, b) => a.x - b.x)
  const bottom = pts.slice(2, 4).sort((a, b) => a.x - b.x)
  const ordered = [top[0], top[1], bottom[1], bottom[0]]

  const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2,
    ordered.flatMap(p => [p.x, p.y]))
  const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2,
    [0, 0, w, 0, w, h, 0, h])

  const M = cv.getPerspectiveTransform(srcPts, dstPts)
  const warped = new cv.Mat()
  cv.warpPerspective(mat, warped, M, new cv.Size(w, h))

  srcPts.delete(); dstPts.delete(); M.delete()
  mat.delete()

  return warped
}

// ─── CELL OCR (per-cell with upscaling) ──────────────────────

const MIN_CELL_HEIGHT = 60

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

      // Upscale small cells for better OCR accuracy
      const upscale = ch < MIN_CELL_HEIGHT ? Math.ceil(MIN_CELL_HEIGHT / ch) : 1
      tmp.width = cw * upscale
      tmp.height = ch * upscale

      const ctx = tmp.getContext('2d')
      if (upscale > 1) {
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
      }
      ctx.drawImage(canvas, x, y, cw, ch, 0, 0, tmp.width, tmp.height)

      // Dynamic PSM: tall cells (multi-line) use PSM 6, short cells use PSM 7
      const cellPSM = ch > 80 ? '6' : '7'
      try {
        await w.setParameters({ tessedit_pageseg_mode: cellPSM })
        const res = await w.recognize(tmp)
        row.push({ text: res.data.text.trim().replace(/\s+/g, ' '), conf: res.data.confidence })
      } catch (e) {
        row.push({ text: '', conf: 0 })
      }
    }
    table.push(row)
    prog?.(40 + Math.round((r / nr) * 40), `OCR row ${r + 1}/${nr}...`)
  }
  return table
}

/**
 * Two-pass OCR: re-OCR grade and credit columns with targeted whitelists.
 */
async function twoPassOcr(raw, det, colMap, canvas, log) {
  if (!colMap) return raw

  const w = getWorker()
  const { rows, cols } = det
  const nr = rows.length - 1
  const pad = 3

  const GRADE_WHITELIST = 'ABCDEFGHIOPSabcdefghiops+-'
  const CREDIT_WHITELIST = '0123456789.'

  const targets = [
    { col: colMap.grade, whitelist: GRADE_WHITELIST, label: 'grade' },
    { col: colMap.credits, whitelist: CREDIT_WHITELIST, label: 'credit' },
  ]

  for (const target of targets) {
    if (target.col < 0 || target.col >= (cols.length - 1)) continue

    await setWorkerParams({
      tessedit_pageseg_mode: '7',
      tessedit_char_whitelist: target.whitelist,
    })

    log?.(`Two-pass: re-OCR ${target.label} column (col ${target.col}) with whitelist`)

    for (let r = 0; r < nr; r++) {
      if (!raw[r] || !raw[r][target.col]) continue

      const x = Math.round(cols[target.col]) + pad
      const y = Math.round(rows[r]) + pad
      const cw = Math.max(4, Math.round(cols[target.col + 1]) - Math.round(cols[target.col]) - pad * 2)
      const ch = Math.max(4, Math.round(rows[r + 1]) - Math.round(rows[r]) - pad * 2)

      const tmp = document.createElement('canvas')
      const upscale = ch < MIN_CELL_HEIGHT ? Math.ceil(MIN_CELL_HEIGHT / ch) : 1
      tmp.width = cw * upscale
      tmp.height = ch * upscale
      const ctx = tmp.getContext('2d')
      if (upscale > 1) {
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
      }
      ctx.drawImage(canvas, x, y, cw, ch, 0, 0, tmp.width, tmp.height)

      try {
        const res = await w.recognize(tmp)
        const newText = res.data.text.trim().replace(/\s+/g, ' ')
        const newConf = res.data.confidence

        // Only replace if new result is higher confidence
        if (newConf > raw[r][target.col].conf || raw[r][target.col].conf < 60) {
          raw[r][target.col] = { text: newText, conf: newConf }
        }
      } catch (e) {}
    }
  }

  // Reset worker params
  await setWorkerParams(null)
  return raw
}

// ─── CANVAS FALLBACK (Pipeline B) ────────────────────────────

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

  // --- Adaptive Otsu-style threshold ---
  // Step 1: Build grayscale histogram
  const hist = new Uint32Array(256)
  const grayArr = new Uint8Array(w * h)
  for (let i = 0; i < d.length; i += 4) {
    const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
    grayArr[i / 4] = g
    hist[g]++
  }

  // Step 2: Otsu threshold
  const total = w * h
  let sumAll = 0
  for (let i = 0; i < 256; i++) sumAll += i * hist[i]

  let sumBg = 0, wBg = 0, maxVar = 0, otsuThresh = 128
  for (let t = 0; t < 256; t++) {
    wBg += hist[t]
    if (wBg === 0) continue
    const wFg = total - wBg
    if (wFg === 0) break
    sumBg += t * hist[t]
    const mBg = sumBg / wBg
    const mFg = (sumAll - sumBg) / wFg
    const between = wBg * wFg * (mBg - mFg) * (mBg - mFg)
    if (between > maxVar) { maxVar = between; otsuThresh = t }
  }

  // Step 3: Adaptive local contrast enhancement in 64x64 tiles
  const tileSize = 64
  for (let ty = 0; ty < h; ty += tileSize) {
    for (let tx = 0; tx < w; tx += tileSize) {
      const tw = Math.min(tileSize, w - tx)
      const th = Math.min(tileSize, h - ty)

      // Find local min/max in this tile
      let lMin = 255, lMax = 0
      for (let ly = 0; ly < th; ly++) {
        for (let lx = 0; lx < tw; lx++) {
          const g = grayArr[(ty + ly) * w + (tx + lx)]
          if (g < lMin) lMin = g
          if (g > lMax) lMax = g
        }
      }

      const range = lMax - lMin || 1
      for (let ly = 0; ly < th; ly++) {
        for (let lx = 0; lx < tw; lx++) {
          const idx = ((ty + ly) * w + (tx + lx)) * 4
          const g = grayArr[(ty + ly) * w + (tx + lx)]
          // Stretch contrast locally
          const v = Math.min(255, Math.max(0, ((g - lMin) / range) * 255))
          d[idx] = d[idx + 1] = d[idx + 2] = Math.round(v)
          d[idx + 3] = 255
        }
      }
    }
  }

  // Step 4: Unsharp mask (sharpen)
  ctx.putImageData(id, 0, 0)

  // Create blurred copy for sharpening
  const blurC = document.createElement('canvas')
  blurC.width = w; blurC.height = h
  const blurCtx = blurC.getContext('2d')
  blurCtx.filter = 'blur(1.5px)'
  blurCtx.drawImage(c, 0, 0)

  const sharpId = ctx.getImageData(0, 0, w, h)
  const blurId = blurCtx.getImageData(0, 0, w, h)
  const sd = sharpId.data, bd = blurId.data

  const amount = 1.5
  for (let i = 0; i < sd.length; i += 4) {
    sd[i]     = Math.min(255, Math.max(0, sd[i]     + amount * (sd[i]     - bd[i])))
    sd[i + 1] = Math.min(255, Math.max(0, sd[i + 1] + amount * (sd[i + 1] - bd[i + 1])))
    sd[i + 2] = Math.min(255, Math.max(0, sd[i + 2] + amount * (sd[i + 2] - bd[i + 2])))
  }
  ctx.putImageData(sharpId, 0, 0)

  wc.width = w; wc.height = h
  wc.getContext('2d').drawImage(c, 0, 0)
  return c
}

// ─── DEBUG OVERLAYS ──────────────────────────────────────────

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

// ─── MAIN PIPELINE ───────────────────────────────────────────

export async function run(img, { log, prog, previewCanvas, workCanvas }) {
  await initTess(log, prog)
  await loadCV(log)

  let rows, stats, overlay

  if (cvOk()) {
    prog?.(5, 'Preprocessing image...')
    log?.('Step 1: OpenCV preprocessing (CLAHE + bilateral + adaptive threshold)')
    const { bin, canvas, scale } = preprocess(img, workCanvas)

    prog?.(25, 'Detecting table...')
    log?.('Step 2: Table detection (with region isolation)')
    const det = detectTable(bin, scale, log)
    log?.(`Mode: ${det.mode}  ${det.rows.length} rows x ${det.cols.length} cols`, 'ok')

    overlay = debugOverlay(det, scale, previewCanvas, img)
    try { bin.delete() } catch (e) {}

    prog?.(35, 'Extracting cells (with upscaling)...')
    log?.('Step 3: Cell OCR (dynamic PSM, upscaling)')
    let raw = await ocrGrid(det, canvas, prog)

    prog?.(80, 'Mapping columns...')
    log?.('Step 4: Column mapping')
    const { rows: mappedRows, colMap } = mapCols(raw, det, log)

    // Two-pass OCR with whitelists if column mapping succeeded
    if (colMap) {
      prog?.(85, 'Two-pass OCR with whitelists...')
      log?.('Step 5: Two-pass OCR (grade + credit whitelists)')
      raw = await twoPassOcr(raw, det, colMap, canvas, log)
      // Re-map after two-pass
      const { rows: remapped } = mapCols(raw, det, log)
      rows = remapped
    } else {
      rows = mappedRows
    }

    // Post-OCR corrections
    prog?.(92, 'Post-OCR corrections...')
    log?.('Step 6: Post-OCR error correction')
    rows = postprocess(rows, log)

    stats = {
      rows: rows.length,
      cols: (det.cols.length - 1) || raw[0]?.length || 0,
      conf: rows.length ? Math.round(rows.reduce((s, r) => s + r.conf, 0) / rows.length) : 0,
      mode: det.mode,
    }
  } else {
    log?.('OpenCV unavailable, running canvas+word-box pipeline', 'warn')
    prog?.(10, 'Canvas preprocessing (adaptive contrast + sharpen)...')
    log?.('Step 1: Canvas preprocessing (Otsu + local contrast + unsharp mask)')
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

    prog?.(90, 'Mapping columns...')
    const { rows: mappedRows } = mapCols(table.cells, table, log)

    // Post-OCR corrections
    prog?.(95, 'Post-OCR corrections...')
    log?.('Step 4: Post-OCR error correction')
    rows = postprocess(mappedRows, log)

    stats = {
      rows: rows.length,
      cols: table.cols.length - 1,
      conf: rows.length ? Math.round(rows.reduce((s, r) => s + r.conf, 0) / rows.length) : 0,
      mode: 'word-box',
    }
  }

  return { rows, stats, overlay }
}
