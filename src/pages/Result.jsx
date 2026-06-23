import { useEffect, useRef, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Download, Plus, Share2, Trash2, X, Edit3, RefreshCw, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VALID_GRADES, GRADE_POINTS, calcSGPA } from '../engine/gradeUtils.js';
import { generateResultCard } from '../utils/imageGenerator.js';
import './Result.css';

const ResultPage = () => {
  const loc = useLocation();
  const st = loc.state || {};
  const base = Array.isArray(st.rows) ? st.rows : [];
  const shot = typeof st.image === 'string' ? st.image : '';

  const [rows, setrows] = useState(base.map((r, idx) => ({
    id: r.id !== undefined ? r.id : idx,
    subject: r.subject || '',
    credits: r.credits || '',
    grade: r.grade || '',
    isManual: r.isManual !== undefined ? r.isManual : false,
  })));
  const [zoom, setzoom] = useState(1);
  const [pos, setpos] = useState({ x: 0, y: 0 });
  const [drag, setdrag] = useState(false);
  const [sgpa, setsgpa] = useState(null);
  const [pop, setpop] = useState(false);
  const [name, setname] = useState('');
  const [nameErr, setnameErr] = useState(false);
  const [busy, setbusy] = useState(false);
  const [errors, seterrors] = useState({ credits: [], grades: [] });
  const [editingId, setEditingId] = useState(null);

  const imgwrap = useRef(null);
  const dragref = useRef({ x: 0, y: 0, px: 0, py: 0 });


  const clamp = (val, lim) => Math.max(-lim, Math.min(lim, val));

  const fitpos = useCallback((x, y, z) => {
    const wrap = imgwrap.current;
    if (!wrap) return { x, y };
    const rect = wrap.getBoundingClientRect();
    const img = wrap.querySelector('.result-image');
    if (!img || !img.naturalWidth || !img.naturalHeight) {
      const maxx = (z - 1) * rect.width * 0.5;
      const maxy = (z - 1) * rect.height * 0.5;
      return { x: clamp(x, maxx), y: clamp(y, maxy) };
    }
    const ar = img.naturalWidth / img.naturalHeight;
    const cw = rect.width;
    const ch = rect.height;
    let w = cw;
    let h = ch;
    if (cw / ch > ar) {
      w = ch * ar;
    } else {
      h = cw / ar;
    }
    const zw = w * z;
    const zh = h * z;
    const maxx = zw > cw ? (zw - cw) * 0.5 : 0;
    const maxy = zh > ch ? (zh - ch) * 0.5 : 0;
    return { x: clamp(x, maxx), y: clamp(y, maxy) };
  }, []);

  const onzoom = (val) => {
    const z = Math.max(1, Math.min(2.86, val));
    setzoom(z);
    setpos(p => fitpos(p.x, p.y, z));
  };

  const zoomRef = useRef(zoom);
  const onzoomRef = useRef(onzoom);

  useEffect(() => {
    zoomRef.current = zoom;
    onzoomRef.current = onzoom;
  });

  useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      const dx = e.clientX - dragref.current.px;
      const dy = e.clientY - dragref.current.py;
      const next = fitpos(dragref.current.x + dx, dragref.current.y + dy, zoomRef.current);
      setpos(next);
    };
    const up = () => setdrag(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [drag, fitpos]);

  const tp = useRef({ d: 0, z: 1 });

  useEffect(() => {
    const wrap = imgwrap.current;
    if (!wrap) return;

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        setdrag(false);
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        tp.current = { d, z: zoomRef.current };
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && tp.current.d > 0) {
        e.preventDefault();
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = d / tp.current.d;
        if (onzoomRef.current) {
          onzoomRef.current(tp.current.z * factor);
        }
      } else if (e.touches.length === 1 && zoomRef.current > 1) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        tp.current = { d: 0, z: zoomRef.current };
      }
    };

    wrap.addEventListener('touchstart', handleTouchStart, { passive: false });
    wrap.addEventListener('touchmove', handleTouchMove, { passive: false });
    wrap.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      wrap.removeEventListener('touchstart', handleTouchStart);
      wrap.removeEventListener('touchmove', handleTouchMove);
      wrap.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    const wrap = imgwrap.current;
    if (!wrap) return;
    const handleWheel = (e) => {
      e.preventDefault();
      const next = zoomRef.current + (e.deltaY < 0 ? 0.1 : -0.1);
      if (onzoomRef.current) {
        onzoomRef.current(next);
      }
    };
    wrap.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      wrap.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const ondragstart = (e) => {
    if (zoomRef.current <= 1) return;
    if (e.pointerType === 'touch' && !e.isPrimary) return;
    setdrag(true);
    dragref.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
  };

  const fire = (val) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const countMultiplier = isMobile ? 0.3 : 0.5;

    if (val >= 9) {
      confetti({ particleCount: Math.round(120 * countMultiplier), spread: 60, startVelocity: 35, origin: { y: 0.65 } });
      confetti({ particleCount: Math.round(80 * countMultiplier), spread: 80, startVelocity: 25, origin: { y: 0.55 } });
    } else if (val >= 8) {
      confetti({ particleCount: Math.round(90 * countMultiplier), spread: 55, startVelocity: 30, origin: { y: 0.65 } });
    } else if (val >= 7.5) {
      confetti({ particleCount: Math.round(60 * countMultiplier), spread: 45, startVelocity: 22, origin: { y: 0.7 } });
    } else {
      confetti({ particleCount: Math.round(30 * countMultiplier), spread: 35, startVelocity: 16, origin: { y: 0.75 }, colors: ['#f87171', '#fbbf24'] });
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
    const score = calcSGPA(rows)
    setsgpa(score)
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
    seterrors({ credits: [], grades: [] })
  }

  const delrow = (idx) => {
    setrows(prev => prev.filter((_, i) => i !== idx))
    seterrors({ credits: [], grades: [] })
  }

  const setrow = (idx, key, val) => {
    setrows(prev => prev.map((r, i) => (i === idx ? { ...r, [key]: val } : r)))
    seterrors(prev => {
      const next = { ...prev }
      if (key === 'credits') next.credits = next.credits.filter(i => i !== idx)
      if (key === 'grade') next.grades = next.grades.filter(i => i !== idx)
      return next
    })
  }

  const ondownload = async () => {
    if (!name.trim()) {
      setnameErr(true);
      setTimeout(() => setnameErr(false), 500);
      return;
    }
    setbusy(true);
    const who = name.trim();
    const score = sgpa !== null ? sgpa : calcSGPA(rows);
    const blob = await generateResultCard(who, rows, score);
    if (!blob) {
      setbusy(false);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `calci-result-${who.toLowerCase().replace(/\s+/g, '-')}.jpg`;
    a.download = filename;
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
    const score = sgpa !== null ? sgpa : calcSGPA(rows);
    const blob = await generateResultCard(who, rows, score);
    if (!blob) {
      setbusy(false);
      return;
    }
    const filename = `calci-result-${who.toLowerCase().replace(/\s+/g, '-')}.jpg`;
    const file = new File([blob], filename, { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'CALCI Result',
          text: 'Hi, i calculated my SGPA using CALCI in seconds !!, you can do the same with anshdhariwal.github.io/calci/'
        });
      } catch {
        void 0;
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
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

  const passedCredits = rows.reduce((acc, r) => {
    const c = parseFloat(r.credits) || 0;
    const g = String(r.grade || '').toUpperCase().trim();
    return GRADE_POINTS[g] > 0 ? acc + c : acc;
  }, 0);
  const band = sgpa !== null ? getBand(sgpa) : SGPA_BANDS[3];
  const topGrade = rows.length > 0 
    ? rows.reduce((best, r) => getGradePoints(r.grade) > getGradePoints(best.grade) ? r : best, rows[0])?.grade || ''
    : '';

  if (!shot || base.length === 0) {
    return <Navigate to="/upload" replace />;
  }

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
              <h2 className="result-title">Verify</h2>
              <div className="result-hint">Pinch to zoom, drag to pan</div>
            </div>
            <div
              className={`result-media-frame ${zoom > 1 ? 'is-zoom' : ''}`}
              ref={imgwrap}
              onPointerDown={ondragstart}
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
                <h2 className="result-title">Double check results</h2>
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
                          disabled={rows.length === 1}
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
                <a 
                  className="modal-star-btn" 
                  href="https://github.com/anshdhariwal/calci" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Star size={15} fill="#fbbf24" stroke="#fbbf24" />
                  Star us on GitHub
                </a>
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
