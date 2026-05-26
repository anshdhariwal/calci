export function cluster(arr, gap) {
  if (!arr.length) return []
  const s = [...arr].sort((a, b) => a - b)
  const c = [s[0]]
  for (let i = 1; i < s.length; i++) {
    if (s[i] - c[c.length - 1] > gap) c.push(s[i])
  }
  return c
}

function grid(mode, hy, vx, W, H) {
  const rows = [...hy]
  const cols = [...vx]
  if (rows[0] > H * 0.05) rows.unshift(0)
  if (rows[rows.length - 1] < H * 0.95) rows.push(H)
  if (cols[0] > W * 0.05) cols.unshift(0)
  if (cols[cols.length - 1] < W * 0.95) cols.push(W)
  return { mode, rows, cols, W, H }
}

function valleys(hist, len, thr) {
  const sm = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    let s = 0, n = 0
    for (let d = -4; d <= 4; d++) {
      if (hist[i + d] !== undefined) { s += hist[i + d]; n++ }
    }
    sm[i] = s / n
  }
  const out = [0]
  let inv = false
  for (let i = 1; i < len - 1; i++) {
    if (sm[i] < thr) {
      if (!inv) { out.push(i); inv = true }
    } else {
      inv = false
    }
  }
  out.push(len)
  return out
}

function projection(mat, W, H) {
  const data = mat.data
  const rh = new Float32Array(H)
  const rw = new Float32Array(W)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[y * W + x] < 128) { rh[y]++; rw[x]++ }
    }
  }
  for (let y = 0; y < H; y++) rh[y] /= W
  for (let x = 0; x < W; x++) rw[x] /= H
  return grid('projection', valleys(rh, H, 0.02), valleys(rw, W, 0.01), W, H)
}

export function detectTable(bin, scale, log) {
  const W = bin.cols, H = bin.rows

  const inv = new cv.Mat()
  cv.bitwise_not(bin, inv)

  const kh = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(Math.max(10, Math.round(W * 0.05)), 1))
  const kv = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, Math.max(10, Math.round(H * 0.05))))
  const hm = new cv.Mat(), vm = new cv.Mat()
  cv.morphologyEx(inv, hm, cv.MORPH_OPEN, kh)
  cv.morphologyEx(inv, vm, cv.MORPH_OPEN, kv)

  const hc = new cv.MatVector(), vc = new cv.MatVector(), hier = new cv.Mat()
  cv.findContours(hm, hc, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
  cv.findContours(vm, vc, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

  const hy = [], vx = []
  for (let i = 0; i < hc.size(); i++) {
    const r = cv.boundingRect(hc.get(i))
    if (r.width > W * 0.15) hy.push(r.y + r.height / 2)
  }
  for (let i = 0; i < vc.size(); i++) {
    const r = cv.boundingRect(vc.get(i))
    if (r.height > H * 0.04) vx.push(r.x + r.width / 2)
  }

  inv.delete(); kh.delete(); kv.delete(); hm.delete(); vm.delete()
  hc.delete(); vc.delete(); hier.delete()

  if (hy.length >= 3 && vx.length >= 2) {
    log?.('Mode A: grid lines')
    return grid('grid', cluster(hy, H * 0.02), cluster(vx, W * 0.02), W, H)
  }

  const clone = bin.clone()
  const ctrs = new cv.MatVector(), h2 = new cv.Mat()
  cv.findContours(clone, ctrs, h2, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE)
  clone.delete()

  const rects = []
  for (let i = 0; i < ctrs.size(); i++) {
    const r = cv.boundingRect(ctrs.get(i))
    if (r.width > W * 0.05 && r.width < W * 0.7 && r.height > H * 0.01 && r.height < H * 0.15) {
      rects.push(r)
    }
  }
  ctrs.delete(); h2.delete()

  if (rects.length >= 6) {
    const ys = cluster(rects.map((r) => r.y), H * 0.02).sort((a, b) => a - b)
    const xs = cluster(rects.map((r) => r.x), W * 0.02).sort((a, b) => a - b)
    if (ys.length >= 3 && xs.length >= 3) {
      log?.('Mode B: cell contours')
      return grid('contour', ys, xs, W, H)
    }
  }

  log?.('Mode C: whitespace projection', 'warn')
  return projection(bin, W, H)
}

export function wordboxTable(words, W, H) {
  const gap = H * 0.015
  words.sort((a, b) => (a.bbox.y0 + a.bbox.y1) / 2 - (b.bbox.y0 + b.bbox.y1) / 2)

  const groups = []
  for (const w of words) {
    const cy = (w.bbox.y0 + w.bbox.y1) / 2
    const last = groups[groups.length - 1]
    if (!last || cy - last.cy > gap) {
      groups.push({ cy, words: [w] })
    } else {
      last.words.push(w)
      last.cy = (last.cy * (last.words.length - 1) + cy) / last.words.length
    }
  }

  if (groups.length < 2) return { rows: [], cols: [], cells: [] }

  const xs = words.map((w) => w.bbox.x0)
  const snapped = [...new Set(xs.map((x) => Math.round(x / 5) * 5))].sort((a, b) => a - b)
  const bounds = cluster(snapped, W * 0.04)

  function col(x) {
    let best = 0, bd = Infinity
    bounds.forEach((cx, i) => {
      const d = Math.abs(x - cx)
      if (d < bd) { bd = d; best = i }
    })
    return best
  }

  const nc = bounds.length
  const cells = groups.map((rg) => {
    const row = Array.from({ length: nc }, () => ({ text: '', conf: 0, n: 0 }))
    for (const w of rg.words) {
      const ci = col(w.bbox.x0)
      if (row[ci].text) row[ci].text += ' '
      row[ci].text += w.text
      row[ci].conf = (row[ci].conf * row[ci].n + w.confidence) / (row[ci].n + 1)
      row[ci].n++
    }
    return row.map((c) => ({ text: c.text.trim(), conf: Math.round(c.conf) }))
  })

  const rows = groups.map((r) => r.cy)
  rows.unshift(0); rows.push(H)
  const cols = [...bounds]; cols.unshift(0); cols.push(W)

  return { rows, cols, cells }
}
