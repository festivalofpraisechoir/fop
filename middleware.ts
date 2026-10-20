import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (request.nextUrl.pathname === '/login') return response;
    const destination = request.nextUrl.clone();
    destination.pathname = '/login';
    destination.searchParams.set('setup', 'supabase');
    return NextResponse.redirect(destination);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = path === '/login' || path === '/register' || path === '/access-denied' || path.startsWith('/check-in/');

  if (!user && !isPublic) {
    const destination = request.nextUrl.clone();
    destination.pathname = '/login';
    destination.searchParams.set('next', path);
    return NextResponse.redirect(destination);
  }

  if (user && !isPublic && !['admin', 'super_admin'].includes(String(user.app_metadata?.role || ''))) {
    const destination = request.nextUrl.clone();
    destination.pathname = '/access-denied';
    destination.search = '';
    return NextResponse.redirect(destination);
  }

  if (user && path === '/login') {
    const destination = request.nextUrl.clone();
    destination.pathname = '/dashboard';
    return NextResponse.redirect(destination);
  }

  if (user && path === '/reports' && user.app_metadata?.role !== 'super_admin') {
    const destination = request.nextUrl.clone();
    destination.pathname = '/attendance';
    destination.search = '';
    return NextResponse.redirect(destination);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
