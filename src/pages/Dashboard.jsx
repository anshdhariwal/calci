import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaChartLine, FaTrophy, FaGraduationCap, FaLayerGroup, FaArrowUp, FaHistory } from 'react-icons/fa';
import { getAnalytics } from '../utils/api';
import './Dashboard.css';

const getTier = (sgpa) => {
  const n = parseFloat(sgpa);
  if (n >= 9.0) return 'elite';
  if (n >= 8.0) return 'strong';
  if (n >= 7.0) return 'good';
  if (n >= 6.0) return 'avg';
  return 'low';
};

const GRADE_LABELS = ['A+','A','B+','B','C+','C','D','E/F'];
const GRADE_MAP = { 'A+': 0, 'A': 1, 'B+': 2, 'B': 3, 'C+': 4, 'C': 5, 'D': 6, 'E': 7, 'F': 7 };

// Native SVG trend chart
const TrendChart = ({ records }) => {
  const svgRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const W = 800, H = 200, PAD = { top: 16, right: 24, bottom: 32, left: 36 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const minVal = Math.max(0, Math.min(...records.map(r => r.sgpa)) - 0.5);
  const maxVal = Math.min(10, Math.max(...records.map(r => r.sgpa)) + 0.5);

  const xScale = (i) => PAD.left + (i / (records.length - 1 || 1)) * plotW;
  const yScale = (v) => PAD.top + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;

  const points = records.map((r, i) => [xScale(i), yScale(r.sgpa)]);
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaD = pathD + ` L${points[points.length-1][0].toFixed(1)},${(PAD.top+plotH).toFixed(1)} L${PAD.left},${(PAD.top+plotH).toFixed(1)} Z`;

  const gridVals = [minVal, (minVal+maxVal)/2, maxVal].map(v => parseFloat(v.toFixed(1)));

  return (
    <div className="trend-chart-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="trend-chart-svg"
        style={{ height: 200 }}
      >
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridVals.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={yScale(v).toFixed(1)}
              x2={W - PAD.right} y2={yScale(v).toFixed(1)}
              className="trend-grid-line"
            />
            <text x={PAD.left - 4} y={yScale(v) + 4} textAnchor="end" className="trend-axis-label">
              {v.toFixed(1)}
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {records.map((r, i) => (
          <text key={i} x={xScale(i)} y={H - 4} textAnchor="middle" className="trend-axis-label">
            {r.semester.replace(/semester/i, 'S').slice(0, 6)}
          </text>
        ))}

        {/* Area fill */}
        {records.length > 1 && <path d={areaD} className="trend-area" />}
        {/* Line */}
        {records.length > 1 && <path d={pathD} className="trend-line" />}

        {/* Dots */}
        {points.map(([x, y], i) => (
          <circle
            key={i}
            cx={x} cy={y} r={5}
            className="trend-dot"
            onMouseEnter={(e) => {
              setTooltip({ x: e.clientX, y: e.clientY, r: records[i] });
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
      </svg>
      {tooltip && (
        <div
          className="trend-tooltip"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40, position: 'fixed' }}
        >
          <strong>{tooltip.r.semester}</strong> — {tooltip.r.sgpa.toFixed(2)}
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await getAnalytics();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="dashboard-page container">
      <div className="dash-loading"><div className="dash-spinner" /></div>
    </div>
  );

  if (!data || data.records.length === 0) return (
    <div className="dashboard-page container">
      <div className="dashboard-header">
        <h1><FaChartLine style={{ marginRight: '0.5rem' }} />Analytics Dashboard</h1>
      </div>
      <div className="dash-empty">
        <div className="dash-empty-icon">📊</div>
        <h3>No data yet</h3>
        <p>Save your SGPA results to see your analytics.</p>
        <Link to="/manual" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: '1.5rem', gap: '0.4rem' }}>
          Calculate SGPA
        </Link>
      </div>
    </div>
  );

  // Grade distribution from all subjects
  const gradeCounts = new Array(8).fill(0);
  data.records.forEach(r => {
    (r.subjects || []).forEach(s => {
      const idx = GRADE_MAP[s.grade?.toUpperCase()];
      if (idx !== undefined) gradeCounts[idx]++;
    });
  });
  const maxGradeCount = Math.max(...gradeCounts, 1);

  // Improvement: compare first half vs second half
  const mid = Math.floor(data.records.length / 2);
  const firstHalfAvg = data.records.slice(0, mid || 1).reduce((s, r) => s + r.sgpa, 0) / (mid || 1);
  const secondHalfAvg = data.records.slice(mid).reduce((s, r) => s + r.sgpa, 0) / (data.records.length - mid);
  const improvement = (secondHalfAvg - firstHalfAvg).toFixed(2);

  return (
    <div className="dashboard-page container">
      <div className="dashboard-header">
        <h1><FaChartLine style={{ marginRight: '0.5rem' }} />Analytics Dashboard</h1>
        <p>Your academic performance at a glance.</p>
      </div>

      {/* Stats Row */}
      <div className="dash-stats-row">
        <div className="dash-stat-card blue">
          <span className="dash-stat-icon"><FaGraduationCap /></span>
          <span className="dash-stat-label">Average CGPA</span>
          <span className="dash-stat-value blue">{data.average}</span>
          <span className="dash-stat-sub">across {data.records.length} semesters</span>
        </div>
        <div className="dash-stat-card green">
          <span className="dash-stat-icon"><FaTrophy /></span>
          <span className="dash-stat-label">Highest SGPA</span>
          <span className="dash-stat-value green">
            {data.highest ? data.highest.sgpa.toFixed(2) : '—'}
          </span>
          <span className="dash-stat-sub">{data.highest?.semester || ''}</span>
        </div>
        <div className="dash-stat-card purple">
          <span className="dash-stat-icon"><FaLayerGroup /></span>
          <span className="dash-stat-label">Semesters</span>
          <span className="dash-stat-value purple">{data.records.length}</span>
          <span className="dash-stat-sub">total recorded</span>
        </div>
        <div className="dash-stat-card amber">
          <span className="dash-stat-icon"><FaArrowUp /></span>
          <span className="dash-stat-label">Trend</span>
          <span className={`dash-stat-value ${parseFloat(improvement) >= 0 ? 'green' : 'amber'}`}>
            {improvement > 0 ? '+' : ''}{improvement}
          </span>
          <span className="dash-stat-sub">recent vs earlier</span>
        </div>
      </div>

      {/* Trend Chart */}
      {data.records.length >= 2 && (
        <div className="dash-chart-section">
          <div className="dash-chart-title">
            <FaChartLine /> SGPA Trend
          </div>
          <TrendChart records={data.records} />
        </div>
      )}

      {/* Grade Distribution */}
      {gradeCounts.some(c => c > 0) && (
        <div className="dash-chart-section">
          <div className="dash-chart-title">
            <FaLayerGroup /> Grade Distribution (all semesters)
          </div>
          <div className="bar-chart-wrap">
            {GRADE_LABELS.map((label, i) => (
              <div className="bar-item" key={label}>
                <span className="bar-count">{gradeCounts[i] || ''}</span>
                <div
                  className="bar-fill"
                  style={{ height: `${(gradeCounts[i] / maxGradeCount) * 100}%` }}
                />
                <span className="bar-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Semester Table */}
      <div className="dash-chart-section">
        <div className="dash-chart-title">
          <FaHistory /> All Semesters
        </div>
        <table className="dash-sem-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Semester</th>
              <th>SGPA</th>
              <th>Subjects</th>
            </tr>
          </thead>
          <tbody>
            {data.records.map((r, i) => (
              <tr key={r._id}>
                <td style={{ color: '#64748b' }}>{i + 1}</td>
                <td>{r.semester}</td>
                <td>
                  <span className={`sgpa-pill ${getTier(r.sgpa)}`}>
                    {r.sgpa.toFixed(2)}
                  </span>
                </td>
                <td style={{ color: '#64748b' }}>{r.subjects?.length || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
