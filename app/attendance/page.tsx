const attendees = [
  { name: 'Michael Ziki', status: 'Present', time: '17:03', church: 'Forward in Faith Ministries' },
  { name: 'Rachid', status: 'Present', time: '17:09', church: 'RCCG Stockpoort Road' },
  { name: 'Hans', status: 'Late', time: '17:40', church: 'Winners Chapel Birmingham' },
  { name: 'Sam', status: 'Absent', time: '-', church: 'Jubilee Church Manchester' },
];

export default function AttendancePage() {
  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Live session</p>
          <h1>Attendance check-in</h1>
        </div>
        <div className="inline-actions">
          <button className="secondary-button">Generate QR</button>
          <button className="primary-button">Start session</button>
        </div>
      </header>

      <section className="panel-grid two-col">
        <div className="panel-card">
          <div className="panel-header">
            <h2>Quick search</h2>
          </div>

          <div className="field-group">
            <label htmlFor="search">Name, email or phone</label>
            <input id="search" placeholder="Search member" />
          </div>

          <div className="checkin-actions">
            <button className="primary-button">Mark present</button>
            <button className="secondary-button">Mark late</button>
            <button className="secondary-button danger-inline">Mark absent</button>
          </div>

          <div className="quick-add-box">
            <h3>New attendee</h3>
            <p>If someone is not on the roster, add them in seconds and mark them present.</p>
            <button className="secondary-button full-width">Add walk-in</button>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h2>Session overview</h2>
            <span className="status-pill success">Open</span>
          </div>

          <div className="qr-box">
            <div className="qr-code">QR</div>
            <p>Rehearsal QR for Wednesday 12 June</p>
          </div>

          <div className="session-stats">
            <div>
              <span>Present</span>
              <strong>18</strong>
            </div>
            <div>
              <span>Late</span>
              <strong>2</strong>
            </div>
            <div>
              <span>Absent</span>
              <strong>7</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <h2>Current attendees</h2>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Check-in time</th>
                <th>Church</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((person) => (
                <tr key={person.name}>
                  <td>{person.name}</td>
                  <td>
                    <span className={person.status === 'Present' ? 'status-pill success' : person.status === 'Late' ? 'status-pill warning' : 'status-pill danger'}>
                      {person.status}
                    </span>
                  </td>
                  <td>{person.time}</td>
                  <td>{person.church}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
