import { useEffect, useRef, useState, useCallback } from 'react';
import { Image, ShieldCheck, Sparkles, Zap, ArrowLeft, RotateCw, RotateCcw, FlipHorizontal, Maximize, RefreshCw, X } from 'lucide-react';
import { Cropper } from 'react-advanced-cropper';
import { useNavigate, Link } from 'react-router-dom';
import { performOCR } from '../engine/ocrService.js';
import 'react-advanced-cropper/dist/style.css';
import './Upload.css';

const makehash = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16);
};

const formatWait = (ms) => {
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.ceil((ms % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const getfp = () => {
  const parts = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    navigator.hardwareConcurrency || 0,
    new Date().getTimezoneOffset()
  ];
  return makehash(parts.join('|'));
};

const getstate = () => {
  let raw = localStorage.getItem('calci_usr_state');
  if (!raw) {
    const cookies = document.cookie.split(';');
    const cookie = cookies.find(c => c.trim().startsWith('calci_usr_state='));
    if (cookie) {
      raw = decodeURIComponent(cookie.split('=')[1]);
    }
  }
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
};

const savestate = (state) => {
  const str = JSON.stringify(state);
  try {
    localStorage.setItem('calci_usr_state', str);
  } catch {
    void 0;
  }
  const exp = new Date();
  exp.setTime(exp.getTime() + (365 * 24 * 60 * 60 * 1000));
  document.cookie = `calci_usr_state=${encodeURIComponent(str)};expires=${exp.toUTCString()};path=/`;
};

const checklimit = () => {
  const now = Date.now();
  let state = getstate();
  const fp = getfp();
  if (!state) {
    state = { fp, uid: Math.random().toString(36).substring(2) + now.toString(36), scans: [] };
  }
  state.scans = state.scans.filter(t => now - t < 86400000);
  savestate(state);
  if (state.scans.length >= 5) {
    const oldest = state.scans[0];
    const wait = 86400000 - (now - oldest);
    return { ok: false, wait };
  }
  return { ok: true, wait: 0 };
};

const addscan = () => {
  const now = Date.now();
  let state = getstate();
  const fp = getfp();
  if (!state) {
    state = { fp, uid: Math.random().toString(36).substring(2) + now.toString(36), scans: [] };
  }
  state.scans.push(now);
  state.scans = state.scans.filter(t => now - t < 86400000);
  savestate(state);
};

const UploadPage = () => {
  const navigate = useNavigate();
  const fref = useRef(null);
  const cropref = useRef(null);
  const [file, setfile] = useState(null);
  const [prev, setprev] = useState('');
  const [drag, setdrag] = useState(false);
  const [err, seterr] = useState('');
  const [cropmode, setcropmode] = useState(false);
  const [busy, setbusy] = useState(false);
  const [scanError, setScanError] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingShot, setPendingShot] = useState('');
  const [toast, setToast] = useState('');
  const toastTimeoutRef = useRef(null);
  const [lim, setLim] = useState(() => checklimit());

  const pref = useRef(null);

  const getcenter = (el) => {
    const { width, height } = el.getBoundingClientRect();
    return [width / 2, height / 2];
  };

  const getedge = (el, x, y) => {
    const [cx, cy] = getcenter(el);
    const dx = x - cx;
    const dy = y - cy;
    let kx = Infinity;
    let ky = Infinity;
    if (dx !== 0) kx = cx / Math.abs(dx);
    if (dy !== 0) ky = cy / Math.abs(dy);
    return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
  };

  const getangle = (el, x, y) => {
    const [cx, cy] = getcenter(el);
    const dx = x - cx;
    const dy = y - cy;
    if (dx === 0 && dy === 0) return 0;
    const rad = Math.atan2(dy, dx);
    let deg = rad * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;
    return deg;
  };

  const onmove = (e) => {
    const card = pref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const edge = getedge(card, x, y);
    const angle = getangle(card, x, y);
    card.style.setProperty('--edge-proximity', `${(edge * 100).toFixed(3)}`);
    card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
  };

  useEffect(() => {
    const card = pref.current;
    if (!card) return;

    const easeout = (x) => 1 - Math.pow(1 - x, 3);
    const easein = (x) => x * x * x;

    const anim = ({ start = 0, end = 100, duration = 1000, delay = 0, ease = easeout, onUpdate, onEnd }) => {
      const t0 = performance.now() + delay;
      let frame;
      function tick() {
        const elapsed = performance.now() - t0;
        const t = Math.min(elapsed / duration, 1);
        onUpdate(start + (end - start) * ease(t));
        if (t < 1) frame = requestAnimationFrame(tick);
        else if (onEnd) onEnd();
      }
      const timeout = setTimeout(() => {
        frame = requestAnimationFrame(tick);
      }, delay);

      return () => {
        clearTimeout(timeout);
        if (frame) cancelAnimationFrame(frame);
      };
    };

    const startdeg = 110;
    const enddeg = 465;
    card.classList.add('sweep-active');
    card.style.setProperty('--cursor-angle', `${startdeg}deg`);

    const cleanups = [];

    cleanups.push(anim({
      duration: 500,
      onUpdate: (v) => card.style.setProperty('--edge-proximity', v.toFixed(3))
    }));

    cleanups.push(anim({
      ease: easein,
      duration: 1500,
      end: 50,
      onUpdate: (v) => {
        card.style.setProperty('--cursor-angle', `${((enddeg - startdeg) * (v / 100) + startdeg).toFixed(3)}deg`);
      }
    }));

    cleanups.push(anim({
      ease: easeout,
      delay: 1500,
      duration: 2250,
      start: 50,
      end: 100,
      onUpdate: (v) => {
        card.style.setProperty('--cursor-angle', `${((enddeg - startdeg) * (v / 100) + startdeg).toFixed(3)}deg`);
      }
    }));

    cleanups.push(anim({
      ease: easein,
      delay: 2500,
      duration: 1500,
      start: 100,
      end: 0,
      onUpdate: (v) => card.style.setProperty('--edge-proximity', v.toFixed(3)),
      onEnd: () => card.classList.remove('sweep-active'),
    }));

    return () => {
      cleanups.forEach((c) => c());
    };
  }, []);

  useEffect(() => {
    if (!file) {
      Promise.resolve().then(() => setprev(''));
      return undefined;
    }
    const url = URL.createObjectURL(file);
    Promise.resolve().then(() => setprev(url));
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const showToast = useCallback((msg) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToast('');
    }, 5000);
  }, []);

  const pick = useCallback((picked) => {
    if (!picked) return;
    const l = checklimit();
    if (!l.ok) {
      setLim(l);
      seterr(`Rate limit reached. Please wait ${formatWait(l.wait)}.`);
      showToast(`Scan blocked. Please wait ${formatWait(l.wait)}.`);
      return;
    }
    const name = picked.name || 'image.png';
    const type = picked.type || 'image/png';
    const ext = name.split('.').pop()?.toLowerCase();
    const allowedExts = ['png', 'jpg', 'jpeg'];
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const isAllowed = allowedTypes.includes(type) || allowedExts.includes(ext);
    if (!isAllowed) {
      seterr('Unsupported file format. Please use PNG, JPG, or JPEG.');
      return;
    }
    seterr('');
    setfile(picked);
    setcropmode(false);
  }, [showToast]);

  const handlePaste = useCallback((event) => {
    if (cropmode || busy) return;
    const l = checklimit();
    if (!l.ok) {
      setLim(l);
      showToast(`Rate limit reached. Wait ${formatWait(l.wait)}.`);
      return;
    }
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const pastedFile = items[i].getAsFile();
        if (pastedFile) {
          pick(pastedFile);
          showToast('Image pasted from clipboard');
        }
        break;
      }
    }
  }, [cropmode, busy, pick, showToast]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);



  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const onrotate = useCallback((deg) => {
    if (cropref.current) {
      cropref.current.rotateImage(deg);
    }
  }, []);

  const onflip = useCallback(() => {
    if (cropref.current) {
      cropref.current.flipImage(true, false);
    }
  }, []);

  const onreset = useCallback(() => {
    if (cropref.current) {
      cropref.current.reset();
    }
  }, []);

  const doOCR = useCallback(async (imgFile, shotData) => {
    const l = checklimit();
    if (!l.ok) {
      setLim(l);
      setScanError(`Rate limit reached. Please wait ${formatWait(l.wait)}.`);
      setbusy(false);
      return;
    }
    addscan();
    setLim(checklimit());
    setbusy(true);
    setScanError('');
    try {
      const subjects = await performOCR(imgFile);
      if (!subjects || subjects.length === 0) {
        setScanError('No table detected. Please retry with a clearer image.');
        setbusy(false);
      } else {
        setbusy(false);
        navigate('/result', { state: { rows: subjects, image: shotData } });
      }
    } catch (e) {
      setbusy(false);
      setScanError(e.message === 'TIMEOUT' ? 'Request timed out after 15 seconds. Please try again.' : 'OCR Error: ' + e.message);
    }
  }, [navigate]);

  const onscan = useCallback(async () => {
    if (!cropref.current) return;
    const l = checklimit();
    if (!l.ok) {
      setLim(l);
      seterr(`Rate limit reached. Please wait ${formatWait(l.wait)}.`);
      showToast(`Scan blocked. Please wait ${formatWait(l.wait)}.`);
      return;
    }
    const canvas = cropref.current.getCanvas();
    if (!canvas) return;
    const shot = canvas.toDataURL('image/jpeg', 0.9);
    setcropmode(false);
    setbusy(true);
    setScanError('');
    
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setbusy(false);
        seterr('Failed to extract crop area.');
        return;
      }
      const cropped = new File([blob], file.name, { type: 'image/jpeg' });
      setfile(cropped);
      setPendingFile(cropped);
      setPendingShot(shot);
      
      setTimeout(() => doOCR(cropped, shot), 150);
    }, 'image/jpeg', 0.95);
  }, [file, doOCR, showToast]);

  const onchange = (event) => {
    const l = checklimit();
    if (!l.ok) {
      setLim(l);
      showToast(`Rate limit reached. Wait ${formatWait(l.wait)}.`);
      return;
    }
    const picked = event.target.files?.[0];
    pick(picked);
    event.target.value = '';
  };

  const ondrag = (event) => {
    event.preventDefault();
    setdrag(true);
  };

  const onleave = (event) => {
    if (event.currentTarget !== event.target) return;
    setdrag(false);
  };

  const ondrop = (event) => {
    event.preventDefault();
    setdrag(false);
    const l = checklimit();
    if (!l.ok) {
      setLim(l);
      showToast(`Rate limit reached. Wait ${formatWait(l.wait)}.`);
      return;
    }
    const picked = event.dataTransfer.files?.[0];
    pick(picked);
  };

  if (busy || scanError) {
    return (
      <section key="loading-view" className="upload-page loading-active">
        <div className="upload-bg" aria-hidden="true">
          <div className="upload-grid"></div>
          <div className="upload-blob upload-blob-a"></div>
          <div className="upload-blob upload-blob-b"></div>
        </div>

        <div className="loading-screen container">
          <div className="upload-panel scan-loading-panel">
            {scanError ? (
              <div className="scan-error-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
                <div style={{ color: '#ef4444', marginBottom: '0.5rem' }}><RefreshCw size={32} /></div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>Something went wrong</h3>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem', maxWidth: '300px', lineHeight: '1.4' }}>{scanError}</p>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button 
                    className="upload-cta scan-error-btn" 
                    onClick={() => doOCR(pendingFile, pendingShot)}
                  >
                    Retry
                  </button>
                  <button 
                    className="upload-cta scan-error-btn scan-error-btn-secondary" 
                    onClick={() => { setScanError(''); setcropmode(true); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="aesthetic-loader-container">
                <div className="loader"></div>
                <footer className="scan-loading-footer">
                  <span>Analyzing Image...</span>
                </footer>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (cropmode && prev) {
    return (
      <section key="crop-view" className="upload-page crop-active">
        <div className="upload-bg" aria-hidden="true">
          <div className="upload-grid"></div>
          <div className="upload-blob upload-blob-a"></div>
          <div className="upload-blob upload-blob-b"></div>
        </div>

        <div className="crop-fixed-header">
          <button
            type="button"
            className="crop-back"
            onClick={() => setcropmode(false)}
            title="Back to upload"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="crop-fixed-title">Crop the image</h2>
        </div>

        <div className="crop-screen container">
          <div className="crop-sidebar">
            <div className="crop-info">
              <p className="crop-desc">
                Select only the table area from your image. Use scroll to zoom and drag to pan.
              </p>

              <div className="crop-hints">
                <div className="crop-hint">
                  <Sparkles size={18} />
                  <span>Scroll to zoom in/out</span>
                </div>
                <div className="crop-hint">
                  <Maximize size={18} />
                  <span>Drag corners to resize</span>
                </div>
                <div className="crop-hint">
                  <Image size={18} />
                  <span>Drag image to reposition</span>
                </div>
              </div>

              <div className="crop-tips">
                <ul className="crop-tips-list">
                  <li>Focus on subject, credits, grade</li>
                  <li>Crop out extra columns</li>
                  <li>Avoid shadows and glare</li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              className="upload-cta crop-proceed"
              onClick={onscan}
            >
              Start smart scan
            </button>
          </div>

          <div className="crop-main">
            <div className="crop-hint-capsule">Crop Image</div>
            <div className="crop-canvas-wrap">
              <Cropper
                ref={cropref}
                src={prev}
                className="crop-cropper"
                stencilProps={{
                  grid: true,
                  handlers: {
                    eastNorth: true,
                    north: false,
                    westNorth: true,
                    west: false,
                    westSouth: true,
                    south: false,
                    eastSouth: true,
                    east: false
                  },
                  lines: {
                    north: true,
                    east: true,
                    south: true,
                    west: true
                  }
                }}
                imageRestriction="stencil"
                transitions={true}
                minWidth={100}
                minHeight={100}
                defaultSize={(state) => ({
                  width: state.imageSize.width,
                  height: state.imageSize.height
                })}
                defaultPosition={() => ({
                  left: 0,
                  top: 0
                })}
                stencilSize={{
                  minimum: {
                    width: 100,
                    height: 100
                  }
                }}
                imageProps={{
                  crossOrigin: 'anonymous'
                }}
                backgroundProps={{
                  scaleImage: true,
                  moveImage: true
                }}
                resizeImage={{
                  adjustStencil: false
                }}
                moveImage={{
                  adjustStencil: false
                }}
              />
            </div>

            <div className="crop-nav">
              <button
                type="button"
                className="crop-nav-btn"
                onClick={onflip}
                title="Flip horizontal"
              >
                <FlipHorizontal size={16} />
              </button>
              <button
                type="button"
                className="crop-nav-btn"
                onClick={() => onrotate(90)}
                title="Rotate clockwise"
              >
                <RotateCw size={16} />
              </button>
              <button
                type="button"
                className="crop-nav-dot"
                onClick={onreset}
                title="Reset"
                style={{ color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.35)' }}
              >
                <RefreshCw size={14} />
              </button>
              <button
                type="button"
                className="crop-nav-btn"
                onClick={() => onrotate(-90)}
                title="Rotate counter-clockwise"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                className="crop-nav-btn"
                onClick={() => {
                  if (cropref.current) {
                    cropref.current.setCoordinates(({ imageSize }) => ({
                      width: imageSize.width,
                      height: imageSize.height,
                      left: 0,
                      top: 0
                    }));
                  }
                }}
                title="Fit to image"
              >
                <Maximize size={16} />
              </button>
            </div>
          </div>
        </div>

        <input
          ref={fref}
          className="upload-input"
          type="file"
          accept="image/png, image/jpeg, image/jpg"
          onChange={onchange}
        />
      </section>
    );
  }

  return (
    <section
      key="upload-view"
      className={`upload-page ${drag ? 'is-drag' : ''}`}
      onDragOver={ondrag}
      onDragLeave={onleave}
      onDrop={ondrop}
    >
      <div className="upload-bg" aria-hidden="true">
        <div className="upload-grid"></div>
        <div className="upload-blob upload-blob-a"></div>
        <div className="upload-blob upload-blob-b"></div>
      </div>

      <div className="upload-wrap container">
        <div aria-hidden="true" className="upload-line" data-side="left"></div>
        <div aria-hidden="true" className="upload-line" data-side="right"></div>

        <div className="upload-copy">
          <h1 className="upload-title">
            Smart upload for{' '}
            <span className="upload-title-accent">clean results.</span>
          </h1>
          <p className="upload-sub">
            Choose a clear photo of your semester result sheet. Processing is done entirely on your device.
          </p>

          <div className="upload-points">
            <div className="upload-point">
              <Sparkles size={18} />
              <span>Auto detect subject, credits, grade</span>
            </div>
            <div className="upload-point">
              <Zap size={18} />
              <span>Adaptive cleanups for low light images</span>
            </div>
            <div className="upload-point">
              <ShieldCheck size={18} />
              <span>Local processing only, no cloud upload</span>
            </div>
          </div>
        </div>

        <div className="upload-panel" ref={pref} onPointerMove={onmove}>
          {!lim.ok ? (
            <>
              <div className="upload-error-banner" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontWeight: 700 }}>
                  <span className="error-dot" />
                  <span>Rate-Limit Reached (Wait {formatWait(lim.wait)})</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'rgba(248, 113, 113, 0.78)', fontWeight: 500 }}>
                  To keep Calci running for everyone, we had to use ratelimiting for users so all users can use this tool for free
                </span>
              </div>
              <div className="rate-limit-blocked-content">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <defs>
                    <radialGradient id="faceGrad" cx="50%" cy="40%" r="50%" fx="50%" fy="30%">
                      <stop offset="0%" stopColor="#FFDD67"/>
                      <stop offset="85%" stopColor="#FF9E1B"/>
                      <stop offset="100%" stopColor="#E27D00"/>
                    </radialGradient>
                    <linearGradient id="eyeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#222222"/>
                      <stop offset="100%" stopColor="#000000"/>
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="54" fill="url(#faceGrad)" stroke="#D47300" strokeWidth="1.5"/>
                  <path d="M 26 44 C 32 38, 42 32, 48 36" stroke="#603800" strokeWidth="3" strokeLinecap="round" fill="none"/>
                  <path d="M 94 44 C 88 38, 78 32, 72 36" stroke="#603800" strokeWidth="3" strokeLinecap="round" fill="none"/>
                  <g>
                    <ellipse cx="40" cy="58" rx="15" ry="17" fill="url(#eyeGrad)"/>
                    <ellipse cx="40" cy="58" rx="13.5" ry="15.5" stroke="#FFFFFF" strokeOpacity="0.15" strokeWidth="1" fill="none"/>
                    <circle cx="36" cy="51" r="7.5" fill="#FFFFFF"/>
                    <circle cx="45" cy="65" r="3.5" fill="#FFFFFF"/>
                    <circle cx="32" cy="63" r="1.8" fill="#FFFFFF"/>
                  </g>
                  <g>
                    <ellipse cx="80" cy="58" rx="15" ry="17" fill="url(#eyeGrad)"/>
                    <ellipse cx="80" cy="58" rx="13.5" ry="15.5" stroke="#FFFFFF" strokeOpacity="0.15" strokeWidth="1" fill="none"/>
                    <circle cx="76" cy="51" r="7.5" fill="#FFFFFF"/>
                    <circle cx="85" cy="65" r="3.5" fill="#FFFFFF"/>
                    <circle cx="72" cy="63" r="1.8" fill="#FFFFFF"/>
                  </g>
                  <path d="M 52 86 C 55 80, 65 80, 68 86" stroke="#603800" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
                </svg>
                <div className="rate-limit-footer">Sorry for Inconvinence</div>
                <Link to="/manual" className="rate-limit-btn">
                  Use Manual Entry
                </Link>
              </div>
            </>
          ) : (
            <>
              {err ? (
                <div className="upload-error-banner">
                  <span className="error-dot" />
                  <span>{err}</span>
                </div>
              ) : (
                <p className="upload-panel-tip">
                  <span className="tip-dot" />
                  Note: Works best with uploaded screenshots
                </p>
              )}
              <div
                className={`upload-drop ${drag ? 'is-drag' : ''} ${prev ? 'has-preview' : ''} ${err ? 'has-error' : ''}`}
                onClick={() => fref.current?.click()}
                onDragOver={ondrag}
                onDragLeave={onleave}
                onDrop={ondrop}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fref.current?.click();
                  }
                }}
              >
                {prev ? (
                  <div className="upload-preview">
                    <img src={prev} alt="Upload preview" />
                    <div className="upload-preview-mask"></div>
                    <div className="upload-preview-info">
                      <Image size={18} />
                      <span>{file?.name}</span>
                    </div>
                  </div>
                ) : (
                  <div className="upload-empty">
                    <div className="upload-icon">
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <rect x="1" y="1" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" opacity="0.5"/>
                        <rect x="19" y="1" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" opacity="0.5"/>
                        <rect x="1" y="19" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" opacity="0.5"/>
                        <rect x="12" y="12" width="4" height="4" rx="1" fill="currentColor" opacity="0.9"/>
                        <line x1="14" y1="6" x2="14" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6"/>
                        <line x1="14" y1="17" x2="14" y2="22" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6"/>
                        <line x1="6" y1="14" x2="11" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6"/>
                        <line x1="17" y1="14" x2="22" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6"/>
                      </svg>
                    </div>
                    <h3>Drop image here</h3>
                    <p>or click to browse your device</p>
                    <div className="upload-formats">
                      <span className="upload-fmt-tag">PNG</span>
                      <span className="upload-fmt-tag">JPG</span>
                      <span className="upload-fmt-tag">JPEG</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="upload-meta">
                {file ? (
                  <span>{Math.round(file.size / 1024)} KB | {file.type.replace('image/', '').toUpperCase()}</span>
                ) : (
                  <span>PNG, JPG, JPEG up to 10MB</span>
                )}
              </div>

              <div className="upload-actions">
                <button type="button" className="upload-btn-primary" onClick={() => fref.current?.click()}>
                  <Image size={18} />
                  {file ? 'Change image' : 'Choose image'}
                </button>
              </div>

              <button
                type="button"
                className="upload-cta"
                onClick={() => setcropmode(true)}
                disabled={!file}
              >
                Proceed
              </button>
            </>
          )}
        </div>
      </div>

      <input
        ref={fref}
        className="upload-input"
        type="file"
        accept="image/png, image/jpeg, image/jpg"
        onChange={onchange}
      />

      {toast && (
        <div className="toast-container">
          <div className="c-toast">
            <div className="c-toast-icon">
              <Sparkles size={16} />
            </div>
            <div className="c-toast-body">
              <div className="c-toast-title">{toast}</div>
            </div>
            <button
              type="button"
              className="c-toast-close"
              onClick={() => setToast('')}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default UploadPage;
