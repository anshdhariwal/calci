import { useEffect, useRef, useState } from 'react';
import { Camera, Image, ShieldCheck, Sparkles, Upload, Zap } from 'lucide-react';
import './Upload.css';

const UploadPage = () => {
  const fref = useRef(null);
  const cref = useRef(null);
  const [file, setfile] = useState(null);
  const [prev, setprev] = useState('');
  const [drag, setdrag] = useState(false);
  const [err, seterr] = useState('');

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
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev || '';
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
    const allowedExts = ['png', 'jpg', 'jpeg', 'heic', 'webp'];
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif'];
    const isAllowed = allowedTypes.includes(picked.type) || allowedExts.includes(ext);
    if (!isAllowed) {
      seterr('Unsupported file format. Please use PNG, JPG, HEIC, or WEBP.');
      return;
    }
    seterr('');
    setfile(picked);
  };

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

  return (
    <section
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
            Drop a clear screenshot or a phone photo. Calci detects the table,
            fixes common OCR slips, and keeps everything on your device.
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
          <span className="edge-light" />
          {err ? (
            <div className="upload-error-banner">
              <span className="error-dot" />
              <span>{err}</span>
            </div>
          ) : (
            <p className="upload-panel-tip">
              <span className="tip-dot" />
              Use screenshots for best OCR accuracy
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
                  <span className="upload-fmt-tag">HEIC</span>
                  <span className="upload-fmt-tag">WEBP</span>
                </div>
              </div>
            )}
          </div>

          <div className="upload-meta">
            {file ? (
              <span>{Math.round(file.size / 1024)} KB | {file.type.replace('image/', '').toUpperCase()}</span>
            ) : (
              <span>PNG, JPG, HEIC up to 10MB</span>
            )}
          </div>

          <div className="upload-actions">
            <button type="button" className="upload-btn-primary" onClick={() => fref.current?.click()}>
              <Image size={18} />
              {file ? 'Change image' : 'Choose image'}
            </button>
            <button type="button" className="upload-btn-secondary" onClick={() => cref.current?.click()}>
              <Camera size={18} />
              Use camera
            </button>
          </div>

          <button type="button" className="upload-cta" disabled={!file}>
            Start smart scan
          </button>
        </div>
      </div>

      <input
        ref={fref}
        className="upload-input"
        type="file"
        accept="image/png, image/jpeg, image/webp, .heic"
        onChange={onchange}
      />
      <input
        ref={cref}
        className="upload-input"
        type="file"
        accept="image/png, image/jpeg, image/webp, .heic"
        capture="environment"
        onChange={onchange}
      />
    </section>
  );
};

export default UploadPage;
