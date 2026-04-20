import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FaTrash, FaEdit, FaHistory, FaChartLine } from 'react-icons/fa';
import { getSgpaHistory, deleteSgpa, updateSgpa } from '../utils/api';
import './History.css';

const getTier = (sgpa) => {
  const n = parseFloat(sgpa);
  if (n >= 9.0) return 'elite';
  if (n >= 8.0) return 'strong';
  if (n >= 7.0) return 'good';
  if (n >= 6.0) return 'avg';
  return 'low';
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const History = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRecord, setEditRecord] = useState(null);
  const [editName, setEditName] = useState('');
  const [deleting, setDeleting] = useState(null);

  const fetchRecords = useCallback(async () => {
    try {
      const data = await getSgpaHistory();
      setRecords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteSgpa(id);
      setRecords(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleEditSave = async () => {
    if (!editName.trim()) return;
    try {
      const updated = await updateSgpa(editRecord._id, { semester: editName.trim() });
      setRecords(prev => prev.map(r => r._id === updated._id ? updated : r));
      setEditRecord(null);
    } catch (err) {
      alert(err.message);
    }
  };

  // Stats
  const avg = records.length > 0
    ? (records.reduce((s, r) => s + r.sgpa, 0) / records.length).toFixed(2)
    : '—';
  const highest = records.length > 0
    ? records.reduce((a, b) => a.sgpa > b.sgpa ? a : b)
    : null;

  return (
    <div className="history-page container">
      <div className="history-header">
        <h1><FaHistory style={{ marginRight: '0.5rem', fontSize: '1.4rem' }} />SGPA History</h1>
        <p>All your saved semester results in one place.</p>
      </div>

      {records.length > 0 && (
        <div className="history-cgpa-banner">
          <div className="history-cgpa-stat">
            <span className="history-cgpa-label">Avg CGPA</span>
            <span className="history-cgpa-value">{avg}</span>
          </div>
          <div className="history-cgpa-stat">
            <span className="history-cgpa-label">Semesters</span>
            <span className="history-cgpa-value purple">{records.length}</span>
          </div>
          {highest && (
            <div className="history-cgpa-stat">
              <span className="history-cgpa-label">Best Semester</span>
              <span className="history-cgpa-value green">{highest.semester} ({highest.sgpa})</span>
            </div>
          )}
          <Link to="/dashboard" className="btn btn-primary" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FaChartLine /> Analytics
          </Link>
        </div>
      )}

      {loading ? (
        <div className="history-loading"><div className="history-spinner" /></div>
      ) : records.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">📋</div>
          <h3>No records yet</h3>
          <p>Calculate your SGPA and save it to see it here.</p>
        </div>
      ) : (
        <div className="history-list">
          {records.map((r, idx) => (
            <div key={r._id} className="history-record-card">
              <div className="history-record-num">{idx + 1}</div>
              <div className="history-record-info">
                <div className="history-record-sem">{r.semester}</div>
                <div className="history-record-date">{formatDate(r.createdAt)}</div>
              </div>
              <div className={`history-record-sgpa tier-${getTier(r.sgpa)}`}>
                {r.sgpa.toFixed(2)}
              </div>
              <div className="history-record-actions">
                <button
                  id={`edit-btn-${r._id}`}
                  className="hist-action-btn"
                  onClick={() => { setEditRecord(r); setEditName(r.semester); }}
                  title="Edit semester name"
                >
                  <FaEdit /> Edit
                </button>
                <button
                  id={`delete-btn-${r._id}`}
                  className="hist-action-btn danger"
                  onClick={() => handleDelete(r._id)}
                  disabled={deleting === r._id}
                  title="Delete record"
                >
                  <FaTrash /> {deleting === r._id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editRecord && (
        <div className="edit-modal-overlay" onClick={() => setEditRecord(null)}>
          <div className="edit-modal-box" onClick={e => e.stopPropagation()}>
            <h3>Rename Semester</h3>
            <input
              id="edit-semester-input"
              type="text"
              className="edit-modal-input"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="e.g. Semester 3"
              onKeyDown={e => e.key === 'Enter' && handleEditSave()}
              autoFocus
            />
            <div className="edit-modal-actions">
              <button id="edit-cancel-btn" className="btn-cancel" onClick={() => setEditRecord(null)}>Cancel</button>
              <button id="edit-save-btn" className="btn-save" onClick={handleEditSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
