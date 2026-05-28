/**
 * Post-OCR corrections for common Tesseract misreads.
 * Applied after column classification so we know which column is grade/credit/subject.
 */

const GRADE_FIXES = {
  '0': 'O',
  '8': 'B',
  '6': 'G',
  'l': 'I',
  '1': 'I',
  '|': 'I',
  '}': 'J',
  '{': 'C',
}

const CREDIT_FIXES = {
  'O': '0',
  'o': '0',
  'I': '1',
  'l': '1',
  '|': '1',
  'S': '5',
  's': '5',
  'B': '8',
  'b': '6',
  'G': '6',
  'g': '9',
  'Z': '2',
  'z': '2',
  'T': '7',
}

const GRADE_PATTERN = /^[A-Fa-fOoSsPpEeIi][+\-]?$|^[Ee][Xx]$|^[Aa][Bb]$/
const CREDIT_PATTERN = /^\d+(\.\d+)?$/

/**
 * Fix a grade string using common OCR misread table.
 * Returns { text, fixed } where fixed=true if a correction was applied.
 */
function fixGrade(raw) {
  const s = raw.trim()
  if (!s) return { text: s, fixed: false }
  if (GRADE_PATTERN.test(s)) return { text: s.toUpperCase(), fixed: false }

  // Try character-level substitution
  let fixed = ''
  let changed = false
  for (const ch of s) {
    if (GRADE_FIXES[ch]) {
      fixed += GRADE_FIXES[ch]
      changed = true
    } else {
      fixed += ch.toUpperCase()
    }
  }

  if (GRADE_PATTERN.test(fixed)) return { text: fixed, fixed: changed }

  // Strip non-alpha junk and retry
  const stripped = s.replace(/[^A-Za-z+\-]/g, '')
  if (GRADE_PATTERN.test(stripped)) return { text: stripped.toUpperCase(), fixed: true }

  return { text: s, fixed: false }
}

/**
 * Fix a credit string using common OCR misread table.
 */
function fixCredit(raw) {
  const s = raw.trim()
  if (!s) return { text: s, fixed: false }
  if (CREDIT_PATTERN.test(s)) return { text: s, fixed: false }

  // Try character-level substitution
  let fixed = ''
  let changed = false
  for (const ch of s) {
    if (CREDIT_FIXES[ch]) {
      fixed += CREDIT_FIXES[ch]
      changed = true
    } else {
      fixed += ch
    }
  }

  if (CREDIT_PATTERN.test(fixed)) return { text: fixed, fixed: changed }

  // Strip non-numeric junk and retry
  const stripped = s.replace(/[^\d.]/g, '')
  if (CREDIT_PATTERN.test(stripped)) return { text: stripped, fixed: true }

  return { text: s, fixed: false }
}

/**
 * Fix a subject string — merge broken words, strip junk.
 */
function fixSubject(raw) {
  let s = raw.trim()
  if (!s) return { text: s, fixed: false }

  const original = s
  // Remove leading/trailing non-alpha junk (except parentheses, hyphens, ampersands)
  s = s.replace(/^[^A-Za-z(]+/, '').replace(/[^A-Za-z)\d]+$/, '')
  // Collapse multiple spaces (from broken OCR words)
  s = s.replace(/\s{2,}/g, ' ')
  // Fix common subject OCR errors
  s = s.replace(/\bl\b/g, 'I')  // standalone lowercase L → I
  s = s.replace(/\b0f\b/gi, 'of')  // zero-f → of
  s = s.replace(/\bEng1neering\b/gi, 'Engineering')
  s = s.replace(/\bMathema tics\b/gi, 'Mathematics')
  s = s.replace(/\bPhy sics\b/gi, 'Physics')
  s = s.replace(/\bChemi stry\b/gi, 'Chemistry')
  // Merge single-space-broken words: "Mathe matics" → "Mathematics"
  // Only merge if both parts are >= 3 chars and result is a longer word
  s = s.replace(/([A-Za-z]{3,}) ([A-Za-z]{3,})/g, (match, a, b) => {
    // Check if merged version looks like a single word (no second capital)
    if (b[0] === b[0].toLowerCase()) return a + b
    return match
  })

  return { text: s, fixed: s !== original }
}

/**
 * Apply post-OCR corrections to all rows.
 * Each row: { subject, credits, grade, conf }
 * Returns rows with corrected values and adjusted confidence.
 */
export function postprocess(rows, log) {
  if (!rows || !rows.length) return rows

  let totalFixes = 0

  const corrected = rows.map((row) => {
    const sg = fixGrade(row.grade)
    const sc = fixCredit(row.credits)
    const ss = fixSubject(row.subject)

    const fixes = [sg.fixed, sc.fixed, ss.fixed].filter(Boolean).length
    totalFixes += fixes

    // Penalize confidence: each fix reduces confidence by 8 points
    const confPenalty = fixes * 8
    const newConf = Math.max(10, Math.round(row.conf - confPenalty))

    return {
      subject: ss.text,
      credits: sc.text,
      grade: sg.text,
      conf: newConf,
    }
  })

  if (totalFixes > 0) {
    log?.(`Post-OCR: applied ${totalFixes} correction(s) across ${rows.length} rows`, 'ok')
  }

  return corrected
}
