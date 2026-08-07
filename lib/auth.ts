import type { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthConfig = {
  // Explicit so the auth endpoints stay at /api/auth regardless of the
  // AUTH_URL/NEXTAUTH_URL pathname. next-auth infers basePath from the URL's
  // pathname (e.g. "https://site/login" would set basePath="/login" and make
  // every /api/auth/* request fail with 400 "Bad request.").
  basePath: '/api/auth',
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 8, // 8 hours
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const adminUsername = process.env.ADMIN_USERNAME;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminUsername || !adminPassword) {
          throw new Error('Server is missing ADMIN_USERNAME/ADMIN_PASSWORD configuration.');
        }

        if (
          credentials?.username === adminUsername &&
          credentials?.password === adminPassword
        ) {
          return { id: '1', name: adminUsername, email: null } as any;
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  // v5 prefers AUTH_SECRET; NEXTAUTH_SECRET is kept as a legacy fallback so
  // either works in the Vercel project env (must exist at build+runtime).
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  // Explicit so the session/CSRF endpoints work on any host without relying
  // on VERCEL/NODE_ENV inference (Vercel already sets this to true).
  trustHost: true,
};
