import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaKeyboard, FaFileUpload, FaBolt, FaShieldAlt, FaMagic, FaCheckCircle, FaLayerGroup, FaQuestionCircle } from 'react-icons/fa';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Zap, Upload, ChevronRight, Calculator, Layers, CheckCircle } from 'lucide-react';
import './Home.css';

const ShinyText = ({
  text,
  color = '#b5b5b5',
  shineColor = '#ffffff',
  speed = 2,
  delay = 0,
  spread = 120,
  yoyo = false,
  pauseOnHover = false,
  direction = 'left',
  disabled = false,
  className = '',
}) => {
  const animationDuration = `${speed}s`;
  const animationDelay = `${delay}s`;
  const spreadAngle = spread;
  const isRtl = direction === 'right';

  const style = {
    '--speed': animationDuration,
    '--delay': animationDelay,
    '--spread': `${spreadAngle}deg`,
    '--shine-color': shineColor,
    '--text-color': color,
  };

  const isYoyo = yoyo ? 'yoyo' : '';
  const isPauseOnHover = pauseOnHover ? 'pause-hover' : '';
  const isDisabled = disabled ? 'disabled' : '';
  const isRtlClass = isRtl ? 'rtl' : '';

  return (
    <span
      className={`shiny-text ${isYoyo} ${isPauseOnHover} ${isDisabled} ${isRtlClass} ${className}`}
      style={style}
    >
      {text}
    </span>
  );
};

const TILT_MAX = 9;
const TILT_SPRING = { stiffness: 300, damping: 28 };
const GLOW_SPRING = { stiffness: 180, damping: 22 };

const DEFAULT_ITEMS = [
  {
    icon: Layers,
    title: "Subjects",
    description: "We detect each row and capture the subject name/title when available. If the name is noisy, you can keep it blank and still calculate SGPA.",
    color: "#a78bfa",
  },
  {
    icon: Zap,
    title: "Credits",
    description: "Credits are parsed as numbers (like 4, 3, 1.5). This is what drives weighted calculation.",
    color: "#60a5fa",
  },
  {
    icon: CheckCircle,
    title: "Grades (including A+)",
    description: "Grades like A+, A, B+, B… are recognized and normalized (even if the screenshot spacing is weird).",
    color: "#34d399",
  }
];

function Card({ item, dimmed, onHoverStart, onHoverEnd }) {
  const Icon = item.icon;
  const cardRef = useRef(null);

  const normX = useMotionValue(0.5);
  const normY = useMotionValue(0.5);

  const rawRotateX = useTransform(normY, [0, 1], [TILT_MAX, -TILT_MAX]);
  const rawRotateY = useTransform(normX, [0, 1], [-TILT_MAX, TILT_MAX]);

  const rotateX = useSpring(rawRotateX, TILT_SPRING);
  const rotateY = useSpring(rawRotateY, TILT_SPRING);
  const glowOpacity = useSpring(0, GLOW_SPRING);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    normX.set((e.clientX - rect.left) / rect.width);
    normY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseEnter = () => {
    glowOpacity.set(1);
    onHoverStart();
  };

  const handleMouseLeave = () => {
    normX.set(0.5);
    normY.set(0.5);
    glowOpacity.set(0);
    onHoverEnd();
  };

  return (
    <motion.div
      animate={{
        scale: dimmed ? 0.96 : 1,
        opacity: dimmed ? 0.5 : 1,
      }}
      className="spotlight-card group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      ref={cardRef}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
      }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "1.25rem",
          pointerEvents: "none",
          background: `radial-gradient(ellipse at 20% 20%, ${item.color}14, transparent 65%)`,
        }}
      />

      <motion.div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "1.25rem",
          pointerEvents: "none",
          opacity: glowOpacity,
          background: `radial-gradient(ellipse at 20% 20%, ${item.color}2e, transparent 65%)`,
        }}
      />

      <div
        className="spotlight-icon-badge"
        style={{
          background: `${item.color}18`,
          boxShadow: `inset 0 0 0 1px ${item.color}30`,
        }}
      >
        <Icon size={24} strokeWidth={1.9} style={{ color: item.color }} />
      </div>

      <div className="spotlight-card-content">
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
    </motion.div>
  );
}

function SpotlightCards({ items = DEFAULT_ITEMS }) {
  const [hoveredTitle, setHoveredTitle] = useState(null);

  return (
    <div className="spotlight-wrapper">
      <div className="spotlight-grid">
        {items.map((item) => (
          <Card
            key={item.title}
            dimmed={hoveredTitle !== null && hoveredTitle !== item.title}
            item={item}
            onHoverEnd={() => setHoveredTitle(null)}
            onHoverStart={() => setHoveredTitle(item.title)}
          />
        ))}
      </div>
    </div>
  );
}

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="calci-footer" aria-labelledby="footer-title">
      <div className="calci-footer-backdrop" aria-hidden="true">
        <div className="calci-footer-grid"></div>
        <div className="calci-footer-glow calci-footer-glow-left"></div>
        <div className="calci-footer-glow calci-footer-glow-right"></div>
      </div>

      <div className="calci-footer-inner container">
        <div className="calci-footer-hero">
          <div className="calci-footer-wordmark">
            <div id="footer-title" className="calci-footer-wordmark-text" data-text="CALCI">
              CALCI
            </div>
            <div className="calci-footer-wordmark-sub">Intelligent SGPA Calculator</div>
          </div>
          <p className="calci-footer-blurb">
            Private, fast SGPA calculations powered by on-device OCR.
          </p>
        </div>

        <div className="calci-footer-links">
          <div className="calci-footer-link-group">
            <span className="calci-footer-label">Product</span>
            <Link to="/">Home</Link>
            <Link to="/upload">Smart Upload</Link>
            <Link to="/manual">Manual Entry</Link>
          </div>
          <div className="calci-footer-link-group">
            <span className="calci-footer-label">Build</span>
            <a href="https://github.com/anshdhariwal" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a href="https://github.com/anshdhariwal/calci" target="_blank" rel="noopener noreferrer">
              Repository
            </a>
          </div>
        </div>

        <div className="calci-footer-bottom">
          <span>(c) {year} CALCI. All rights reserved.</span>
          <span>
            Developed by{' '}
            <a href="https://github.com/anshdhariwal" target="_blank" rel="noopener noreferrer">
              @anshdhariwal
            </a>
            {' '}and{' '}
            <a href="https://github.com/jigyasaphogat" target="_blank" rel="noopener noreferrer">
              @jigyasaphogat
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
};

const Home = () => {
  return (
    <div className="home-container fade-in">
      <section className="hero-section container" style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '100%', zIndex: -1, opacity: 0.2, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(37,99,235,0.3), rgba(124,58,237,0.3))', filter: 'blur(120px)', borderRadius: '50%', transform: 'scale(0.75)' }} />
          </div>

          <div aria-hidden="true" className="hero-grid-line" data-side="left" style={{ '--line-fade-stop': '60%' }}></div>
          <div aria-hidden="true" className="hero-grid-line" data-side="right" style={{ '--line-fade-stop': '60%' }}></div>

          <div className="hero-block-top">
            <svg aria-hidden="true" className="hero-corner-arc" data-side="top-left" fill="none" height="75" viewBox="0 0 75 75" width="75">
              <path d="M74 37.5C74 30.281 71.8593 23.2241 67.8486 17.2217C63.838 11.2193 58.1375 6.541 51.4679 3.7784C44.7984 1.0158 37.4595 0.292977 30.3792 1.70134C23.2989 3.1097 16.7952 6.58599 11.6906 11.6906C6.58599 16.7952 3.1097 23.2989 1.70134 30.3792C0.292977 37.4595 1.0158 44.7984 3.7784 51.4679C6.541 58.1375 11.2193 63.838 17.2217 67.8486C23.2241 71.8593 30.281 74 37.5 74" stroke="url(#arc-grad-tl)" strokeDasharray="2 2" />
              <defs>
                <radialGradient id="arc-grad-tl" cx="0" cy="0" gradientTransform="translate(37.5 37.5) rotate(90) scale(36.5)" gradientUnits="userSpaceOnUse" r="1">
                  <stop stopColor="currentColor" />
                  <stop offset="0.5" stopColor="currentColor" stopOpacity="0.34" />
                  <stop offset="1" stopColor="currentColor" />
                </radialGradient>
              </defs>
            </svg>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="hero-content-new"
            >

              <h1 className="hero-title-new">
                Smarter Result <br />
                <ShinyText 
                  text="Calculations."
                  shineColor="#60a5fa"
                  color="#1d4ed8"
                  speed={8}
                  spread={120}
                />
              </h1>
              <p className="hero-subtitle-new">
                Eliminate manual errors. CALCI uses advanced OCR to parse your result sheets instantly, securely, and entirely in your browser.
              </p>
            </motion.div>

            <svg aria-hidden="true" className="hero-corner-arc" data-side="bottom-right" fill="none" height="75" viewBox="0 0 75 75" width="75">
              <path d="M74 37.5C74 30.281 71.8593 23.2241 67.8486 17.2217C63.838 11.2193 58.1375 6.541 51.4679 3.7784C44.7984 1.0158 37.4595 0.292977 30.3792 1.70134C23.2989 3.1097 16.7952 6.58599 11.6906 11.6906C6.58599 16.7952 3.1097 23.2989 1.70134 30.3792C0.292977 37.4595 1.0158 44.7984 3.7784 51.4679C6.541 58.1375 11.2193 63.838 17.2217 67.8486C23.2241 71.8593 30.281 74 37.5 74" stroke="url(#arc-grad-br)" strokeDasharray="2 2" />
              <defs>
                <radialGradient id="arc-grad-br" cx="0" cy="0" gradientTransform="translate(37.5 37.5) rotate(90) scale(36.5)" gradientUnits="userSpaceOnUse" r="1">
                  <stop stopColor="currentColor" />
                  <stop offset="0.5" stopColor="currentColor" stopOpacity="0.34" />
                  <stop offset="1" stopColor="currentColor" />
                </radialGradient>
              </defs>
            </svg>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="hero-actions-new"
            >
              <Link to="/upload" className="hero-btn-primary group">
                <Upload size={22} strokeWidth={2.5} />
                Smart Upload
                <ChevronRight size={20} className="icon-slide" />
              </Link>
              <Link to="/manual" className="hero-btn-secondary">
                <Calculator size={22} strokeWidth={2.5} />
                Manual Entry
              </Link>
            </motion.div>
          </div>
      </section>

      <section className="features-section-ls container">
        <div className="features-container-ls">
          <Link to="/upload" className="ls-card theme-red group">
            <div className="ls-icon-wrapper">
              <FaMagic size={24} />
            </div>
            <h3>Smart OCR</h3>
            <p>Don't type. Just snap. Our advanced Optical Character Recognition extracts your subjects and grades in seconds.</p>
          </Link>

          <Link to="/manual" className="ls-card theme-green group">
             <div className="ls-icon-wrapper">
              <FaBolt size={24} />
            </div>
            <h3>Instant Analysis</h3>
            <p>Get your SGPA calculated immediately with automated formula application. No manual math errors.</p>
          </Link>

          <div className="ls-card theme-blue group">
             <div className="ls-icon-wrapper">
              <FaShieldAlt size={24} />
            </div>
            <h3>Privacy First</h3>
            <p>Your data stays on your device. We use client-side processing, so your results are never uploaded to a cloud server.</p>
          </div>
        </div>
      </section>

      <section className="ls-how-section container">
        <h2 className="section-title">How it Works</h2>
        <p className="section-subtitle">
          From snapshot to score in three simple steps.
        </p>

        <div className="how-it-works-grid">
          <div className="how-step-card theme-blue">
            <div className="how-step-number">01</div>
            <div className="how-step-icon">
              <Upload size={24} />
            </div>
            <h3>Upload Image</h3>
            <p>Select your semester grade sheet from your files or take a photo directly using your camera.</p>
            <div className="how-step-connector"></div>
          </div>

          <div className="how-step-card theme-indigo">
            <div className="how-step-number">02</div>
            <div className="how-step-icon">
              <Zap size={24} />
            </div>
            <h3>OCR Processing</h3>
            <p>Our client-side engine preprocesses the image and parses table lines to extract subjects, credits, and grades.</p>
            <div className="how-step-connector"></div>
          </div>

          <div className="how-step-card theme-green">
            <div className="how-step-number">03</div>
            <div className="how-step-icon">
              <Calculator size={24} />
            </div>
            <h3>Calculate SGPA</h3>
            <p>Verify the parsed values in the editable table, make corrections, and get your SGPA calculated instantly.</p>
          </div>
        </div>
      </section>

      <section className="explain-section container">
        <h2 className="section-title">What CALCI Reads From Your Result</h2>
        <p className="section-subtitle">
          CALCI is designed for semester result tables. Upload a clear screenshot and we’ll extract the key fields you care about.
        </p>

        <SpotlightCards />
      </section>

      <section className="faq-section container">
        <h2 className="section-title">FAQ</h2>
        <div className="faq-grid">
          <div className="faq-card glass">
            <div className="faq-q"><FaQuestionCircle /> Why do I need to verify?</div>
            <div className="faq-a">
              OCR is fast, but screenshots vary. Verification ensures every subject row is correct before you calculate.
            </div>
          </div>
          <div className="faq-card glass">
            <div className="faq-q"><FaQuestionCircle /> What if OCR misses a “+”?</div>
            <div className="faq-a">
              You can correct the grade in one click from the dropdown. We also tune OCR for “A+ / B+” style grades.
            </div>
          </div>
          <div className="faq-card glass">
            <div className="faq-q"><FaQuestionCircle /> Do you upload my results?</div>
            <div className="faq-a">
              No. CALCI runs in your browser and processes locally.
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
