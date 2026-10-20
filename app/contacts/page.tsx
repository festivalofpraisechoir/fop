const contacts = [
  {
    name: 'Michael Ziki',
    email: 'michaeluziki@gmail.com',
    phone: '07359113722',
    role: 'Musician',
    instrument: 'Keyboard',
    church: 'Forward in Faith Ministries',
  },
  {
    name: 'Rachid',
    email: 'rachid-renaud@hotmail.com',
    phone: '07502527539',
    role: 'Musician',
    instrument: 'Percussion drums',
    church: 'RCCG Stockpoort Road',
  },
  {
    name: 'Hans',
    email: 'hans13.hoa@gmail.com',
    phone: '07741406532',
    role: 'Musician',
    instrument: 'Drums',
    church: 'Winners Chapel Birmingham',
  },
];

export default function ContactsPage() {
  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Directory</p>
          <h1>Contacts</h1>
        </div>
        <button className="primary-button">Add contact</button>
      </header>

      <section className="panel-card">
        <div className="toolbar-row">
          <input className="search-input" placeholder="Search name, email, phone, church" />
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
              </tr>
            </thead>
            <tbody>
              {contacts.map((person) => (
                <tr key={person.email}>
                  <td>{person.name}</td>
                  <td>{person.email}</td>
                  <td>{person.phone}</td>
                  <td>{person.role}</td>
                  <td>{person.instrument}</td>
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
