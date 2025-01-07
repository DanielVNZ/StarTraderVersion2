'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, startTransition } from 'react';
import { toast } from 'sonner';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';

import { login, type LoginActionState, guestLogin, type GuestLoginActionState } from '../actions';

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);

  // State for login
  const [loginState, setLoginState] = useState<LoginActionState>({
    status: 'idle',
  });

  // State for guest login
  const [guestState, setGuestState] = useState<GuestLoginActionState>({
    status: 'idle',
  });

  const [isLoading, setIsLoading] = useState(false); // For loading state

  useEffect(() => {
    if (loginState.status === 'failed') {
      toast.error('Invalid credentials!');
    } else if (loginState.status === 'success') {
      setIsSuccessful(true);
      router.refresh();
    }
  }, [loginState.status, router]);

  useEffect(() => {
    if (guestState.status === 'failed') {
      toast.error('Guest login failed. Please try again.');
    } else if (guestState.status === 'success') {
      toast.success('Logged in as Guest!');
      router.push('/'); // Redirect after successful guest login
    }
  }, [guestState.status, router]);

  const handleSubmit = async (formData: FormData) => {
    setEmail(formData.get('email') as string);
    setLoginState({ status: 'in_progress' });

    try {
      const result = await login(loginState, formData);
      setLoginState(result);
    } catch {
      setLoginState({ status: 'failed' });
    }
  };

  const handleGuestLogin = () => {
    setIsLoading(true); // Set loading state to true
    setGuestState({ status: 'in_progress' });

    startTransition(async () => {
      try {
        const result = await guestLogin(guestState);
        setGuestState(result);
      } catch {
        setGuestState({ status: 'failed' });
      } finally {
        setIsLoading(false); // Reset loading state
      }
    });
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Welcome back to Star Trader</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Use your email and password to sign in or continue as a guest.
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          {/* Standard Sign-In Button */}
          <SubmitButton isSuccessful={isSuccessful}>Start Trading</SubmitButton>
        </AuthForm>

        {/* Guest Login Button */}
        <div className="text-center">
          <button
            onClick={handleGuestLogin}
            className="relative inline-flex items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-blue-600"
            style={{ width: 'fit-content', margin: '0 auto' }}
            disabled={isLoading} // Disable the button while loading
          >
            {isLoading ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
                />
              </svg>
            ) : (
              'Continue as Guest'
            )}
          </button>
        </div>

        <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
          {"Don't have an account? "}
          <Link
            href="/register"
            className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
          >
            Sign up
          </Link>
          {' for free. No email verification required!'}
        </p>
      </div>
    </div>
  );
}
