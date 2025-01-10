import { compare } from 'bcrypt-ts';
import NextAuth, { type User, type Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { v4 as uuidv4 } from 'uuid'; // Import UUID generator
import { getUser, createUser } from '@/lib/db/queries'; // Assuming `createUser` is implemented for user creation
import { authConfig } from './auth.config';

// Extend the Session interface to include user details
interface ExtendedSession extends Session {
  user: User;
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    // Standard Login with Email and Password
    Credentials({
      id: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials || typeof credentials.email !== 'string' || typeof credentials.password !== 'string') {
          console.error('Invalid email or password');
          return null;
        }

        try {
          const users = await getUser(credentials.email);
          if (users.length === 0) {
            console.error(`No user found with email: ${credentials.email}`);
            return null;
          }

          const passwordsMatch = await compare(credentials.password, users[0].password!);
          if (!passwordsMatch) {
            console.error('Invalid password');
            return null;
          }

          console.log('User authenticated successfully:', users[0]);
          return users[0] as User;
        } catch (error) {
          console.error('Error during user authentication:', error);
          return null;
        }
      },
    }),

    // Guest Login Provider
    Credentials({
      id: 'guest',
      name: 'Guest Login',
      credentials: {},
      async authorize() {
        try {
          const guestUuid = uuidv4();
          const guestEmail = `guest_${guestUuid}@example.com`;
          const guestPassword = uuidv4();

          const [createdUser] = await createUser(guestEmail, guestPassword);

          if (!createdUser || !createdUser.id) {
            console.error('Failed to create guest user - no user ID returned');
            return null;
          }

          const guestUser = {
            id: createdUser.id,
            email: guestEmail,
            name: 'Guest User',
          };

          return guestUser as User;
        } catch (error) {
          console.error('Error during guest login:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    // JWT Callback: Include user ID in the token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    // Session Callback: Include user ID in the session
    async session({
      session,
      token,
    }: {
      session: ExtendedSession;
      token: any;
    }) {
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
