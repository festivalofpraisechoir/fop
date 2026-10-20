const reportRows = [
  { date: '12 Jun 2025', present: 19, late: 2, absent: 5, rate: '76%' },
  { date: '09 Jun 2025', present: 22, late: 3, absent: 2, rate: '88%' },
  { date: '05 Jun 2025', present: 18, late: 1, absent: 6, rate: '72%' },
];

export default function ReportsPage() {
  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Reporting</p>
          <h1>Attendance reports</h1>
        </div>
        <button className="primary-button">Export CSV</button>
      </header>

      <section className="panel-card">
        <div className="toolbar-row">
          <div className="date-pair">
            <div className="field-group compact">
              <label>Start date</label>
              <input type="date" defaultValue="2025-06-01" />
            </div>
            <div className="field-group compact">
              <label>End date</label>
              <input type="date" defaultValue="2025-06-20" />
            </div>
          </div>
          <button className="secondary-button">Apply range</button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Present</th>
                <th>Late</th>
                <th>Absent</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((row) => (
                <tr key={row.date}>
                  <td>{row.date}</td>
                  <td>{row.present}</td>
                  <td>{row.late}</td>
                  <td>{row.absent}</td>
                  <td>{row.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
