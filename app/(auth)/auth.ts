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
          console.log('Guest login initiated');
    
          // Generate a temporary UUID for guest email and password
          const guestEmail = `${uuidv4()}@example.com`;
          const guestPassword = uuidv4(); // Temporary password
    
          // Check if the guest user already exists
          const existingGuest = await getUser(guestEmail);
          if (existingGuest.length > 0) {
            console.log('Returning existing guest user:', existingGuest[0]);
            return existingGuest[0] as User; // Return the existing guest user
          }
    
          // Insert guest user into the User table
          const guestId = uuidv4(); // Unique guest ID
          await createUser(guestEmail, guestPassword); // Ensure createUser inserts a user with guestId
    
          // Construct the guest user object
          const guestUser = {
            id: guestId,  // Use the newly generated guestId
            email: guestEmail,
            name: 'Guest User',
          };
    
          console.log('Guest user created:', guestUser);
          return guestUser as User; // Return the guest user object
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
