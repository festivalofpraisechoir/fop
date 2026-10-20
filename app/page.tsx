import { ArrowRight, CheckCircle2, ClipboardCheck, Download, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';

const stats = [
  { label: 'Active contacts', value: '482', detail: '+26 this month' },
  { label: 'Attendance rate', value: '92%', detail: 'Across all sessions' },
  { label: 'Late check-ins', value: '17', detail: 'This week' },
  { label: 'Pending imports', value: '3', detail: '2 CSV, 1 PDF' },
];

const upcoming = [
  { title: 'Wednesday rehearsal', date: 'Wed 12 Jun', time: '18:30', status: 'Open' },
  { title: 'Sunday service', date: 'Sun 16 Jun', time: '10:00', status: 'Planned' },
  { title: 'Youth choir practice', date: 'Thu 20 Jun', time: '18:00', status: 'Open' },
];

export default function HomePage() {
  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Ministry operations</p>
          <h1>Attendance dashboard</h1>
        </div>
        <Link href="/login" className="primary-button">
          Open admin app
          <ArrowRight size={16} />
        </Link>
      </header>

      <section className="stats-grid">
        {stats.map((item) => (
          <article key={item.label} className="stat-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </section>

      <section className="panel-grid two-col">
        <div className="panel-card">
          <div className="panel-header">
            <h2>Quick overview</h2>
            <span className="status-pill success">Healthy</span>
          </div>

          <div className="feature-list">
            <div className="feature-row">
              <div className="feature-icon success-bg"><Users size={18} /></div>
              <div>
                <strong>Member roster management</strong>
                <p>Maintain singer and musician records with church and ministry details.</p>
              </div>
            </div>
            <div className="feature-row">
              <div className="feature-icon success-bg"><ClipboardCheck size={18} /></div>
              <div>
                <strong>Rapid attendance capture</strong>
                <p>Search, scan, or add a new attendee in seconds with a streamlined check-in flow.</p>
              </div>
            </div>
            <div className="feature-row">
              <div className="feature-icon success-bg"><Download size={18} /></div>
              <div>
                <strong>Multi-date reporting</strong>
                <p>Generate attendance snapshots across rehearsals, services, and selected date ranges.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h2>Upcoming sessions</h2>
            <span className="status-pill neutral">3 planned</span>
          </div>
          <div className="list-stack compact">
            {upcoming.map((session) => (
              <div key={session.title} className="list-row">
                <div>
                  <strong>{session.title}</strong>
                  <small>
                    {session.date} • {session.time}
                  </small>
                </div>
                <span className={session.status === 'Open' ? 'status-pill success' : 'status-pill neutral'}>
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <h2>Operational controls</h2>
        </div>
        <div className="control-grid">
          <Link href="/contacts" className="control-card">
            <div className="feature-icon accent-bg"><Users size={18} /></div>
            <strong>Contacts</strong>
            <span>Manage choir members and musician profiles.</span>
          </Link>
          <Link href="/attendance" className="control-card">
            <div className="feature-icon accent-bg"><CheckCircle2 size={18} /></div>
            <strong>Attendance</strong>
            <span>Check members in quickly with search or QR-assisted flow.</span>
          </Link>
          <Link href="/reports" className="control-card">
            <div className="feature-icon accent-bg"><ShieldCheck size={18} /></div>
            <strong>Reports</strong>
            <span>Track attendance across multi-date ranges and congregation groups.</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
