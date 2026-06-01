import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Image, ShieldCheck, Sparkles, Upload, Zap, ArrowLeft, RotateCw, RotateCcw, FlipHorizontal, Maximize, RefreshCw } from 'lucide-react';
import { Cropper } from 'react-advanced-cropper';
import { useNavigate } from 'react-router-dom';
import { performOCR } from '../engine/ocrService.js';
import 'react-advanced-cropper/dist/style.css';
import './Upload.css';

const UploadPage = () => {
  const navigate = useNavigate();
  const fref = useRef(null);
  const cref = useRef(null);
  const cropref = useRef(null);
  const [file, setfile] = useState(null);
  const [prev, setprev] = useState('');
  const [drag, setdrag] = useState(false);
  const [err, seterr] = useState('');
  const [cropmode, setcropmode] = useState(false);
  const [busy, setbusy] = useState(false);
  const [logs, setlogs] = useState([]);
  const [progress, setprogress] = useState(null);

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
      setprev('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setprev(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (picked) => {
    if (!picked) return;
    const ext = picked.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['png', 'jpg', 'jpeg'];
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const isAllowed = allowedTypes.includes(picked.type) || allowedExts.includes(ext);
    if (!isAllowed) {
      seterr('Unsupported file format. Please use PNG, JPG, or JPEG.');
      return;
    }
    seterr('');
    setfile(picked);
    setcropmode(false);
  };

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

  const onscan = useCallback(async () => {
    if (!cropref.current) return;
    const canvas = cropref.current.getCanvas();
    if (!canvas) return;
    const shot = canvas.toDataURL('image/jpeg', 0.9);
    setcropmode(false);
    setbusy(true);
    setprogress({ pct: 0, label: 'Initializing...' });
    
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setbusy(false);
        seterr('Failed to extract crop area.');
        return;
      }
      const cropped = new File([blob], file.name, { type: 'image/jpeg' });
      setfile(cropped);
      
      try {
        setprogress({ pct: 50, label: 'Running OCR...' });
        const subjects = await performOCR(cropped);
        
        if (!subjects || subjects.length === 0) {
          seterr('No table detected. Please retry with a clearer image.');
        } else {
          setprogress({ pct: 100, label: 'Done!' });
          navigate('/result', { state: { rows: subjects, image: shot } });
        }
      } catch (e) {
        seterr('OCR Error: ' + e.message);
      } finally {
        setbusy(false);
      }
    }, 'image/jpeg', 0.95);
  }, [file, navigate]);

  const onchange = (event) => {
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
    const picked = event.dataTransfer.files?.[0];
    pick(picked);
  };

  if (busy) {
    return (
      <section key="loading-view" className="upload-page loading-active">
        <div className="upload-bg" aria-hidden="true">
          <div className="upload-grid"></div>
          <div className="upload-blob upload-blob-a"></div>
          <div className="upload-blob upload-blob-b"></div>
        </div>

        <div className="loading-screen container">
          <div className="upload-panel scan-loading-panel">
            <div className="aesthetic-loader-container">
              <div className="loader"></div>
              <footer className="scan-loading-footer">
                <span>Analyzing Image...</span>
              </footer>
            </div>
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

        <div className="crop-screen container">
          <div className="crop-sidebar">
            <button
              type="button"
              className="crop-back"
              onClick={() => setcropmode(false)}
              title="Back to upload"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="crop-info">
              <h2 className="crop-title">Crop the image</h2>
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
                defaultSize={(state) => ({
                  width: state.imageSize.width,
                  height: state.imageSize.height
                })}
                defaultPosition={(state) => ({
                  left: 0,
                  top: 0
                })}
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
          <div className="upload-badge">
            <Zap size={12} />
            smart upload
          </div>
          <h1 className="upload-title">
            Smart upload for{' '}
            <span className="upload-title-accent">clean results.</span>
          </h1>
          <p className="upload-sub">
            Drop a clear screenshot or a phone photo. Calci detects the table, fixes common OCR slips, and keeps everything on your device.
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
            <button type="button" className="upload-btn-secondary upload-btn-camera" onClick={() => cref.current?.click()}>
              <Camera size={18} />
              Use camera
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
        </div>
      </div>

      <input
        ref={fref}
        className="upload-input"
        type="file"
        accept="image/png, image/jpeg, image/jpg"
        onChange={onchange}
      />
      <input
        ref={cref}
        className="upload-input"
        type="file"
        accept="image/png, image/jpeg, image/jpg"
        capture="environment"
        onChange={onchange}
      />
    </section>
  );
};

export default UploadPage;
