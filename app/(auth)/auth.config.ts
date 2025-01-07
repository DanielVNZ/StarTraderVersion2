import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  providers: [
    // Providers added later in auth.ts since they may require bcrypt or other Node.js dependencies.
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      // Publicly accessible routes
      const isOnPublicRoute = ['/sitemap.xml', '/api/sitemap'].some((route) =>
        nextUrl.pathname.startsWith(route)
      );

      const isOnChat = nextUrl.pathname.startsWith('/');
      const isOnRegister = nextUrl.pathname.startsWith('/register');
      const isOnLogin = nextUrl.pathname.startsWith('/login');

      // Allow public routes without authentication
      if (isOnPublicRoute) {
        return true;
      }

      // Redirect logged-in users away from login and register pages
      if (isLoggedIn && (isOnLogin || isOnRegister)) {
        return Response.redirect(new URL('/', nextUrl as unknown as URL));
      }

      // Allow access to register and login pages
      if (isOnRegister || isOnLogin) {
        return true;
      }

      // Restrict access to chat if not logged in
      if (isOnChat) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      // Redirect logged-in users to home
      if (isLoggedIn) {
        return Response.redirect(new URL('/', nextUrl as unknown as URL));
      }

      return true; // Default to allowing access
    },
  },
  trustHost: true, // Rely on the Host header from the incoming request
} satisfies NextAuthConfig;
