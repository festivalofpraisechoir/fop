'use client';

import { useMemo, useState } from 'react';
import { contacts, type Contact } from '@/lib/mock-data';

export function ContactDirectory() {
  const [query, setQuery] = useState('');

  const filteredContacts = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return contacts;

    return contacts.filter((contact) => {
      const searchText = [
        contact.name,
        contact.email,
        contact.phone,
        contact.church,
        contact.partOrInstrument,
      ]
        .join(' ')
        .toLowerCase();

      return searchText.includes(value);
    });
  }, [query]);

  return (
    <section className="panel-card">
      <div className="toolbar-row">
        <input
          className="search-input"
          placeholder="Search name, email, phone, church"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="filter-group">
          <button className="secondary-button">Filter</button>
          <button className="secondary-button">Import</button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Type</th>
              <th>Instrument / Part</th>
              <th>Church</th>
              <th>Letter</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.map((person: Contact) => (
              <tr key={person.id}>
                <td>{person.name}</td>
                <td>{person.email}</td>
                <td>{person.phone}</td>
                <td>{person.type}</td>
                <td>{person.partOrInstrument}</td>
                <td>{person.church}</td>
                <td>
                  <span className={person.churchLetterSubmitted ? 'status-pill success' : 'status-pill neutral'}>
                    {person.churchLetterSubmitted ? 'Yes' : 'No'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
