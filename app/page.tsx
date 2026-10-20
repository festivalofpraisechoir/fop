import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">FOP</div>
          <div>
            <p className="eyebrow">Festival of Praise</p>
            <h1>Attendance portal</h1>
          </div>
        </div>

        <div className="auth-form">
          <div className="field-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" defaultValue="operations@festivalofpraise.org" />
          </div>

          <div className="field-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" defaultValue="••••••••" />
          </div>

          <div className="auth-meta">
            <label className="checkbox-row">
              <input type="checkbox" defaultChecked />
              <span>Keep me signed in</span>
            </label>
            <Link href="/dashboard">Forgot password?</Link>
          </div>

          <Link href="/dashboard" className="primary-button full-width">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
