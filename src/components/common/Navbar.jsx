import { Link, useNavigate } from 'react-router-dom';
import { FaSnowflake, FaGithub, FaChartLine, FaHistory, FaSignOutAlt, FaUserCircle } from 'react-icons/fa';
import { useState, useRef, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import useSnowEffect from '../../hooks/useSnowEffect';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { isSnowing, toggleSnow } = useSnowEffect();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

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

          {user ? (
            <>
              <Link to="/dashboard" className="nav-btn" title="Analytics Dashboard" id="nav-dashboard-link">
                <FaChartLine />
                <span className="btn-label">Dashboard</span>
              </Link>
              <Link to="/history" className="nav-btn" title="SGPA History" id="nav-history-link">
                <FaHistory />
                <span className="btn-label">History</span>
              </Link>

              {/* User avatar dropdown */}
              <div className="nav-user-wrap" ref={dropRef}>
                <button
                  id="nav-user-avatar-btn"
                  className="nav-user-avatar-btn"
                  onClick={() => setDropdownOpen(prev => !prev)}
                  title={user.username}
                >
                  <FaUserCircle size={22} />
                  <span className="nav-username">{user.username}</span>
                </button>

                {dropdownOpen && (
                  <div className="nav-dropdown">
                    <div className="nav-dropdown-info">
                      <div className="nav-dropdown-name">{user.username}</div>
                      <div className="nav-dropdown-email">{user.email}</div>
                    </div>
                    <hr className="nav-dropdown-hr" />
                    <button id="nav-logout-btn" className="nav-dropdown-item danger" onClick={handleLogout}>
                      <FaSignOutAlt /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-btn" id="nav-login-link">
                Sign In
              </Link>
              <Link to="/register" className="nav-btn nav-btn-primary" id="nav-register-link">
                Get Started
              </Link>
            </>
          )}

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
