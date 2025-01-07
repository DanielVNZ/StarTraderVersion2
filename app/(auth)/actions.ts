'use server';

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator
import { createUser, getUser } from '@/lib/db/queries';

import { signIn } from './auth';

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};

export interface RegisterActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'invalid_data';
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    const [user] = await getUser(validatedData.email);

    if (user) {
      return { status: 'user_exists' } as RegisterActionState;
    }
    await createUser(validatedData.email, validatedData.password);
    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};

export interface GuestLoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed';
}

// Guest Login Action
export const guestLogin = async (
  _: GuestLoginActionState,
): Promise<GuestLoginActionState> => {
  try {
    // Generate a random email and password for the guest
    const guestEmail = `${uuidv4()}@example.com`;  // Generate a unique email
    const guestPassword = uuidv4();  // Generate a random password

    // Validate the guest credentials using the same schema as in the register function
    const validatedData = authFormSchema.parse({
      email: guestEmail,
      password: guestPassword,
    });

    // Check if the guest user already exists
    const existingGuest = await getUser(validatedData.email);
    if (existingGuest.length > 0) {
      console.log('Returning existing guest user:', existingGuest[0]);
      // If the guest exists, sign in the user
      await signIn('credentials', {
        email: validatedData.email,
        password: validatedData.password,
        redirect: false, // Prevent redirection
      });
      return { status: 'success' }; // Return success
    }

    // Create a new guest user if one does not exist
    await createUser(validatedData.email, validatedData.password);

    // Sign in the newly created guest user
    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false, // Prevent redirection
    });

    console.log('Guest user registered and logged in:', validatedData.email);

    return { status: 'success' }; // Return success after guest login

  } catch (error) {
    console.error('Error during guest login:', error);
    return { status: 'failed' }; // Return failure status if any error occurs
  }
};
