import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

// Protect every /admin route (page and nested paths). API routes used by the
// dashboard are protected separately inside each route handler because
// withAuth's redirect behavior isn't appropriate for fetch/JSON endpoints.
export const config = {
  matcher: ['/admin/:path*'],
};
