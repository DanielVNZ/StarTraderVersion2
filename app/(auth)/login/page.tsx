'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, startTransition } from 'react';
import { toast } from 'sonner';
import { Button as Button2, } from '@nextui-org/react';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import {
  login,
  type LoginActionState,
  guestLogin,
  type GuestLoginActionState,
} from '../actions';

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
  const [showIframe, setShowIframe] = useState(false); // State to toggle iframe visibility

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
    
    <div className="relative flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      {/* Top-Right Buttons for Desktop */}
      <div className="absolute top-4 right-4 hidden md:flex gap-4">
        {/* Ko-fi Button */}
        <Button2
          className="rounded-full hover:bg-secondary-light hover:text-brown-600 transition text-lg"
          color="secondary"
          onPress={() => setShowIframe(!showIframe)} // Toggle iframe visibility
        >
          Buy me a ☕ ($3 NZD)
        </Button2>

        {/* GitHub Button */}
        <Button2
          className="rounded-full hover:bg-secondary-light hover:text-yellow-400 transition text-lg"
          color="secondary"
          onPress={() =>
            window.open('https://github.com/DanielVNZ/StarTraderVersion2', '_blank')
          } // Open GitHub in a new tab
        >
          ⭐ on GitHub
        </Button2>
        <Button2
            className="rounded-full hover:bg-secondary-light hover:text-yellow-400 transition text-lg"
            color="secondary"
            onPress={() =>
              window.open(
                'https://discord.gg/zy9x4UKwsw',
                '_blank'
              )
            } // Open GitHub in a new tab
          >
            👋 Join our Discord
          </Button2>
      </div>

      {/* Main Content */}
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
      className="relative inline-flex items-center justify-center rounded-md bg-blue-500 px-5 py-3 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-blue-600"
      style={{ margin: '0 auto' }}
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

  {/* Mobile Buttons Below the Text */}
  <div className="flex flex-col md:hidden justify-center gap-4 mt-4 items-center bg-background">
    {/* Mobile Ko-fi Button */}
    <Button2
      className="rounded-full bg-secondary hover:bg-secondary-light text-white transition text-lg px-6 py-6 flex items-center justify-center"
      color="secondary"
      onPress={() => window.open('https://ko-fi.com/danielvnz', '_blank')} // Open Ko-fi link in a new tab
    >
      Buy me a ☕
    </Button2>

    {/* Mobile GitHub Button */}
    <Button2
      className="rounded-full bg-secondary hover:bg-secondary-light text-white transition text-lg px-6 py-6 flex items-center justify-center"
      color="secondary"
      onPress={() =>
        window.open('https://github.com/DanielVNZ/StarTraderVersion2', '_blank')
      } // Open GitHub in a new tab
    >
      ⭐ on GitHub
    </Button2>

    {/* Mobile Discord Button */}
    <Button2
      className="rounded-full bg-secondary hover:bg-secondary-light text-white transition text-lg px-6 py-6 flex items-center justify-center"
      color="secondary"
      onPress={() =>
        window.open('https://discord.gg/zy9x4UKwsw', '_blank')
      } // Open Discord in a new tab
    >
      👋 Join our Discord
    </Button2>
  </div>
</div>


      {/* Conditionally render the iframe */}
      {showIframe && (
        <div
          className="fixed top-0 right-0 bg-white shadow-lg rounded-md"
          style={{
            width: '400px',
            height: '500px',
            border: '1px solid #ccc',
            zIndex: 1000,
          }}
        >
          <Button2
            className="absolute top-2 right-2 py-1.5 px-2 h-fit"
            onPress={() => setShowIframe(false)} // Close iframe
          >
            Close
          </Button2>
          <iframe
            id="kofiframe"
            src="https://ko-fi.com/danielvnz/?hidefeed=true&widget=true&embed=true&preview=true"
            style={{
              border: 'none',
              width: '100%',
              height: '100%',
              background: '#f9f9f9',
            }}
            title="Support me on Ko-fi"
          />
        </div>
      )}
    </div>
  );
}
