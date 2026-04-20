import { useState } from 'react';
import { FaTrash, FaPlus, FaCalculator, FaInfoCircle, FaSave, FaCheckCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { GRADE_POINTS, calculateSGPA } from '../utils/gradeUtils';
import { saveSgpa } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './ManualEntry.css';

const ManualEntry = ({ initialData = [], isVerificationMode = false, onSgpaChange = () => {} }) => {
  const { user } = useAuth();
  // Start with initialData or 5 empty rows
  const [subjects, setSubjects] = useState(
    initialData.length > 0 ? initialData : [
      { id: 1, name: '', credits: '', grade: '', verified: false },
      { id: 2, name: '', credits: '', grade: '', verified: false },
      { id: 3, name: '', credits: '', grade: '', verified: false },
      { id: 4, name: '', credits: '', grade: '', verified: false },
      { id: 5, name: '', credits: '', grade: '', verified: false },
    ]
  );
  const [sgpa, setSgpa] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  // Save to history
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [semesterName, setSemesterName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const getSgpaTier = (value) => {
    const n = parseFloat(value);
    if (Number.isNaN(n)) return 'neutral';
    if (n >= 9.0) return 'elite';
    if (n >= 8.0) return 'strong';
    if (n >= 7.0) return 'good';
    if (n >= 6.0) return 'average';
    return 'low';
  };

  const getSgpaMessage = (value) => {
    const n = parseFloat(value);
    if (Number.isNaN(n)) return '';
    if (n >= 9.0) return 'Outstanding performance. Keep aiming this high.';
    if (n >= 8.0) return 'Great job! You are doing really well.';
    if (n >= 7.0) return 'Solid result. Small tweaks can push this even higher.';
    if (n >= 6.0) return 'Decent effort. Tighten up weak subjects and you\'ll rise fast.';
    return 'Don\'t be disheartened. Treat this as a baseline and plan your comeback.';
  };

  const handleInputChange = (id, field, value) => {
    setSubjects(prev => prev.map(sub => 
      sub.id === id ? { ...sub, [field]: value } : sub
    ));
    // Any edit invalidates previous calculation
    setSgpa(null);
    setShowResultModal(false);
    onSgpaChange(null);
  };

  const addSubject = () => {
    const newId = subjects.length > 0 ? Math.max(...subjects.map(s => s.id)) + 1 : 1;
    setSubjects([...subjects, { id: newId, name: '', credits: '', grade: '', verified: false }]);
  };

  const removeSubject = (id) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter(s => s.id !== id));
      setSgpa(null);
      setShowResultModal(false);
      onSgpaChange(null);
    }
  };

  const handleCalculate = () => {
    // Validate first
    const activeSubjects = subjects.filter(s => s.credits && s.grade && parseFloat(s.credits) > 0);
    
    if (activeSubjects.length === 0) {
      alert("Please enter at least one valid subject with credits and grade.");
      setSgpa(null);
      onSgpaChange(null);
      return;
    }

    const result = calculateSGPA(subjects);
    
    if (result === "0.00" && activeSubjects.length === 0) {
       // Should be covered by above, but double check
       setSgpa(null);
       setShowResultModal(false);
       onSgpaChange(null);
       return;
    }

    setSgpa(result);
    onSgpaChange(result);
    setShowResultModal(true);
    setSaved(false); // reset saved state on new calculation
    if (parseFloat(result) >= 8.0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const handleSaveToHistory = async () => {
    if (!semesterName.trim()) return;
    setSaving(true);
    try {
      await saveSgpa({
        semester: semesterName.trim(),
        sgpa: parseFloat(sgpa),
        subjects: subjects.filter(s => s.credits && s.grade),
      });
      setSaved(true);
      setShowSaveModal(false);
      setSemesterName('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const tier = sgpa !== null ? getSgpaTier(sgpa) : 'neutral';
  const tierClass = `sgpa-tier-${tier}`;

  return (
    <div className={`manual-container ${isVerificationMode ? 'verification-mode' : 'container'} fade-in`}>
      {!isVerificationMode && (
        <div className="header-section">
          <h2>Manual Entry </h2>
          <p>Input your subjects, credits, and grades below.</p>
        </div>
      )}

      <div className="calculator-card glass">
        {isVerificationMode && <div className="verification-dark-overlay"></div>}
        <div className="table-header">
          {isVerificationMode && <span className="col-verify">Verify</span>}
          <span className="col-name">Subject (Optional)</span>
          <span className="col-credit">Credits</span>
          <span className="col-grade">Grades</span>
          <span className="col-action"></span>
        </div>

        <div className="subjects-list">
          {subjects.map((sub, index) => (
            <div key={sub.id} className="subject-row">
              {isVerificationMode && (
                <div className="checkbox-wrapper">
                  <input 
                    type="checkbox" 
                    checked={sub.verified} 
                    onChange={(e) => handleInputChange(sub.id, 'verified', e.target.checked)}
                    className="round-checkbox"
                  />
                </div>
              )}
              <input 
                type="text" 
                placeholder={`Subject ${index + 1}`}
                className="input-field pill"
                value={sub.name}
                onChange={(e) => handleInputChange(sub.id, 'name', e.target.value)}
              />
              <input 
                type="number" 
                placeholder="Ex. 4"
                className="input-field pill small"
                min="0"
                step="0.5"
                value={sub.credits}
                onChange={(e) => handleInputChange(sub.id, 'credits', e.target.value)}
              />
              <select 
                className="input-field pill small select"
                value={sub.grade}
                onChange={(e) => handleInputChange(sub.id, 'grade', e.target.value)}
              >
                <option value="">Select</option>
                {Object.keys(GRADE_POINTS).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <button 
                className="icon-btn delete" 
                onClick={() => removeSubject(sub.id)}
                aria-label="Remove subject"
                title="Remove"
              >
                <FaTrash />
              </button>
            </div>
          ))}
        </div>

        <div className="actions-row">
          <button className="btn outline" onClick={addSubject}>
            <FaPlus /> Add Subject
          </button>
          <button className="btn btn-primary calculate-btn" onClick={handleCalculate}>
            <FaCalculator /> {isVerificationMode ? 'Verify & Calculate' : 'Calculate SGPA'}
          </button>
        </div>
      </div>

      {/* Full-screen result modal */}
      {sgpa !== null && showResultModal && (
        <div className="result-modal-overlay" role="dialog" aria-modal="true" aria-label="SGPA result">
          <div className={`result-card result-modal glass pop-in ${tierClass}`}>
            <button
              className="result-modal-close"
              onClick={() => setShowResultModal(false)}
              aria-label="Close result"
            >
              ×
            </button>
            <h3 className="result-modal-title">Your SGPA</h3>
            <div className="score-display">{sgpa}</div>
            <p className="motivation">
              {getSgpaMessage(sgpa)}
            </p>

            {/* Save to History */}
            {user ? (
              saved ? (
                <div className="save-success-msg">
                  <FaCheckCircle style={{ color: '#34d399' }} /> Saved to history!
                </div>
              ) : (
                <button
                  id="save-to-history-btn"
                  className="btn btn-primary save-history-btn"
                  onClick={() => setShowSaveModal(true)}
                >
                  <FaSave /> Save to History
                </button>
              )
            ) : (
              <p className="save-login-hint">
                <Link to="/login" className="auth-link" onClick={() => setShowResultModal(false)}>Sign in</Link> to save your result.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="result-modal-overlay" role="dialog" onClick={() => setShowSaveModal(false)}>
          <div className="save-modal-box" onClick={e => e.stopPropagation()}>
            <h3>Name this Semester</h3>
            <input
              id="semester-name-input"
              type="text"
              className="save-modal-input"
              placeholder="e.g. Semester 3"
              value={semesterName}
              onChange={e => setSemesterName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveToHistory()}
              autoFocus
            />
            <div className="save-modal-actions">
              <button className="btn" onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button
                id="confirm-save-btn"
                className="btn btn-primary"
                onClick={handleSaveToHistory}
                disabled={saving || !semesterName.trim()}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualEntry;
