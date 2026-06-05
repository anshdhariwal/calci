import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X } from 'lucide-react';
import { GRADES } from '../engine/gradeUtils.js';
import './InfoButton.css';

const InfoButton = () => {
  const [showScheme, setShowScheme] = useState(false);

  return (
    <>
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
                <div>
                  <h3>Grading Scheme</h3>
                  <p className="scheme-subtitle">It uses Chandigarh University's official grades, credits and formulas</p>
                </div>
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

export default InfoButton;
