const API_URL = 'https://api.ocr.space/parse/image';

const getApiKey = () => import.meta.env.VITE_OCR_SPACE_KEY;

function normgrade(tok) {
  if (!tok) return null;
  const cleaned = tok.replace(/[^A-Z0-9+\[\]]/gi, '').toUpperCase();
  if (cleaned.length > 4) return null;
  const grades = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'E', 'F', 'I', 'X'];
  if (grades.includes(cleaned)) return cleaned;
  if (cleaned === '8') return 'B';
  if (cleaned === '[3]' || cleaned === 'I3I' || cleaned === 'L3L' || cleaned === '|3|') return 'B';
  if (cleaned.startsWith('B')) {
    if (cleaned.includes('+') || cleaned.includes('84') || cleaned.includes('8') || cleaned.includes('4')) {
      return 'B+';
    }
    return 'B';
  }
  if (cleaned.startsWith('A')) {
    if (cleaned.includes('+') || cleaned.includes('84') || cleaned.includes('8') || cleaned.includes('4')) {
      return 'A+';
    }
    return 'A';
  }
  if (cleaned.startsWith('C')) {
    if (cleaned.includes('+') || cleaned.includes('84') || cleaned.includes('8') || cleaned.includes('4')) {
      return 'C+';
    }
    return 'C';
  }
  return null;
}

function normcredits(tok) {
  if (!tok) return null;
  const cleaned = tok.replace(/[^0-9.,]/g, '');
  if (!cleaned) return null;
  const dotCleaned = cleaned.replace(',', '.');
  if (dotCleaned.includes('.')) {
    const val = parseFloat(dotCleaned);
    if (val > 0 && val <= 10) return val;
  }
  if (dotCleaned.startsWith('15')) {
    return 1.5;
  }
  const first = dotCleaned.charAt(0);
  const digit = parseInt(first, 10);
  if (digit >= 1 && digit <= 8) {
    return digit;
  }
  const val = parseFloat(dotCleaned);
  if (val > 0 && val <= 10) return val;
  return null;
}

function parseMarkdownTable(raw) {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith('|'));
  if (lines.length < 2) return [];

  const rows = lines.map(line => {
    const cells = line.split('|').map(c => c.trim());
    return cells.slice(1, -1).map(text => ({ text, conf: 88 }));
  });

  return rows.filter(row => !row.every(c => /^-+$/.test(c.text)));
}

function mapCols(grid) {
  let subjectColIdx = 1;
  let creditColIdx = 4;
  let gradeColIdx = 5;

  for (let r = 0; r < Math.min(grid.length, 3); r++) {
    const row = grid[r];
    const texts = row.map(c => c.text.toLowerCase());

    const hasSubject = texts.some(t => t.includes('subject') || t.includes('title') || t.includes('name') || t.includes('course'));
    const hasCredit = texts.some(t => t.includes('credit') || t.includes('cr'));
    const hasGrade = texts.some(t => t.includes('grade') || t.includes('gr'));

    if (hasSubject || hasCredit || hasGrade) {
      let sIdx = texts.findIndex(t => t.includes('name') || t.includes('title'));
      if (sIdx === -1) {
        sIdx = texts.findIndex(t => t.includes('subject') && !t.includes('code'));
      }
      if (sIdx === -1) {
        sIdx = texts.findIndex(t => t.includes('subject') || t.includes('course'));
      }
      const cIdx = texts.findIndex(t => t.includes('credit') || t.includes('cr'));
      const gIdx = texts.findIndex(t => t.includes('grade') || t.includes('gr'));

      if (sIdx !== -1) subjectColIdx = sIdx;
      if (cIdx !== -1) creditColIdx = cIdx;
      if (gIdx !== -1) gradeColIdx = gIdx;

      break;
    }
  }

  const rows = [];
  grid.forEach(row => {
    const texts = row.map(c => c.text.toLowerCase());
    const isHeader = texts.some(t => t.includes('subject') || t.includes('credit') || t.includes('grade') || t.includes('internal') || t.includes('external'));
    if (isHeader) return;

    const subject = row[subjectColIdx]?.text || '';
    const credits = row[creditColIdx]?.text || '';
    const grade = row[gradeColIdx]?.text || '';

    if (subject || credits || grade) {
      rows.push({ subject, credits, grade });
    }
  });

  return { rows };
}

function postprocess(rows) {
  const courseCodeRegex = /\b\d{2}[A-Z]{2,4}[-]?\d{2,3}\b/gi;
  const performanceLabels = /\b(Very Good|Outstanding|Excellent|Good|Average|Below Average|Fair|Poor|Pass|Fail|Absent|Incomplete)\b/gi;

  const subjects = [];
  rows.forEach(row => {
    const normGrade = normgrade(row.grade);
    const normCredit = normcredits(row.credits);

    if (normGrade && normCredit) {
      let cleanedName = row.subject.trim();
      cleanedName = cleanedName.replace(courseCodeRegex, '').trim();
      cleanedName = cleanedName.replace(performanceLabels, '').trim();
      cleanedName = cleanedName.replace(/[-,;:|]+$/, '').trim();
      cleanedName = cleanedName.replace(/\s{2,}/g, ' ').trim();

      if (cleanedName.length >= 3) {
        subjects.push({
          id: Date.now() + subjects.length,
          subject: cleanedName,
          credits: String(normCredit),
          grade: normGrade,
          isManual: false,
        });
      }
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

  const grid = parseMarkdownTable(rawText);

  if (!grid.length) throw new Error('OCR.space returned no table data. Try cropping tighter.');

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
