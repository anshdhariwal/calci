const API_URL = 'https://api.ocr.space/parse/image';

const getApiKey = () => import.meta.env.VITE_OCR_SPACE_KEY;

function normgrade(tok) {
  if (!tok) return null;
  const raw = tok.trim();

  if (/^(qualified|pass|absent|ab|na|n\/a|detained|withheld)$/i.test(raw)) return null;

  const cleaned = raw.replace(/[^A-Z0-9+\[\]|]/gi, '').toUpperCase();
  if (!cleaned || cleaned.length > 4) return null;

  const grades = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'E', 'F', 'I', 'X'];
  if (grades.includes(cleaned)) return cleaned;


  if (cleaned === '8') return 'B';
  if (cleaned === '[3]' || cleaned === 'I3I' || cleaned === 'L3L') return 'B';

  if (cleaned.startsWith('B')) {
    if (cleaned.includes('+') || /[84]/.test(cleaned.slice(1))) return 'B+';
    return 'B';
  }
  if (cleaned.startsWith('A')) {
    if (cleaned.includes('+') || /[84]/.test(cleaned.slice(1))) return 'A+';
    return 'A';
  }
  if (cleaned.startsWith('C')) {
    if (cleaned.includes('+') || /[84]/.test(cleaned.slice(1))) return 'C+';
    return 'C';
  }
  return null;
}

function normcredits(tok) {
  if (!tok) return null;
  const cleaned = tok.replace(/[^0-9.,]/g, '');
  if (!cleaned) return null;
  const dotted = cleaned.replace(',', '.');
  if (dotted === '15') return 1.5;
  const val = parseFloat(dotted);
  if (isNaN(val) || val <= 0 || val > 10) return null;
  return val;
}

function parseMarkdownTable(raw) {
  const allLines = raw.split(/\r?\n/).map(l => l.trim());

  const joined = [];
  for (const line of allLines) {
    if (line.startsWith('|')) {
      joined.push(line);
    } else if (joined.length > 0 && line.length > 0) {
      joined[joined.length - 1] += ' ' + line;
    }
  }

  if (joined.length < 2) return [];

  const parsed = joined.map(line => {
    let clean = line;
    if (!clean.endsWith('|')) clean += '|';
    const cells = clean.split('|').map(c => c.trim());
    return cells.slice(1, -1).map(text => ({ text, conf: 88 }));
  });

  const rows = parsed.filter(row =>
    row.length > 0 && !row.every(c => /^[-:]+$/.test(c.text) || c.text === '')
  );

  if (rows.length < 2) return [];

  const maxCols = Math.max(...rows.map(r => r.length));
  for (const row of rows) {
    while (row.length < maxCols) row.push({ text: '', conf: 0 });
  }

  return rows;
}

function detectHeader(grid) {
  for (let r = 0; r < Math.min(grid.length, 3); r++) {
    const texts = grid[r].map(c => (c.text || '').toLowerCase());
    const hit = texts.some(t =>
      /subject|course|paper|name|title/.test(t) ||
      /credit/.test(t) ||
      /\bgrade\b/.test(t)
    );
    if (hit) return r;
  }
  return -1;
}

function mapCols(grid) {
  if (!grid.length) return { rows: [] };

  const colCount = grid[0].length;
  const headerIdx = detectHeader(grid);

  let subCol = -1, crCol = -1, grCol = -1;

  if (headerIdx >= 0) {
    const h = grid[headerIdx].map(c => (c.text || '').toLowerCase());

    let s = h.findIndex(t => /\bname\b|\btitle\b/.test(t));
    if (s === -1) s = h.findIndex(t => /subject/.test(t) && !/code/.test(t));
    if (s === -1) s = h.findIndex(t => /subject|course|paper/.test(t));

    const cr = h.findIndex(t => /credit/.test(t));
    const gr = h.findIndex(t => /\bgrade\b/.test(t));

    if (s !== -1) subCol = s;
    if (cr !== -1) crCol = cr;
    if (gr !== -1) grCol = gr;
  }

  const dataStart = headerIdx >= 0 ? headerIdx + 1 : 0;
  const scores = Array.from({ length: colCount }, () => ({
    grade: 0, credit: 0, text: 0, empty: 0, total: 0
  }));

  for (let r = dataStart; r < grid.length; r++) {
    for (let c = 0; c < colCount; c++) {
      const val = (grid[r][c]?.text || '').trim();
      scores[c].total++;
      if (!val) { scores[c].empty++; continue; }
      if (normgrade(val) !== null) scores[c].grade++;
      if (normcredits(val) !== null) scores[c].credit++;
      if (/[a-zA-Z]{2,}/.test(val) && val.length > 4) scores[c].text++;
    }
  }

  const pick = (type, exclude) => {
    let best = -1, top = 0;
    for (let c = 0; c < colCount; c++) {
      if (exclude.has(c)) continue;
      const filled = scores[c].total - scores[c].empty;
      if (filled === 0) continue;
      const ratio = scores[c][type] / filled;
      if (ratio > top) { top = ratio; best = c; }
    }
    return top >= 0.3 ? best : -1;
  };

  const used = new Set([subCol, crCol, grCol].filter(x => x >= 0));

  if (grCol === -1) { grCol = pick('grade', used); if (grCol >= 0) used.add(grCol); }
  if (crCol === -1) { crCol = pick('credit', used); if (crCol >= 0) used.add(crCol); }
  if (subCol === -1) {
    let best = -1, top = 0;
    for (let c = 0; c < colCount; c++) {
      if (used.has(c)) continue;
      const filled = scores[c].total - scores[c].empty;
      if (filled === 0) continue;
      const ratio = scores[c].text / filled;
      if (ratio > top) { top = ratio; best = c; }
    }
    if (best >= 0) { subCol = best; used.add(best); }
  }

  if (subCol === -1 || crCol === -1 || grCol === -1) return { rows: [] };

  const rows = [];
  for (let r = dataStart; r < grid.length; r++) {
    const row = grid[r];
    const subject = (row[subCol]?.text || '').trim();
    const credits = (row[crCol]?.text || '').trim();
    const grade = (row[grCol]?.text || '').trim();
    if (!subject && !credits && !grade) continue;
    rows.push({ subject, credits, grade });
  }

  return { rows };
}

function postprocess(rows) {
  const courseCodeRegex = /\b\d{2}[A-Z]{2,4}[-\s]?\d{2,3}\b/gi;
  const perfLabels = /\b(Very Good|Outstanding|Excellent|Good|Average|Below Average|Fair|Poor|Pass|Fail|Absent|Incomplete|Qualified)\b/gi;

  const subjects = [];
  rows.forEach(row => {
    const ng = normgrade(row.grade);
    const nc = normcredits(row.credits);

    if (ng && nc) {
      let name = row.subject.trim();
      name = name.replace(courseCodeRegex, '').trim();
      name = name.replace(perfLabels, '').trim();
      name = name.replace(/[-,;:|]+$/, '').trim();
      name = name.replace(/\s{2,}/g, ' ').trim();

      subjects.push({
        id: Date.now() + subjects.length,
        subject: name,
        credits: String(nc),
        grade: ng,
        isManual: false,
      });
    }
  });

  return subjects;
}


export async function runOcrSpace(imageDataUrl, apiKey) {
  const form = new FormData();
  form.append('base64Image', imageDataUrl);
  form.append('language', 'eng');
  form.append('isTable', 'true');
  form.append('detectOrientation', 'true');
  form.append('scale', 'true');
  form.append('OCREngine', '3');
  form.append('isOverlayRequired', 'false');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: { apikey: apiKey },
      body: form,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    throw new Error('Network error reaching OCR.space. Check your internet connection.');
  }

  if (!response.ok) {
    throw new Error(`OCR.space HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.IsErroredOnProcessing) {
    const msg = data.ParsedResults?.[0]?.ErrorMessage || data.ErrorMessage || 'Unknown error';
    throw new Error(`OCR.space error: ${msg}`);
  }

  const rawText = data.ParsedResults?.[0]?.ParsedText || '';
  
  console.log('========== RAW OCR.SPACE OUTPUT ==========');
  console.log(rawText);

  const noText = !rawText.trim() || rawText.includes('*[No text detected]*');
  if (noText) throw new Error('No text detected in the image. Try a clearer photo.');

  const grid = parseMarkdownTable(rawText);

  if (!grid.length) throw new Error('Could not parse table structure. Try cropping tighter around the grade table.');

  const { rows } = mapCols(grid);
  const corrected = postprocess(rows);

  return corrected;
}

export const performOCR = async (imageFile) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OCR API Key is missing. This is a temporary setup error.');
  }

  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  return await runOcrSpace(base64, apiKey);
};
