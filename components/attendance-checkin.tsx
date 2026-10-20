'use client';

import { useMemo, useState } from 'react';
import { attendanceSeed, contacts } from '@/lib/mock-data';

export function AttendanceCheckin() {
  const [query, setQuery] = useState('');
  const [sessionRecords, setSessionRecords] = useState(attendanceSeed);
  const [walkInName, setWalkInName] = useState('');
  const [walkInStatus, setWalkInStatus] = useState<'Present' | 'Late' | 'Absent'>('Present');

  const matches = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return contacts.slice(0, 5);

    return contacts.filter((person) => {
      const haystack = [person.name, person.email, person.phone, person.church].join(' ').toLowerCase();
      return haystack.includes(value);
    });
  }, [query]);

  const presentCount = sessionRecords.filter((record) => record.status === 'Present').length;
  const lateCount = sessionRecords.filter((record) => record.status === 'Late').length;
  const absentCount = sessionRecords.filter((record) => record.status === 'Absent').length;

  const handleMarkStatus = (name: string, status: 'Present' | 'Late' | 'Absent') => {
    setSessionRecords((previous) => {
      const existing = previous.find((entry) => entry.name === name);
      if (existing) {
        return previous.map((entry) => (entry.name === name ? { ...entry, status, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } : entry));
      }

      const church = contacts.find((person) => person.name === name)?.church ?? 'Unknown church';
      return [{ id: `${Date.now()}`, name, status, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), church }, ...previous];
    });
  };

  const handleWalkInSubmit = () => {
    if (!walkInName.trim()) return;

    const nextEntry = {
      id: `${Date.now()}`,
      name: walkInName.trim(),
      status: walkInStatus,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      church: 'Walk-in registration',
    };

    setSessionRecords((previous) => [nextEntry, ...previous]);
    setWalkInName('');
  };

  return (
    <>
      <section className="panel-grid two-col">
        <div className="panel-card">
          <div className="panel-header">
            <h2>Quick search</h2>
          </div>

          <div className="field-group">
            <label htmlFor="search">Name, email or phone</label>
            <input id="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search member" />
          </div>

          <div className="match-list">
            {matches.map((person) => (
              <div key={person.id} className="match-row">
                <div>
                  <strong>{person.name}</strong>
                  <small>{person.church}</small>
                </div>

                <div className="mini-actions">
                  <button type="button" className="secondary-button" onClick={() => handleMarkStatus(person.name, 'Present')}>Present</button>
                  <button type="button" className="secondary-button" onClick={() => handleMarkStatus(person.name, 'Late')}>Late</button>
                </div>
              </div>
            ))}
          </div>

          <div className="quick-add-box">
            <h3>Walk-in attendee</h3>
            <div className="field-group compact-space">
              <label>Name</label>
              <input value={walkInName} onChange={(event) => setWalkInName(event.target.value)} placeholder="Enter guest name" />
            </div>

            <div className="field-group compact-space">
              <label>Status</label>
              <select value={walkInStatus} onChange={(event) => setWalkInStatus(event.target.value as 'Present' | 'Late' | 'Absent')}>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
              </select>
            </div>

            <button type="button" className="secondary-button full-width" onClick={handleWalkInSubmit}>Add walk-in</button>
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
              <strong>{presentCount}</strong>
            </div>
            <div>
              <span>Late</span>
              <strong>{lateCount}</strong>
            </div>
            <div>
              <span>Absent</span>
              <strong>{absentCount}</strong>
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
              {sessionRecords.map((person) => (
                <tr key={person.id}>
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
    </>
  );
}
