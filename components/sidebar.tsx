export function Sidebar() {
  const items = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Contacts', href: '/contacts' },
    { label: 'Attendance', href: '/attendance' },
    { label: 'Reports', href: '/reports' },
  ];

  return (
    <aside className="sidebar">
      <div className="brand-wrap">
        <div className="brand-mark small">FOP</div>
        <div>
          <span className="brand-name">Festival of Praise</span>
          <small>Operations</small>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <a key={item.label} href={item.href} className="nav-item">
            {item.label}
          </a>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span>Admin access</span>
        <strong>Super admin</strong>
      </div>
    </aside>
  );
}
