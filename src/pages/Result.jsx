import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Download, Plus, Share2, Trash2, X, ZoomIn, ZoomOut, Edit3, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VALID_GRADES, GRADE_POINTS, calcSGPA } from '../engine/gradeUtils.js';
import './Result.css';

const ResultPage = () => {
  const loc = useLocation();
  const nav = useNavigate();
  const st = loc.state || {};
  const base = Array.isArray(st.rows) ? st.rows : [];
  const shot = typeof st.image === 'string' ? st.image : '';

  const [rows, setrows] = useState(base.map((r, idx) => ({
    id: r.id || Date.now() + idx,
    subject: r.subject || '',
    credits: r.credits || '',
    grade: r.grade || '',
    isManual: r.isManual !== undefined ? r.isManual : false, // Preserve OCR vs manual flag
  })));
  const [zoom, setzoom] = useState(1);
  const [pos, setpos] = useState({ x: 0, y: 0 });
  const [drag, setdrag] = useState(false);
  const [sgpa, setsgpa] = useState(null);
  const [note, setnote] = useState('');
  const [pop, setpop] = useState(false);
  const [name, setname] = useState('');
  const [nameErr, setnameErr] = useState(false);
  const [busy, setbusy] = useState(false);
  const [err, seterr] = useState('');
  const [errors, seterrors] = useState({ credits: [], grades: [] });
  const [editingId, setEditingId] = useState(null);

  const imgwrap = useRef(null);
  const dragref = useRef({ x: 0, y: 0, px: 0, py: 0 });

  useEffect(() => {
    setrows(base.map((r, idx) => ({
      id: r.id || Date.now() + idx,
      subject: r.subject || '',
      credits: r.credits || '',
      grade: r.grade || '',
      isManual: r.isManual !== undefined ? r.isManual : false,
    })));
  }, [st.rows]);

  if (!shot || base.length === 0) {
    return <Navigate to="/upload" replace />;
  }

  const clamp = (val, lim) => Math.max(-lim, Math.min(lim, val));

  const fitpos = (x, y, z) => {
    const wrap = imgwrap.current;
    if (!wrap) return { x, y };
    const rect = wrap.getBoundingClientRect();
    const maxx = (z - 1) * rect.width * 0.5;
    const maxy = (z - 1) * rect.height * 0.5;
    return { x: clamp(x, maxx), y: clamp(y, maxy) };
  };

  const onzoom = (val) => {
    const z = Math.max(1, Math.min(2.6, val));
    setzoom(z);
    setpos(p => fitpos(p.x, p.y, z));
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      const dx = e.clientX - dragref.current.px;
      const dy = e.clientY - dragref.current.py;
      const next = fitpos(dragref.current.x + dx, dragref.current.y + dy, zoom);
      setpos(next);
    };
    const up = () => setdrag(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [drag, zoom]);

  const tp = useRef({ d: 0, z: 1 })

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      tp.current = { d, z: zoom }
    }
  }

  const onTouchMove = (e) => {
    if (e.touches.length === 2 && tp.current.d > 0) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const factor = d / tp.current.d
      onzoom(tp.current.z * factor)
    }
  }

  const onTouchEnd = () => {
    tp.current = { d: 0, z: zoom }
  }

  useEffect(() => {
    const wrap = imgwrap.current
    if (!wrap) return
    const handleWheel = (e) => {
      e.preventDefault()
      const next = zoom + (e.deltaY < 0 ? 0.1 : -0.1)
      onzoom(next)
    }
    wrap.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      wrap.removeEventListener('wheel', handleWheel)
    }
  }, [zoom])

  const ondragstart = (e) => {
    if (zoom <= 1) return
    if (e.pointerType === 'touch' && !e.isPrimary) return
    setdrag(true)
    dragref.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y }
  };

  const scoremsg = (val) => {
    if (val >= 9) return 'Outstanding performance';
    if (val >= 8) return 'Very good result';
    if (val >= 7) return 'Solid, keep pushing';
    if (val >= 6) return 'Decent effort';
    return 'Time to grind harder';
  };

  const fire = (val) => {
    if (val >= 9) {
      confetti({ particleCount: 180, spread: 80, startVelocity: 45, origin: { y: 0.6 } });
      confetti({ particleCount: 120, spread: 120, startVelocity: 30, origin: { y: 0.4 } });
    } else if (val >= 8) {
      confetti({ particleCount: 120, spread: 70, startVelocity: 35, origin: { y: 0.65 } });
    } else if (val >= 7.5) {
      confetti({ particleCount: 70, spread: 55, startVelocity: 24, origin: { y: 0.7 } });
    } else {
      confetti({ particleCount: 35, spread: 45, startVelocity: 18, origin: { y: 0.75 }, colors: ['#f87171', '#fbbf24'] });
    }
  };

  const oncalc = () => {
    const creditErrs = []
    const gradeErrs = []
    const crPattern = /^\d+(\.\d{1,2})?$/
    rows.forEach((r, idx) => {
      const cr = String(r.credits || '').trim()
      const gr = String(r.grade || '').trim()
      if (!cr || !crPattern.test(cr)) {
        creditErrs.push(idx)
      }
      if (!gr) {
        gradeErrs.push(idx)
      }
    })

    if (creditErrs.length > 0 || gradeErrs.length > 0) {
      seterrors({ credits: creditErrs, grades: gradeErrs })
      return
    }

    seterrors({ credits: [], grades: [] })
    seterr('')
    const score = calcSGPA(rows)
    setsgpa(score)
    setnote(scoremsg(score))
    setpop(true)

    const hasFailed = rows.some(r => {
      const g = String(r.grade || '').toUpperCase().trim();
      return GRADE_POINTS[g] === 0;
    });

    if (score >= 6.5 && !hasFailed) {
      fire(score)
    }
  }

  const addrow = () => {
    setrows(prev => [...prev, { id: Date.now(), subject: '', credits: '', grade: '', isManual: true }])
    seterr('')
    seterrors({ credits: [], grades: [] })
  }

  const delrow = (idx) => {
    setrows(prev => prev.filter((_, i) => i !== idx))
    seterr('')
    seterrors({ credits: [], grades: [] })
  }

  const setrow = (idx, key, val) => {
    setrows(prev => prev.map((r, i) => (i === idx ? { ...r, [key]: val } : r)))
    seterr('')
    seterrors(prev => {
      const next = { ...prev }
      if (key === 'credits') next.credits = next.credits.filter(i => i !== idx)
      if (key === 'grade') next.grades = next.grades.filter(i => i !== idx)
      return next
    })
  }

  const loadimg = (src) => new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  const buildshot = async (who) => {
    const score = sgpa !== null ? sgpa : calcSGPA(rows);
    const list = rows.length ? rows : [{ subject: '', credits: '', grade: '' }];
    const width = 1200;
    const rowh = 44;
    const headh = 46;
    const top = 130;
    const bottom = 80;
    const height = top + headh + (rowh * list.length) + bottom;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0c0c0f';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#2a2a38';
    ctx.lineWidth = 1;
    ctx.strokeRect(24, 24, width - 48, height - 48);

    let logo = null;
    try {
      logo = await loadimg('/calci.svg');
    } catch (e) {
      logo = null;
    }

    if (logo) {
      ctx.drawImage(logo, 54, 48, 38, 38);
    }
    ctx.fillStyle = '#60a5fa';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText('CALCI', 100, 76);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 18px "Inter", sans-serif';
    ctx.fillText(who, 54, 108);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 13px "Inter", sans-serif';
    ctx.fillText('Report Card', 54, 128);

    ctx.fillStyle = '#60a5fa';
    ctx.font = '700 26px "Inter", sans-serif';
    ctx.fillText(String(score.toFixed(2)), width - 140, 84);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText('SGPA', width - 140, 104);

    const x = 54;
    const w = width - 108;
    const cols = [x, x + 60, x + 620, x + 780];

    ctx.fillStyle = '#13131a';
    ctx.fillRect(x, top, w, headh);
    ctx.strokeStyle = '#2a2a38';
    ctx.strokeRect(x, top, w, headh);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText('#', cols[0], top + 28);
    ctx.fillText('SUBJECT', cols[1], top + 28);
    ctx.fillText('CREDITS', cols[2], top + 28);
    ctx.fillText('GRADE', cols[3], top + 28);

    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#e2e8f0';

    const trim = (s, n) => {
      const t = String(s || '');
      if (t.length <= n) return t;
      return t.slice(0, Math.max(0, n - 3)) + '...';
    };

    list.forEach((r, i) => {
      const y = top + headh + (rowh * i);
      const g = String(r.grade || '').toUpperCase().trim();
      const isFail = GRADE_POINTS[g] === 0;

      if (isFail) {
        ctx.fillStyle = '#2b1416';
        ctx.fillRect(x, y, w, rowh);
        ctx.strokeStyle = '#ef4444';
      } else {
        ctx.strokeStyle = '#2a2a38';
      }
      ctx.strokeRect(x, y, w, rowh);

      if (isFail) {
        ctx.fillStyle = '#f87171';
      } else {
        ctx.fillStyle = '#e2e8f0';
      }
      ctx.fillText(String(i + 1), cols[0], y + 28);
      ctx.fillText(trim(r.subject, 36), cols[1], y + 28);
      ctx.fillText(String(r.credits || ''), cols[2], y + 28);
      ctx.fillText(String(r.grade || '').toUpperCase(), cols[3], y + 28);
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });
  };

  const ondownload = async () => {
    if (!name.trim()) {
      setnameErr(true);
      setTimeout(() => setnameErr(false), 500);
      return;
    }
    setbusy(true);
    const who = name.trim();
    const blob = await buildshot(who);
    if (!blob) {
      setbusy(false);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calci-result.jpg';
    a.click();
    URL.revokeObjectURL(url);
    setbusy(false);
  };

  const onshare = async () => {
    if (!name.trim()) {
      setnameErr(true);
      setTimeout(() => setnameErr(false), 500);
      return;
    }
    setbusy(true);
    const who = name.trim();
    const blob = await buildshot(who);
    if (!blob) {
      setbusy(false);
      return;
    }
    const file = new File([blob], 'calci-result.jpg', { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'CALCI Result' });
      } catch (e) {
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'calci-result.jpg';
      a.click();
      URL.revokeObjectURL(url);
    }
    setbusy(false);
  };

  const SGPA_BANDS = [
    { 
      min: 9,   
      max: 10.01,   
      label: 'Excellent!',          
      msg: 'Outstanding performance! You\'re at the top 🌟', 
      color: '#34d399'
    },
    { 
      min: 8,   
      max: 9,    
      label: 'Very Good',            
      msg: 'Great work! You\'re doing brilliantly 🚀',        
      color: '#60a5fa'
    },
    { 
      min: 7.5, 
      max: 8,    
      label: 'Good, Keep Going!',  
      msg: 'Good effort! Push a bit harder next time 💪',     
      color: '#a78bfa'
    },
    { 
      min: 0,   
      max: 7.5,  
      label: 'Needs More Work',     
      msg: 'Stay consistent and work smarter, you\'ve got this ⚡', 
      color: '#f97316'
    },
  ];

  const getBand = (val) => {
    return SGPA_BANDS.find(b => val >= b.min && val < b.max) || SGPA_BANDS[SGPA_BANDS.length - 1];
  };

  const getGradePoints = (g) => {
    const up = (g || '').toUpperCase().trim();
    return GRADE_POINTS[up] !== undefined ? GRADE_POINTS[up] : 0;
  };

  const GRADE_COLORS = { 
    'A+': '#34d399', 'A': '#60a5fa', 'B+': '#a78bfa', 'B': '#fbbf24',
    'C+': '#fb923c', 'C': '#f87171', 'D': '#94a3b8', 'E': '#ef4444', 
    'F': '#ef4444', 'I': '#64748b', 'X': '#64748b'
  };

  const totalCredits = rows.reduce((acc, r) => acc + (parseFloat(r.credits) || 0), 0);
  const passedCredits = rows.reduce((acc, r) => {
    const c = parseFloat(r.credits) || 0;
    const g = String(r.grade || '').toUpperCase().trim();
    return GRADE_POINTS[g] > 0 ? acc + c : acc;
  }, 0);
  const band = sgpa !== null ? getBand(sgpa) : SGPA_BANDS[3];
  const topGrade = rows.length > 0 
    ? rows.reduce((best, r) => getGradePoints(r.grade) > getGradePoints(best.grade) ? r : best, rows[0])?.grade || ''
    : '';

  return (
    <section className="result-page">
      <div className="result-bg" aria-hidden="true">
        <div className="result-grid" />
        <div className="result-blob result-blob-a" />
        <div className="result-blob result-blob-b" />
      </div>

      <div className="result-shell container">
        <div className="result-grid-layout">
          <div className="result-card result-media">
            <div className="result-card-head">
              <h2 className="result-title">Match your table</h2>
              <div className="result-hint">Pinch to zoom, drag to pan</div>
            </div>
            <div
              className={`result-media-frame ${zoom > 1 ? 'is-zoom' : ''}`}
              ref={imgwrap}
              onPointerDown={ondragstart}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onDragStart={(e) => e.preventDefault()}
            >
              <div className="reference-badge">REFERENCE IMAGE</div>
              <img
                src={shot}
                alt="Result reference"
                className="result-image"
                style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})` }}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
            </div>
          </div>

          <div className="result-card result-table">
            <div className="result-card-head">
              <div className="result-title-group">
                <h2 className="result-title">Verify subjects</h2>
                <div className="editable-badge">EDITABLE TABLE</div>
              </div>
              <button type="button" className="result-btn-primary header-calc-btn" onClick={oncalc}>
                Calculate SGPA
              </button>
            </div>

            <div className="result-table-wrap">
              <div className="result-table-head">
                <span className="rtc-num">#</span>
                <span className="rtc-subj">Subject</span>
                <span className="rtc-cr">Credits</span>
                <span className="rtc-grade">Grade</span>
                <span className="rtc-del">
                  <button type="button" className="header-add-btn" onClick={addrow} title="Add subject">
                    <Plus size={16} strokeWidth={3.5} />
                  </button>
                </span>
              </div>

              <div className="result-table-body">
                <AnimatePresence mode="popLayout">
                  {rows.map((row, i) => {
                    const g = String(row.grade || '').toUpperCase().trim();
                    const isFail = GRADE_POINTS[g] === 0;

                    return (
                      <motion.div
                        key={row.id}
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.95 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 500, 
                          damping: 35,
                          mass: 0.5
                        }}
                        layout
                        className={`result-row ${isFail ? 'is-failed-row' : ''} ${row.isManual ? 'row-lowconf' : ''}`}
                      >
                        <span className="rtc-num rrow-num">{i + 1}</span>

                        <div className="rtc-subj">
                          {editingId === `${i}_subj` ? (
                            <input
                              className="cell-input subj-input"
                              autoFocus
                              value={row.subject}
                              onChange={e => setrow(i, 'subject', e.target.value)}
                              onBlur={() => setEditingId(null)}
                              onKeyDown={e => e.key === 'Enter' && setEditingId(null)}
                            />
                          ) : (
                            <span 
                              className="cell-text subj-text" 
                              onClick={() => setEditingId(`${i}_subj`)} 
                              title="Click to edit"
                            >
                              {row.subject || <em className="cell-placeholder">Click to add name</em>}
                            </span>
                          )}
                        </div>

                        <div className="rtc-cr">
                          <input
                            type="text"
                          className={`cell-input cr-input ${errors.credits.includes(i) ? 'is-invalid' : ''}`}
                          value={row.credits}
                          onChange={(e) => {
                            const val = e.target.value
                            if (/^(?:\d(?:\.\d{0,2})?)?$/.test(val)) {
                              setrow(i, 'credits', val)
                            }
                          }}
                          placeholder="0.0"
                        />
                      </div>

                      <div className="rtc-grade">
                        <select
                          className={`cell-select grade-select ${errors.grades.includes(i) ? 'is-invalid' : ''}`}
                          value={row.grade}
                          onChange={e => setrow(i, 'grade', e.target.value)}
                          style={{ '--gc': GRADE_COLORS[row.grade?.toUpperCase()] || '#94a3b8' }}
                        >
                          <option value="">?</option>
                          {VALID_GRADES.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>

                      <div className="rtc-del">
                        <button 
                          className="row-del-btn" 
                          type="button" 
                          onClick={() => delrow(i)}
                          title="Delete row"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {pop && (
          <div className="result-overlay" onClick={() => setpop(false)}>
            <motion.div
              className="modal-card"
              initial={{ opacity: 0, scale: 0.85, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="modal-close" type="button" onClick={() => setpop(false)}>
                <X size={16} />
              </button>

              <div className="modal-top">
                <div className="modal-band-label" style={{ color: band.color }}>
                  {band.label}
                </div>
                <div className="modal-sgpa-number" style={{ 
                  color: band.color,
                  textShadow: `0 0 40px ${band.color}40`
                }}>
                  {sgpa?.toFixed(2)}
                  <span className="modal-sgpa-slash">/10</span>
                </div>
                <div className="modal-sgpa-caption">Semester Grade Point Average</div>
                <p className="modal-message">{band.msg}</p>
              </div>

              <div className="modal-stats">
                <div className="modal-stat">
                  <span className="ms-label">Subjects</span>
                  <span className="ms-val">{rows.length}</span>
                </div>
                <div className="modal-stat">
                  <span className="ms-label">Credits</span>
                  <span className="ms-val">{passedCredits}</span>
                </div>
                <div className="modal-stat">
                  <span className="ms-label">Top Grade</span>
                  <span className="ms-val" style={{ color: GRADE_COLORS[topGrade] || '#94a3b8' }}>
                    {topGrade || '-'}
                  </span>
                </div>
              </div>

              <div className="modal-download-section">
                <label className="modal-name-label">Your name (for download card)</label>
                <input
                  className={`modal-name-input ${nameErr ? 'is-invalid shake' : ''}`}
                  type="text"
                  placeholder="Enter your name…"
                  value={name}
                  onChange={e => setname(e.target.value)}
                  maxLength={60}
                />
                <div className="modal-action-row">
                  <button className="modal-dl-btn" type="button" onClick={ondownload} disabled={busy}>
                    {busy ? <RefreshCw size={16} className="spin" /> : <Download size={16} />}
                    {busy ? 'Generating…' : 'Download'}
                  </button>
                  <button className="modal-dl-btn modal-share-btn" type="button" onClick={onshare} disabled={busy}>
                    <Share2 size={16} />
                    Share
                  </button>
                </div>
                <button className="modal-recalc-btn" type="button" onClick={() => setpop(false)}>
                  <Edit3 size={15} />
                  Edit & Recalculate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default ResultPage;
