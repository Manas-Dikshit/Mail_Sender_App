import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
  }

  return NextResponse.next();
});

// Protect every /admin route (page and nested paths). API routes used by the
// dashboard are protected separately inside each route handler because
// proxy redirect behavior isn't appropriate for fetch/JSON endpoints.
export const config = {
  matcher: ['/admin/:path*'],
};
