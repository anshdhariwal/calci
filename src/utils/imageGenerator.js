import { GRADE_POINTS } from '../engine/gradeUtils.js';

const loadimg = (src) =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const gradecolor = (grade) => {
  const g = String(grade || '').toUpperCase().trim();
  if (g === 'O' || g === 'A+') return '#34d399';
  if (g === 'A') return '#60a5fa';
  if (g === 'B+') return '#a78bfa';
  if (g === 'B') return '#94a3b8';
  if (g === 'C+' || g === 'C') return '#fbbf24';
  if (g === 'D') return '#fb923c';
  if (GRADE_POINTS[g] === 0) return '#f87171';
  return '#e2e8f0';
};

export const generateResultCard = async (studentName, rows, sgpa) => {
  const list = rows.length ? rows : [{ subject: '', credits: '', grade: '' }];

  const subjectcount = list.filter(r => String(r.subject || '').trim()).length;
  const totalcredits = list.reduce((s, r) => s + (parseFloat(r.credits) || 0), 0);
  const topgrade = list.reduce((best, r) => {
    const g = String(r.grade || '').toUpperCase().trim();
    const b = String(best).toUpperCase().trim();
    return (GRADE_POINTS[g] ?? -1) > (GRADE_POINTS[b] ?? -1) ? g : best;
  }, '');

  const width = 1200;
  const rowh = 44;
  const headh = 46;
  const top = 135;
  const bottom = 60;
  const cardh = 72;
  const cardgap = 14;

  const tableh = headh + rowh * list.length;
  const statsh = 3 * cardh + 2 * cardgap + 20;
  const contenth = Math.max(tableh, statsh);
  const height = top + contenth + bottom;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const ls = (v) => {
    if ('letterSpacing' in ctx) ctx.letterSpacing = v;
  };

  ctx.fillStyle = '#0c0c0f';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.022)';
  for (let dx = 14; dx < width; dx += 28) {
    for (let dy = 14; dy < height; dy += 28) {
      ctx.beginPath();
      ctx.arc(dx, dy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = '#2a2a38';
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  const stripe = ctx.createLinearGradient(54, 0, width - 54, 0);
  stripe.addColorStop(0, 'rgba(59,130,246,0)');
  stripe.addColorStop(0.25, 'rgba(59,130,246,0.85)');
  stripe.addColorStop(0.75, 'rgba(139,92,246,0.85)');
  stripe.addColorStop(1, 'rgba(139,92,246,0)');
  ctx.fillStyle = stripe;
  ctx.fillRect(24, 24, width - 48, 3);

  let logo = null;
  try {
    logo = await loadimg('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgNDggNDgiPjxnIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iNCI+PHBhdGggZmlsbD0iIzJGODhGRiIgc3Ryb2tlPSIjMDAwIiBkPSJNNDEgMTMuOTk5N0wyNCA0TDcgMTMuOTk5N1YzMy45OTk4TDI0IDQ0TDQxIDMzLjk5OThWMTMuOTk5N1oiLz48cGF0aCBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZD0iTTE2IDE4Ljk5NzZMMjMuOTkzMiAyNC4wMDAyTDMxLjk5NTEgMTguOTk3NiIvPjxwYXRoIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBkPSJNMjQgMjRWMzMiLz48L2c+PC9zdmc+');
  } catch {
    logo = null;
  }
  if (logo) ctx.drawImage(logo, 54, 44, 30, 30);

  ctx.fillStyle = '#60a5fa';
  ctx.font = '700 18px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('CALCI', 92, 66);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '800 20px "Inter", sans-serif';
  ls('5px');
  ctx.textAlign = 'center';
  ctx.fillText('REPORT CARD', width / 2, 66);
  ls('0px');
  ctx.textAlign = 'left';

  ctx.textAlign = 'right';
  ctx.fillStyle = '#60a5fa';
  ctx.font = '800 30px "Inter", sans-serif';
  ctx.fillText(sgpa.toFixed(2), width - 54, 72);
  ctx.fillStyle = '#4b5563';
  ctx.font = '600 11px "JetBrains Mono", monospace';
  ls('2px');
  ctx.fillText('SGPA', width - 54, 90);
  ls('0px');
  ctx.textAlign = 'left';

  ctx.fillStyle = '#f1f5f9';
  ctx.font = '700 26px "Inter", sans-serif';
  ctx.fillText(studentName, 54, 112);

  const sep = ctx.createLinearGradient(54, 0, width - 54, 0);
  sep.addColorStop(0, 'rgba(96,165,250,0)');
  sep.addColorStop(0.3, 'rgba(96,165,250,0.45)');
  sep.addColorStop(0.7, 'rgba(96,165,250,0.45)');
  sep.addColorStop(1, 'rgba(96,165,250,0)');
  ctx.fillStyle = sep;
  ctx.fillRect(54, 125, width - 108, 1);

  const tablex = 54;
  const tablew = 780;
  const cols = [tablex, tablex + 48, tablex + 540, tablex + 660];

  ctx.fillStyle = '#13131a';
  ctx.fillRect(tablex, top, tablew, headh);
  ctx.strokeStyle = '#2a2a38';
  ctx.lineWidth = 1;
  ctx.strokeRect(tablex, top, tablew, headh);

  ctx.fillStyle = '#4b5563';
  ctx.font = '600 11px "JetBrains Mono", monospace';
  ls('1.5px');
  ctx.fillText('#', cols[0] + 10, top + 28);
  ctx.fillText('SUBJECT', cols[1] + 8, top + 28);
  ctx.fillText('CREDITS', cols[2] + 8, top + 28);
  ctx.fillText('GRADE', cols[3] + 8, top + 28);
  ls('0px');

  const trim = (s, n) => {
    const t = String(s || '');
    return t.length <= n ? t : t.slice(0, n - 3) + '...';
  };

  list.forEach((r, i) => {
    const y = top + headh + rowh * i;
    const g = String(r.grade || '').toUpperCase().trim();
    const isfail = g !== '' && GRADE_POINTS[g] === 0;
    const color = gradecolor(g);

    if (isfail) {
      ctx.fillStyle = '#2b1416';
      ctx.fillRect(tablex, y, tablew, rowh);
    }

    ctx.strokeStyle = isfail ? 'rgba(239,68,68,0.25)' : '#2a2a38';
    ctx.lineWidth = 1;
    ctx.strokeRect(tablex, y, tablew, rowh);

    ctx.fillStyle = color;
    ctx.fillRect(tablex, y, 3, rowh);

    ctx.fillStyle = '#4b5563';
    ctx.font = '500 12px "JetBrains Mono", monospace';
    ctx.fillText(String(i + 1), cols[0] + 10, y + 28);

    ctx.fillStyle = isfail ? '#fca5a5' : '#e2e8f0';
    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.fillText(trim(r.subject, 52), cols[1] + 8, y + 28);

    ctx.fillStyle = '#94a3b8';
    ctx.fillText(String(r.credits || ''), cols[2] + 8, y + 28);

    ctx.fillStyle = color;
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.fillText(g, cols[3] + 8, y + 28);
  });

  const divx = tablex + tablew + 22;
  const divtop = top;
  const divbot = top + contenth;
  const divgrad = ctx.createLinearGradient(0, divtop, 0, divbot);
  divgrad.addColorStop(0, 'rgba(42,42,56,0)');
  divgrad.addColorStop(0.15, 'rgba(42,42,56,1)');
  divgrad.addColorStop(0.85, 'rgba(42,42,56,1)');
  divgrad.addColorStop(1, 'rgba(42,42,56,0)');
  ctx.strokeStyle = divgrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(divx, divtop);
  ctx.lineTo(divx, divbot);
  ctx.stroke();

  const panelx = divx + 22;
  const panelw = width - 54 - panelx;
  const cardw = Math.min(190, panelw - 16);
  const cardx = panelx + Math.floor((panelw - cardw) / 2);
  const totalcardsh = 3 * cardh + 2 * cardgap;
  const cardsstarty = top + Math.floor((contenth - totalcardsh) / 2);

  const stats = [
    { label: 'SUBJECTS', value: String(subjectcount), color: '#e2e8f0' },
    { label: 'CREDITS', value: String(totalcredits), color: '#e2e8f0' },
    { label: 'TOP GRADE', value: topgrade || '-', color: gradecolor(topgrade) },
  ];

  stats.forEach((stat, i) => {
    const cy = cardsstarty + i * (cardh + cardgap);

    ctx.fillStyle = '#13131a';
    ctx.fillRect(cardx, cy, cardw, cardh);
    ctx.strokeStyle = '#2a2a38';
    ctx.lineWidth = 1;
    ctx.strokeRect(cardx, cy, cardw, cardh);

    const accentcolor = stat.label === 'TOP GRADE' ? stat.color : '#3b82f6';
    const accenthex = accentcolor.replace('#', '');
    const r = parseInt(accenthex.slice(0, 2), 16);
    const g = parseInt(accenthex.slice(2, 4), 16);
    const b = parseInt(accenthex.slice(4, 6), 16);
    const cardaccent = ctx.createLinearGradient(cardx, 0, cardx + cardw, 0);
    cardaccent.addColorStop(0, `rgba(${r},${g},${b},0)`);
    cardaccent.addColorStop(0.5, `rgba(${r},${g},${b},0.7)`);
    cardaccent.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = cardaccent;
    ctx.fillRect(cardx, cy, cardw, 2);

    ctx.fillStyle = '#4b5563';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ls('1.5px');
    ctx.textAlign = 'center';
    ctx.fillText(stat.label, cardx + cardw / 2, cy + 22);
    ls('0px');

    ctx.fillStyle = stat.color;
    ctx.font = '700 26px "Inter", sans-serif';
    ctx.fillText(stat.value, cardx + cardw / 2, cy + 54);
    ctx.textAlign = 'left';
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
  });
};
