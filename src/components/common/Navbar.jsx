import { Link } from 'react-router-dom';
import { FaSnowflake, FaGithub } from 'react-icons/fa';
import ThemeToggle from './ThemeToggle';
import useSnowEffect from '../../hooks/useSnowEffect';

import './Navbar.css';

const Navbar = () => {
  const { isSnowing, toggleSnow } = useSnowEffect();

  return (
    <nav className="navbar glass">
      <div className="navbar-content">
        <Link to="/" className="logo-link" aria-label="CALCI Home">
          <img src="/calci.svg" alt="Calci Logo" className="nav-logo-icon" />
          <div className="logo-wrapper">
            <span className="logo-text" data-text="CALCI"><span className="logo-accent">C</span>ALCI</span>
            <span className="logo-subtitle">- Grade Calculator</span>
          </div>
        </Link>
        <div className="nav-actions">
          <button
            className={`icon-btn snow-btn ${isSnowing ? 'active' : ''}`}
            onClick={toggleSnow}
            title="Let it snow"
            aria-label="Toggle snow effect"
          >
            <FaSnowflake className="snow-icon-spin" />
            <span className="snow-label">Let it snow</span>
          </button>
          <ThemeToggle />
          <a 
            href="https://github.com/anshdhariwal/calci" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="nav-btn github-btn"
          >
            <FaGithub />
            <span className="btn-label">Github Repository</span>
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
