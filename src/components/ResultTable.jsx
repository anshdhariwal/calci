import { useCallback } from 'react'
import './ResultTable.css'

function ResultTable({ rows, onUpdate, onExport, onReset }) {
  const change = useCallback((idx, field, val) => {
    onUpdate(idx, field, val)
  }, [onUpdate])

  if (!rows || !rows.length) return null

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Subject</th>
            <th>Credits</th>
            <th>Grade</th>
            <th>Conf</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>
                <input
                  defaultValue={row.subject}
                  onChange={(e) => change(i, 'subject', e.target.value)}
                />
              </td>
              <td>
                <input
                  defaultValue={row.credits}
                  style={{ width: 60 }}
                  onChange={(e) => change(i, 'credits', e.target.value)}
                />
              </td>
              <td>{row.grade || '-'}</td>
              <td>{row.conf}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="actions-row" style={{ marginTop: 10 }}>
        <button className="btn" onClick={onExport}>Export CSV</button>
        <button className="btn" onClick={onReset}>Scan another</button>
      </div>
    </div>
  )
}

export default ResultTable
