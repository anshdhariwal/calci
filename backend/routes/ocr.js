const express = require('express');
const router = express.Router();
const multer = require('multer');
const Tesseract = require('tesseract.js');

// Store upload in memory (no disk writes needed)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Grade token regex — same logic as frontend ocrService.js
const gradeTokenRegex = /^(O|A\+|A|B\+|B|C\+|C|D|E|F|I|X)$/i;
const numericTokenRegex = /^\d+(\.\d+)?$/;
const headerTerms = ['subject', 'code', 'title', 'credit', 'grade', 'points', 'result'];

function parseOcrText(text) {
  const rawLines = text.split('\n');
  const lines = rawLines
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 0);

  const subjects = [];
  let idCounter = 1;

  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    const headerMatches = headerTerms.filter(term => lowerLine.includes(term));
    if (headerMatches.length >= 2) return;
    if (line.length < 8) return;

    const tokens = line.split(' ');
    if (tokens.length < 3) return;

    // Find grade token (right side)
    let gradeIndex = -1;
    for (let i = tokens.length - 1; i >= 0; i--) {
      const cleaned = tokens[i].replace(/[^A-Z+]/gi, '');
      if (gradeTokenRegex.test(cleaned)) { gradeIndex = i; break; }
    }
    if (gradeIndex === -1) return;

    // Find credit token
    let creditIndex = -1;
    for (let i = gradeIndex - 1; i >= 0; i--) {
      if (numericTokenRegex.test(tokens[i])) { creditIndex = i; break; }
    }
    if (creditIndex === -1) {
      for (let i = gradeIndex + 1; i < tokens.length; i++) {
        if (numericTokenRegex.test(tokens[i])) { creditIndex = i; break; }
      }
    }
    if (creditIndex === -1) return;

    const creditValue = parseFloat(tokens[creditIndex]);
    if (!Number.isFinite(creditValue) || creditValue <= 0 || creditValue > 10) return;

    const normalizedCredits = creditValue % 1 === 0 ? String(creditValue) : creditValue.toFixed(1);

    let gradeRaw = tokens[gradeIndex].toUpperCase().replace(/[^A-Z+]/g, '');
    if (!gradeRaw.endsWith('+')) {
      const plusNear = tokens[gradeIndex + 1] === '+' || tokens[gradeIndex - 1] === '+' || line.includes('+');
      if (plusNear && /^[A-D]$/i.test(gradeRaw)) gradeRaw = `${gradeRaw}+`;
    }
    if (!gradeTokenRegex.test(gradeRaw)) return;

    const nameTokens = tokens.filter((tok, idx) => {
      if (idx === gradeIndex || idx === creditIndex) return false;
      if (numericTokenRegex.test(tok)) return false;
      const cleaned = tok.replace(/[^A-Z+]/gi, '');
      if (gradeTokenRegex.test(cleaned)) return false;
      return true;
    });

    const name = nameTokens.join(' ').replace(/\s{2,}/g, ' ').trim().replace(/\||-/g, '');
    subjects.push({ id: idCounter++, name, credits: normalizedCredits, grade: gradeRaw, verified: false });
  });

  return subjects;
}

// POST /api/ocr
router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' });
  }

  try {
    const { data: { text } } = await Tesseract.recognize(req.file.buffer, 'eng');
    const subjects = parseOcrText(text);
    res.json({ subjects, rawText: text });
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ message: 'OCR processing failed', error: err.message });
  }
});

module.exports = router;
