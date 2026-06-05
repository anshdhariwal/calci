import Tesseract from 'tesseract.js';

function preprocessForTable(imageFile) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      let scale = 1.5;
      if (img.naturalWidth < 1000) {
        scale = 2.0;
      } else if (img.naturalWidth > 2000) {
        scale = 2000 / img.naturalWidth;
      }
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        const binary = gray < 140 ? 0 : 255;
        data[i] = data[i+1] = data[i+2] = binary;
      }
      
      ctx.putImageData(imageData, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

function reconstructTable(words, rowTolerance = 10) {
  if (!words || words.length === 0) return [];
  
  const sorted = [...words].sort((a, b) =>
    (a.bbox.y0 + a.bbox.y1) / 2 - (b.bbox.y0 + b.bbox.y1) / 2
  );
  
  const rows = [];
  let currentRow = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const prevMidY = (sorted[i-1].bbox.y0 + sorted[i-1].bbox.y1) / 2;
    const currMidY = (sorted[i].bbox.y0 + sorted[i].bbox.y1) / 2;
    
    if (Math.abs(currMidY - prevMidY) <= rowTolerance) {
      currentRow.push(sorted[i]);
    } else {
      rows.push(currentRow);
      currentRow = [sorted[i]];
    }
  }
  rows.push(currentRow);
  
  return rows.map(row =>
    row
      .sort((a, b) => a.bbox.x0 - b.bbox.x0)
      .map(w => w.text)
      .join(' ')
  );
}

export const performOCR = async (imageFile) => {
  try {
    const preprocessedCanvas = await preprocessForTable(imageFile);
    
    const result = await Tesseract.recognize(
      preprocessedCanvas,
      'eng',
      { 
        logger: m => console.log(m),
        tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+().&/,- ',
        tessedit_enable_doc_dict: '0',
        load_system_dawg: '0',
        load_freq_dawg: '0',
        load_punc_dawg: '0',
        load_number_dawg: '0',
      }
    );

    console.log('========== RAW TESSERACT OUTPUT ==========');
    console.log(result.data.text);
    console.log('==========================================');
    
    let lines = [];
    if (result.data.words && result.data.words.length > 0) {
      const reconstructedLines = reconstructTable(result.data.words, 10);
      lines = reconstructedLines
        .map(line => line.replace(/\s+/g, ' ').trim())
        .filter(line => line.length > 0);
    } else {
      const text = result.data.text || '';
      lines = text.split('\n')
        .map(line => line.replace(/\s+/g, ' ').trim())
        .filter(line => line.length > 0);
    }

    const subjects = [];

    const headerTerms = ['subject', 'code', 'title', 'credit', 'grade', 'points', 'result'];
    const gradeTokenRegex = /^(O|A\+|A|B\+|B|C\+|C|D|E|F|I|X)$/i;
    const numericTokenRegex = /^\d+(\.\d+)?$/;
    const courseCodeRegex = /\b\d{2}[A-Z]{2,4}[-]?\d{2,3}\b/gi;
    const performanceLabels = /\b(Very Good|Outstanding|Excellent|Good|Average|Below Average|Fair|Poor|Pass|Fail|Absent|Incomplete)\b/gi;
    
    let pendingSubjectParts = [];
    
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();

      const headerMatches = headerTerms.filter(term => lowerLine.includes(term));
      if (headerMatches.length >= 2) {
        pendingSubjectParts = [];
        return;
      }

      if (line.length < 3) return;

      const tokens = line.split(' ');

      let gradeIndex = -1;
      for (let i = tokens.length - 1; i >= 0; i--) {
        const cleaned = tokens[i].replace(/[^A-Z+]/gi, '');
        if (gradeTokenRegex.test(cleaned)) {
          gradeIndex = i;
          break;
        }
      }

      let creditIndex = -1;
      if (gradeIndex !== -1) {
        for (let i = gradeIndex - 1; i >= 0; i--) {
          if (numericTokenRegex.test(tokens[i])) {
            creditIndex = i;
            break;
          }
        }
        if (creditIndex === -1) {
          for (let i = gradeIndex + 1; i < tokens.length; i++) {
            if (numericTokenRegex.test(tokens[i])) {
              creditIndex = i;
              break;
            }
          }
        }
      }

      if (gradeIndex !== -1 && creditIndex !== -1) {
        const creditValue = parseFloat(tokens[creditIndex]);
        if (!Number.isFinite(creditValue) || creditValue <= 0 || creditValue > 10) {
          pendingSubjectParts = [];
          return;
        }

        const normalizedCredits = creditValue % 1 === 0 ? String(creditValue) : creditValue.toFixed(1);

        let gradeRaw = tokens[gradeIndex].toUpperCase().replace(/[^A-Z+]/g, '');

        if (!gradeRaw.endsWith('+')) {
          const plusNear =
            tokens[gradeIndex + 1] === '+' ||
            tokens[gradeIndex - 1] === '+' ||
            line.includes('+');
          if (plusNear && /^[A-D]$/i.test(gradeRaw)) {
            gradeRaw = `${gradeRaw}+`;
          }
        }

        if (!gradeTokenRegex.test(gradeRaw)) {
          pendingSubjectParts = [];
          return;
        }

        const nameTokens = tokens.filter((tok, idx) => {
          if (idx === gradeIndex || idx === creditIndex) return false;
          if (numericTokenRegex.test(tok)) return false;
          const cleaned = tok.replace(/[^A-Z+]/gi, '');
          if (gradeTokenRegex.test(cleaned)) return false;
          return true;
        });

        const currentLineName = nameTokens.join(' ').replace(/\s{2,}/g, ' ').trim().replace(/\||[-]/g, '');
        const fullName = [...pendingSubjectParts, currentLineName].join(' ').trim();

        let cleanedName = fullName;
        cleanedName = cleanedName.replace(courseCodeRegex, '').trim();
        cleanedName = cleanedName.replace(performanceLabels, '').trim();
        cleanedName = cleanedName.replace(/\s{2,}/g, ' ').trim();
        cleanedName = cleanedName.replace(/[-,;:]+$/, '').trim();
        
        if (cleanedName.length >= 3) {
          subjects.push({
            id: Date.now() + subjects.length,
            subject: cleanedName,
            credits: normalizedCredits,
            grade: gradeRaw,
            isManual: false,
          });
        }

        pendingSubjectParts = [];
      } else {
        const cleanLine = line.replace(/\||[-]/g, '').trim();
        if (cleanLine.length > 0) {
          pendingSubjectParts.push(cleanLine);
        }
      }
    });

    if (subjects.length === 0) {
      return [];
    }

    return subjects;

  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};
