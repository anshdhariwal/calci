import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useCallback, useState } from 'react';
import { FaSnowflake } from 'react-icons/fa';
import { Info, X } from 'lucide-react';
import useSnowEffect from '../hooks/useSnowEffect.js';
import { GRADES } from '../engine/gradeUtils.js';
import './Navbar.css';

const SPRING = {
  type: 'spring',
  duration: 0.25,
  bounce: 0.1,
};

const SIZES = {
  sm: {
    track: 'toggle-track-sm',
    thumb: 'toggle-thumb-sm',
    thumbTranslate: 16,
    icon: 'toggle-icon-sm',
  },
  md: {
    track: 'toggle-track-md',
    thumb: 'toggle-thumb-md',
    thumbTranslate: 20,
    icon: 'toggle-icon-md',
  },
  lg: {
    track: 'toggle-track-lg',
    thumb: 'toggle-thumb-lg',
    thumbTranslate: 24,
    icon: 'toggle-icon-lg',
  },
};

const AnimatedToggle = ({
  checked: controlledChecked,
  defaultChecked = false,
  onChange,
  variant = 'default',
  icons,
  size = 'md',
  disabled = false,
  label,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [internalChecked, setInternalChecked] = useState(defaultChecked);

  const isControlled = controlledChecked !== undefined;
  const checked = isControlled ? controlledChecked : internalChecked;

  const handleToggle = useCallback(() => {
    if (disabled) return;
    const newValue = !checked;
    if (!isControlled) {
      setInternalChecked(newValue);
    }
    onChange?.(newValue);
  }, [checked, disabled, isControlled, onChange]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  const sizeConfig = SIZES[size] || SIZES.md;

  const getThumbBorderRadius = () => {
    if (variant !== 'morph' || shouldReduceMotion) {
      return 9999;
    }
    return checked ? 9999 : 6;
  };

  const getThumbTransform = () => {
    return checked ? sizeConfig.thumbTranslate : 0;
  };

  const trackClasses = [
    'toggle-track',
    checked ? 'toggle-checked' : 'toggle-unchecked',
    disabled ? 'toggle-disabled' : '',
    sizeConfig.track,
    className,
  ].filter(Boolean).join(' ');

  const thumbClasses = [
    'toggle-thumb',
    sizeConfig.thumb,
  ].filter(Boolean).join(' ');

  const iconClasses = [
    'toggle-icon',
    sizeConfig.icon,
  ].filter(Boolean).join(' ');

  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={trackClasses}
      disabled={disabled}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      role="switch"
      type="button"
    >
      <motion.span
        animate={
          shouldReduceMotion
            ? { x: getThumbTransform() }
            : { x: getThumbTransform(), borderRadius: getThumbBorderRadius() }
        }
        className={thumbClasses}
        initial={false}
        style={{
          borderRadius: getThumbBorderRadius(),
        }}
        transition={shouldReduceMotion ? { duration: 0 } : SPRING}
      >
        {variant === 'icon' && icons && (
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              animate={
                shouldReduceMotion
                  ? { opacity: 1 }
                  : { opacity: 1, scale: 1, rotate: 0 }
              }
              className={iconClasses}
              exit={
                shouldReduceMotion
                  ? { opacity: 0, transition: { duration: 0 } }
                  : { opacity: 0, scale: 0.5, rotate: -90 }
              }
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.5, rotate: 90 }
              }
              key={checked ? 'on' : 'off'}
              transition={shouldReduceMotion ? { duration: 0 } : SPRING}
            >
              {checked ? icons.on : icons.off}
            </motion.span>
          </AnimatePresence>
        )}
      </motion.span>
    </button>
  );
};

const Navbar = () => {
  const loc = useLocation();
  const { isSnowing, toggleSnow } = useSnowEffect();
  const isReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [showScheme, setShowScheme] = useState(false);

  const navVariants = {
    hidden: { opacity: 0, y: isReducedMotion ? 0 : -22, x: '-50%' },
    visible: { opacity: 1, y: 0, x: '-50%', transition: { duration: 0.8, ease: 'easeOut' } }
  };

  const brandVariants = {
    hidden: { opacity: 0, x: isReducedMotion ? 0 : -16 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: 'easeOut', delay: 0.15 } }
  };

  const centerLinksVariants = {
    hidden: { opacity: 0, y: isReducedMotion ? 0 : -10 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: 'easeOut', delay: 0.22 + i * 0.06 }
    })
  };

  const actionVariants = {
    hidden: { opacity: 0, x: isReducedMotion ? 0 : 12 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { duration: 0.45, ease: 'easeOut', delay: 0.28 + i * 0.06 }
    })
  };

  return (
    <>
      <motion.nav
        aria-label="Primary"
        className="nav-container"
        initial="hidden"
        animate="visible"
        variants={navVariants}
      >
        <div className="nav-inner">
          <div className="nav-ring"></div>

          <motion.div variants={brandVariants}>
            <Link to="/" className="nav-brand">
              <img src="/calci.svg" alt="Calci Logo" className="nav-logo-icon" />

              <div className="nav-brand-text">
                <span className="nav-brand-title logo-text" data-text="CALCI">
                  <span className="logo-accent">C</span>ALCI
                </span>
                <span className="nav-brand-subtitle">
                  Intelligent Grade Calculator
                </span>
              </div>
            </Link>
          </motion.div>

          <div className="nav-center-links">
            {['Home', 'Smart Upload', 'Manual Entry', 'Repository'].map((text, idx) => {
              const path = text === 'Home' ? '/' : text === 'Smart Upload' ? '/upload' : text === 'Manual Entry' ? '/manual' : 'https://github.com/anshdhariwal/calci';
              const isExternal = path.startsWith('http');
              const isActive = !isExternal && (path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(path));
              return (
                <motion.div key={text} custom={idx} variants={centerLinksVariants}>
                  {isExternal ? (
                    <a href={path} target="_blank" rel="noopener noreferrer" className="nav-link">
                      {text}
                    </a>
                  ) : (
                    <Link to={path} className={`nav-link ${isActive ? 'nav-link-active' : ''}`}>
                      {text}
                      {isActive && (
                        <motion.span layoutId="nav-dot" className="nav-active-dot" />
                      )}
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="nav-actions">
            <motion.div custom={0} variants={actionVariants} className="nav-snow-toggle-wrapper">
              <AnimatedToggle
                checked={isSnowing}
                onChange={toggleSnow}
                variant="icon"
                icons={{
                  on: <FaSnowflake style={{ color: '#3b82f6' }} />,
                  off: <FaSnowflake style={{ color: '#94a3b8' }} />
                }}
                size="md"
                label="Toggle snow effect"
                className="snow-toggle"
              />
            </motion.div>

            <motion.div custom={1} variants={actionVariants}>
              <Link to="/upload" className="nav-btn-primary">
                Start Scanning
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      <button
        type="button"
        className="global-info-btn"
        onClick={() => setShowScheme(true)}
        aria-label="View Grading Scheme"
      >
        <Info size={16} />
      </button>

      <AnimatePresence>
        {showScheme && (
          <motion.div
            className="scheme-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowScheme(false)}
          >
            <motion.div
              className="scheme-modal"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="scheme-head">
                <h3>Grading Scheme</h3>
                <button
                  type="button"
                  className="scheme-close"
                  onClick={() => setShowScheme(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="scheme-body">
                <table className="scheme-table">
                  <thead>
                    <tr>
                      <th>Grade</th>
                      <th>Performance</th>
                      <th>Grade Point</th>
                    </tr>
                  </thead>
                  <tbody>
                    {GRADES.map((g) => (
                      <tr key={g.grade}>
                        <td className="grade-badge">{g.grade}</td>
                        <td>{g.label}</td>
                        <td className="grade-pts">{g.points.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="scheme-rules">
                  <p>Grades from A+ to D are pass grades.</p>
                  <p className="formula">
                    Semester Grade Point Average (SGPA) = <span className="math">∑(Ci * Gi) / ∑Ci</span>
                  </p>
                  <ul>
                    <li><strong>Ci</strong> = Number of credits assigned to i-th subject</li>
                    <li><strong>Gi</strong> = Grade point equivalent assigned to i-th subject</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
