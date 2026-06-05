import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X, Download, Share2, Edit3, RefreshCw, Calculator, Sparkles, Zap, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { VALID_GRADES, GRADE_POINTS, calcSGPA } from '../engine/gradeUtils.js';
import { generateResultCard } from '../utils/imageGenerator.js';
import './Manual.css';

const ManualPage = () => {
  const [rows, setrows] = useState([
    { id: 0, subject: '', credits: '', grade: '', isManual: true }
  ]);
  const [sgpa, setsgpa] = useState(null);
  const [pop, setpop] = useState(false);
  const [name, setname] = useState('');
  const [nameErr, setnameErr] = useState(false);
  const [busy, setbusy] = useState(false);
  const [errors, seterrors] = useState({ credits: [], grades: [] });
  const [editingId, setEditingId] = useState(null);



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
    const creditErrs = [];
    const gradeErrs = [];
    const crPattern = /^\d+(\.\d{1,2})?$/;
    rows.forEach((r, idx) => {
      const cr = String(r.credits || '').trim();
      const gr = String(r.grade || '').trim();
      if (!cr || !crPattern.test(cr)) {
        creditErrs.push(idx);
      }
      if (!gr) {
        gradeErrs.push(idx);
      }
    });

    if (creditErrs.length > 0 || gradeErrs.length > 0) {
      seterrors({ credits: creditErrs, grades: gradeErrs });
      return;
    }

    seterrors({ credits: [], grades: [] });
    const score = calcSGPA(rows);
    setsgpa(score);
    setpop(true);

    const hasFailed = rows.some(r => {
      const g = String(r.grade || '').toUpperCase().trim();
      return GRADE_POINTS[g] === 0;
    });

    if (score >= 6.5 && !hasFailed) {
      fire(score);
    }
  };

  const addrow = () => {
    setrows(prev => [...prev, { id: Date.now(), subject: '', credits: '', grade: '', isManual: true }]);
    seterrors({ credits: [], grades: [] });
  };

  const delrow = (idx) => {
    if (rows.length === 1) return;
    setrows(prev => prev.filter((_, i) => i !== idx));
    seterrors({ credits: [], grades: [] });
  };

  const setrow = (idx, key, val) => {
    setrows(prev => prev.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));
    seterrors(prev => {
      const next = { ...prev };
      if (key === 'credits') next.credits = next.credits.filter(i => i !== idx);
      if (key === 'grade') next.grades = next.grades.filter(i => i !== idx);
      return next;
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
        await navigator.share({ files: [file], title: 'CALCI Result' });
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

  return (
    <section className="manual-page">
      <div className="manual-bg" aria-hidden="true">
        <div className="manual-grid" />
        <div className="manual-blob manual-blob-a" />
        <div className="manual-blob manual-blob-b" />
      </div>

      <div className="manual-wrap container">
        <div aria-hidden="true" className="manual-line" data-side="left"></div>
        <div aria-hidden="true" className="manual-line" data-side="right"></div>

        <div className="manual-copy">
          <div className="manual-badge">
            <Calculator size={12} />
            manual entry
          </div>
          <h1 className="manual-title">
            Direct input for{' '}
            <span className="manual-title-accent">precise control.</span>
          </h1>
          <p className="manual-sub">
            Enter your subjects, credits, and grades manually. Perfect for when you have your data ready or prefer typing over uploading.
          </p>

          <div className="manual-points">
            <div className="manual-point">
              <Sparkles size={18} />
              <span>Full control over every entry</span>
            </div>
            <div className="manual-point">
              <Zap size={18} />
              <span>Instant SGPA calculation</span>
            </div>
            <div className="manual-point">
              <ShieldCheck size={18} />
              <span>No image upload required</span>
            </div>
          </div>
        </div>

        <div className="manual-table-panel">
          <div className="manual-table-card">
            <div className="manual-card-head">
              <div className="manual-title-group">
                <h2 className="manual-card-title">Enter your grades</h2>
                <div className="manual-editable-badge">EDITABLE TABLE</div>
              </div>
              <button type="button" className="manual-btn-primary manual-header-calc-btn" onClick={oncalc}>
                Calculate SGPA
              </button>
            </div>

            <div className="manual-table-wrap">
              <div className="manual-table-head">
                <span className="mtc-num">#</span>
                <span className="mtc-subj">Subject</span>
                <span className="mtc-cr">Credits</span>
                <span className="mtc-grade">Grade</span>
                <span className="mtc-del">
                  <button type="button" className="manual-header-add-btn" onClick={addrow} title="Add subject">
                    <Plus size={16} strokeWidth={3.5} />
                  </button>
                </span>
              </div>

              <div className="manual-table-body">
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
                        className={`manual-row ${isFail ? 'is-failed-row' : ''}`}
                      >
                        <span className="mtc-num mrow-num">{i + 1}</span>

                        <div className="mtc-subj">
                          {editingId === `${i}_subj` ? (
                            <input
                              className="manual-cell-input manual-subj-input"
                              autoFocus
                              value={row.subject}
                              onChange={e => setrow(i, 'subject', e.target.value)}
                              onBlur={() => setEditingId(null)}
                              onKeyDown={e => e.key === 'Enter' && setEditingId(null)}
                            />
                          ) : (
                            <span 
                              className="manual-cell-text manual-subj-text" 
                              onClick={() => setEditingId(`${i}_subj`)} 
                              title="Click to edit"
                            >
                              {row.subject || <em className="manual-cell-placeholder">Click to add name</em>}
                            </span>
                          )}
                        </div>

                        <div className="mtc-cr">
                          <input
                            type="text"
                            className={`manual-cell-input manual-cr-input ${errors.credits.includes(i) ? 'is-invalid' : ''}`}
                            value={row.credits}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^(?:\d(?:\.\d{0,2})?)?$/.test(val)) {
                                setrow(i, 'credits', val);
                              }
                            }}
                            placeholder="0.0"
                          />
                        </div>

                        <div className="mtc-grade">
                          <select
                            className={`manual-cell-select manual-grade-select ${errors.grades.includes(i) ? 'is-invalid' : ''}`}
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

                        <div className="mtc-del">
                          <button 
                            className="manual-row-del-btn" 
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
          <div className="manual-overlay" onClick={() => setpop(false)}>
            <motion.div
              className="manual-modal-card"
              initial={{ opacity: 0, scale: 0.85, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="manual-modal-close" type="button" onClick={() => setpop(false)}>
                <X size={16} />
              </button>

              <div className="manual-modal-top">
                <div className="manual-modal-band-label" style={{ color: band.color }}>
                  {band.label}
                </div>
                <div className="manual-modal-sgpa-number" style={{ 
                  color: band.color,
                  textShadow: `0 0 40px ${band.color}40`
                }}>
                  {sgpa?.toFixed(2)}
                  <span className="manual-modal-sgpa-slash">/10</span>
                </div>
                <div className="manual-modal-sgpa-caption">Semester Grade Point Average</div>
                <p className="manual-modal-message">{band.msg}</p>
              </div>

              <div className="manual-modal-stats">
                <div className="manual-modal-stat">
                  <span className="manual-ms-label">Subjects</span>
                  <span className="manual-ms-val">{rows.length}</span>
                </div>
                <div className="manual-modal-stat">
                  <span className="manual-ms-label">Credits</span>
                  <span className="manual-ms-val">{passedCredits}</span>
                </div>
                <div className="manual-modal-stat">
                  <span className="manual-ms-label">Top Grade</span>
                  <span className="manual-ms-val" style={{ color: GRADE_COLORS[topGrade] || '#94a3b8' }}>
                    {topGrade || '-'}
                  </span>
                </div>
              </div>

              <div className="manual-modal-download-section">
                <label className="manual-modal-name-label">Your name (for download card)</label>
                <input
                  className={`manual-modal-name-input ${nameErr ? 'is-invalid shake' : ''}`}
                  type="text"
                  placeholder="Enter your name…"
                  value={name}
                  onChange={e => setname(e.target.value)}
                  maxLength={60}
                />
                <div className="manual-modal-action-row">
                  <button className="manual-modal-dl-btn" type="button" onClick={ondownload} disabled={busy}>
                    {busy ? <RefreshCw size={16} className="spin" /> : <Download size={16} />}
                    {busy ? 'Generating…' : 'Download'}
                  </button>
                  <button className="manual-modal-dl-btn manual-modal-share-btn" type="button" onClick={onshare} disabled={busy}>
                    <Share2 size={16} />
                    Share
                  </button>
                </div>
                <button className="manual-modal-recalc-btn" type="button" onClick={() => setpop(false)}>
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

export default ManualPage;
