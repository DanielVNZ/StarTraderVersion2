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
      const isOnPublicRoute =
        ['/sitemap.xml', '/api/sitemap', '/information', '/api/cleanup', '/api/uexgrabber', '/api/terminals', '/api/commodities', '/api/commodityprices', '/api/mergedData'].some((route) =>
          nextUrl.pathname.startsWith(route)
        ) ||
        /^\/sitemap-\d+\.xml$/.test(nextUrl.pathname) || // Dynamic sitemaps
        nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i); // Allow image files
        
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
    async session({ session, user, token }) {
      // Include the user ID in the session
      if (user?.id) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  trustHost: true, // Rely on the Host header from the incoming request
} satisfies NextAuthConfig;