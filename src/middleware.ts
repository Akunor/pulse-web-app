import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Allow update-password page to be accessed with either a session or recovery token
  if (req.nextUrl.pathname === '/update-password') {
    const token = req.nextUrl.searchParams.get('token');
    if (session || token) {
      return res;
    }
    // If no session and no token, redirect to home
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Rest of your middleware logic...
} 