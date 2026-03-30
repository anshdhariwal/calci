import Tesseract from 'tesseract.js';

export const performOCR = async (imageFile) => {
  try {
    const result = await Tesseract.recognize(
      imageFile,
      'eng',
      { 
        logger: m => console.log(m), // Optional: log progress
      }
    );

    const text = result.data.text || '';
    console.log("OCR Text:", text);

    // Prefer structured lines from Tesseract if available
    const rawLines = Array.isArray(result.data.lines) && result.data.lines.length > 0
      ? result.data.lines.map(l => l.text || '')
      : text.split('\n');

    // Normalize spacing and drop empties
    const lines = rawLines
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(line => line.length > 0);

    const subjects = [];
    let idCounter = 1;

    // Explicitly ignore known header terms
    const headerTerms = ['subject', 'code', 'title', 'credit', 'grade', 'points', 'result'];
    const gradeTokenRegex = /^(O|A\+|A|B\+|B|C\+|C|D|E|F|I|X)$/i;
    const numericTokenRegex = /^\d+(\.\d+)?$/;
    
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();

      // Skip if line contains multiple header terms, likely a header row
      const headerMatches = headerTerms.filter(term => lowerLine.includes(term));
      if (headerMatches.length >= 2) {
        return; // Skip header row
      }

      // Skip lines that are too short to be a valid subject row
      if (line.length < 8) return;

      const tokens = line.split(' ');
      if (tokens.length < 3) return;

      // Find grade token (expect it near the right side)
      let gradeIndex = -1;
      for (let i = tokens.length - 1; i >= 0; i--) {
        const cleaned = tokens[i].replace(/[^A-Z+]/gi, '');
        if (gradeTokenRegex.test(cleaned)) {
          gradeIndex = i;
          break;
        }
      }
      if (gradeIndex === -1) return;

      // Find credit token: a pure number close to the grade
      let creditIndex = -1;
      for (let i = gradeIndex - 1; i >= 0; i--) {
        if (numericTokenRegex.test(tokens[i])) {
          creditIndex = i;
          break;
        }
      }
      // Some mark sheets might have grade then credit
      if (creditIndex === -1) {
        for (let i = gradeIndex + 1; i < tokens.length; i++) {
          if (numericTokenRegex.test(tokens[i])) {
            creditIndex = i;
            break;
          }
        }
      }
      if (creditIndex === -1) return;

      const creditValue = parseFloat(tokens[creditIndex]);
      if (!Number.isFinite(creditValue) || creditValue <= 0 || creditValue > 10) return;

      // Normalize credits: "1" and "1.0" should be the same downstream
      const normalizedCredits = creditValue % 1 === 0 ? String(creditValue) : creditValue.toFixed(1);

      // Normalize grade token
      let gradeRaw = tokens[gradeIndex].toUpperCase().replace(/[^A-Z+]/g, '');

      // If OCR split "+" into a separate token, recover it
      if (!gradeRaw.endsWith('+')) {
        const plusNear =
          tokens[gradeIndex + 1] === '+' ||
          tokens[gradeIndex - 1] === '+' ||
          line.includes('+');
        if (plusNear && /^[A-D]$/i.test(gradeRaw)) {
          gradeRaw = `${gradeRaw}+`;
        }
      }

      if (!gradeTokenRegex.test(gradeRaw)) return;

      // Subject name = everything except the chosen credit & grade tokens, minus obvious numeric-only tokens
      const nameTokens = tokens.filter((tok, idx) => {
        if (idx === gradeIndex || idx === creditIndex) return false;
        if (numericTokenRegex.test(tok)) return false; // avoid codes like "1.0" becoming name
        const cleaned = tok.replace(/[^A-Z+]/gi, '');
        if (gradeTokenRegex.test(cleaned)) return false;
        return true;
      });

      const name = nameTokens.join(' ').replace(/\s{2,}/g, ' ').trim().replace(/\||[-]/g, '');

      subjects.push({
        id: idCounter++,
        name,
        credits: normalizedCredits,
        grade: gradeRaw,
        verified: false
      });
    });

    if (subjects.length === 0) {
      // Fallback: Just return text as one big subject name? No.
      // Return 5 empty rows if nothing found.
      return [];
    }

    return subjects;

  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};
