export default function DashboardPage() {
  const summaryCards = [
    { title: 'Members', value: '482', meta: 'Registered contacts' },
    { title: 'Present today', value: '316', meta: '+19 vs last week' },
    { title: 'Late', value: '23', meta: 'Recently checked in' },
    { title: 'Missing', value: '78', meta: 'Need follow-up' },
  ];

  const attendanceByRole = [
    { label: 'Singers', value: 58, total: 100 },
    { label: 'Musicians', value: 42, total: 100 },
  ];

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Dashboard</h1>
        </div>
      </header>

      <section className="stats-grid">
        {summaryCards.map((card) => (
          <article key={card.title} className="stat-card compact">
            <span>{card.title}</span>
            <strong>{card.value}</strong>
            <small>{card.meta}</small>
          </article>
        ))}
      </section>

      <section className="panel-grid two-col">
        <div className="panel-card">
          <div className="panel-header">
            <h2>Attendance mix</h2>
          </div>
          <div className="progress-stack">
            {attendanceByRole.map((item) => (
              <div key={item.label} className="progress-row">
                <div className="progress-header">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="progress-bar">
                  <span style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h2>Recent imports</h2>
            <span className="status-pill neutral">Synced</span>
          </div>

          <div className="list-stack">
            {[
              'Wednesday rehearsal roster.csv',
              'Sunday service members.xlsx',
              'Keyboard section.pdf',
            ].map((item) => (
              <div key={item} className="list-row">
                <div>
                  <strong>{item}</strong>
                  <small>Processed 2 hours ago</small>
                </div>
                <span className="status-pill success">Ready</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
