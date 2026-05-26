const GRADE = /^[A-Fa-fOoSsPpEe][+\-]?$|^[Ee][Xx]$|^[Aa][Bb]$|^[Ss][Gg]$|^[Ff]$/
const CREDIT = /^\d+(\.\d+)?$/
const SUBJ = /[A-Za-z]{2,}/

export function classify(t) {
  const s = t.trim()
  if (GRADE.test(s)) return 'grade'
  if (CREDIT.test(s)) return 'credit'
  if (SUBJ.test(s)) return 'subject'
  return 'other'
}

function isHeader(row) {
  if (!row) return false
  return row.some((c) => /subj|course|credit|grade|mark|paper|name|sl|no/i.test(c.text || ''))
}

export function mapCols(raw, det, log) {
  if (!raw || raw.length < 2) return []

  const nc = raw[0].length
  const score = Array.from({ length: nc }, () => ({ subject: 0, credit: 0, grade: 0, other: 0 }))

  for (let r = 1; r < raw.length; r++) {
    for (let c = 0; c < nc; c++) {
      const cell = raw[r][c]
      if (cell) score[c][classify(cell.text)]++
    }
  }

  let sc = -1, cc = -1, gc = -1, sm = 0, cm = 0, gm = 0
  for (let c = 0; c < nc; c++) {
    if (score[c].subject > sm) { sm = score[c].subject; sc = c }
    if (score[c].credit > cm) { cm = score[c].credit; cc = c }
    if (score[c].grade > gm) { gm = score[c].grade; gc = c }
  }

  if (sc === -1 || cc === -1 || gc === -1) {
    const h = raw[0].map((c) => (c.text || '').toLowerCase())
    h.forEach((t, i) => {
      if (/subj|course|paper|name/.test(t) && sc === -1) sc = i
      if (/credit|unit|hr/.test(t) && cc === -1) cc = i
      if (/grade|mark|point|gp/.test(t) && gc === -1) gc = i
    })
  }

  if (sc === -1 || cc === -1 || gc === -1) {
    for (let c = 0; c < nc; c++) {
      const s = score[c]
      const dom = ['subject', 'credit', 'grade', 'other'].reduce((a, b) => (s[a] >= s[b] ? a : b))
      if (dom === 'subject' && sc === -1) sc = c
      else if (dom === 'credit' && cc === -1) cc = c
      else if (dom === 'grade' && gc === -1) gc = c
    }
  }

  if (sc === -1 || cc === -1 || gc === -1) {
    log?.(`Column map failed S:${sc} Cr:${cc} G:${gc}`, 'warn')
    return []
  }
  log?.(`Column map Subject:${sc} Credits:${cc} Grade:${gc}`, 'ok')

  const start = isHeader(raw[0]) ? 1 : 0
  const out = []
  for (let r = start; r < raw.length; r++) {
    const row = raw[r]
    const subject = (row[sc]?.text || '').trim()
    const credits = (row[cc]?.text || '').trim()
    const grade = (row[gc]?.text || '').trim()
    const conf = Math.round(((row[sc]?.conf || 0) + (row[cc]?.conf || 0) + (row[gc]?.conf || 0)) / 3)
    if (!subject && !grade) continue
    out.push({ subject, credits, grade, conf })
  }

  return out
}
