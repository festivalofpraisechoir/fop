'use client';

import { useMemo, useState } from 'react';
import { reportRows } from '@/lib/mock-data';

export function ReportPanel() {
  const [startDate, setStartDate] = useState('2025-06-01');
  const [endDate, setEndDate] = useState('2025-06-20');

  const summary = useMemo(() => {
    const totals = reportRows.reduce(
      (accumulator, row) => ({
        present: accumulator.present + row.present,
        late: accumulator.late + row.late,
        absent: accumulator.absent + row.absent,
      }),
      { present: 0, late: 0, absent: 0 },
    );

    const total = totals.present + totals.late + totals.absent;
    const rate = total ? Math.round((totals.present / total) * 100) : 0;

    return { ...totals, total, rate };
  }, []);

  return (
    <section className="panel-card">
      <div className="toolbar-row">
        <div className="date-pair">
          <div className="field-group compact">
            <label>Start date</label>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>

          <div className="field-group compact">
            <label>End date</label>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </div>

        <button className="secondary-button">Apply range</button>
      </div>

      <div className="stats-grid compact-grid">
        <article className="stat-card compact mini-stat">
          <span>Present</span>
          <strong>{summary.present}</strong>
        </article>
        <article className="stat-card compact mini-stat">
          <span>Late</span>
          <strong>{summary.late}</strong>
        </article>
        <article className="stat-card compact mini-stat">
          <span>Absent</span>
          <strong>{summary.absent}</strong>
        </article>
        <article className="stat-card compact mini-stat">
          <span>Rate</span>
          <strong>{summary.rate}%</strong>
        </article>
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
            {reportRows.map((row) => {
              const dayTotal = row.present + row.late + row.absent;
              const rate = dayTotal ? Math.round((row.present / dayTotal) * 100) : 0;

              return (
                <tr key={row.date}>
                  <td>{row.date}</td>
                  <td>{row.present}</td>
                  <td>{row.late}</td>
                  <td>{row.absent}</td>
                  <td>{rate}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
