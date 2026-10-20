'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicPage = pathname === '/login' || pathname === '/register' || pathname === '/reset-password' || pathname.startsWith('/check-in/');
  if (publicPage) return <>{children}</>;
  return <div className="app-shell"><Sidebar /><main className="main-panel">{children}</main></div>;
}
