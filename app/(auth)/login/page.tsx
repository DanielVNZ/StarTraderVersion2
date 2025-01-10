'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, startTransition } from 'react';
import { toast } from 'sonner';
import { Button as Button2, } from '@nextui-org/react';
import { createPortal } from 'react-dom';
import { useFormStatus } from 'react-dom';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { EnhancedDropdown } from '@/components/enhanced-dropdown'
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
  const { setTheme, theme } = useTheme();

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

  const toggleIframe = () => setShowIframe((prev) => !prev);


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

  function StartTradingButton({ isSuccessful }: { isSuccessful: boolean }) {
    const { pending } = useFormStatus();

    return (
      <Button
        type="submit"
        variant="default"
        className="w-full px-5 py-4 text-base"
        disabled={pending || isSuccessful}
      >
        {pending ? (
          <svg
            className="animate-spin h-5 w-5"
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
          'Start Trading'
        )}
      </Button>
    );
  }

  return (
    
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 relative">
  {/* Top Bar */}
  <div className="w-full fixed top-0 left-0 z-20 bg-background px-4 py-2 flex flex-wrap items-center justify-between gap-4">
    {/* Left Section - Dropdown and Theme Toggle */}
    <div className="flex items-center gap-4">
      <EnhancedDropdown toggleIframe={toggleIframe} router={router} />
      <Button
        variant="default"
        className="px-4 py-2 text-sm"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'light' ? 'Toggle Dark Theme 🌙' : 'Toggle Light Theme ☀️'}
      </Button>
    </div>

    {/* Right Section - Desktop Buttons */}
    <div className="hidden md:flex items-center gap-4">
      <Button
        variant="default"
        className="px-4 py-2 text-sm"
        onClick={() => setShowIframe(!showIframe)}
      >
        Buy me a ☕ ($3 NZD)
      </Button>
      <Button
        variant="default"
        className="px-4 py-2 text-sm"
        onClick={() => window.open('https://github.com/DanielVNZ/StarTraderVersion2', '_blank')}
      >
        ⭐ on GitHub
      </Button>
      <Button
        variant="default"
        className="px-4 py-2 text-sm"
        onClick={() => window.open('https://discord.gg/zy9x4UKwsw', '_blank')}
      >
        👋 Join our Discord
      </Button>
    </div>

    {/* Mobile Buttons */}
    <div className="flex md:hidden items-center gap-2 justify-center w-full">
      <Button
        variant="default"
        className="p-2 text-sm min-w-0"
        onClick={() => window.open('https://ko-fi.com/danielvnz', '_blank')}
      >
        ☕
      </Button>
      <Button
        variant="default"
        className="p-2 text-sm min-w-0"
        onClick={() => window.open('https://github.com/DanielVNZ/StarTraderVersion2', '_blank')}
      >
        ⭐
      </Button>
      <Button
        variant="default"
        className="p-2 text-sm min-w-0"
        onClick={() => window.open('https://discord.gg/zy9x4UKwsw', '_blank')}
      >
        👋
      </Button>
    </div>
  </div>


      {/* Buy Me a Coffee Iframe */}
      {showIframe && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
            onClick={toggleIframe}
          >
            <div
              className="bg-white shadow-lg rounded-md relative max-h-[90vh] max-w-[95vw]"
              style={{
                width: '400px',
                height: '680px',
                border: '5px solid #11CADF',
                borderRadius: '20px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src="https://ko-fi.com/danielvnz/?hidefeed=true&widget=true&embed=true&preview=true"
                style={{
                  border: 'none',
                  width: '100%',
                  height: 'calc(100% - 50px)',
                  background: '#f9f9f9',
                  borderRadius: '16px',
                }}
                title="Buy me a coffee"
              />
              <Button
                className="bg-red-500 hover:bg-red-700 text-white absolute bottom-2 left-1/2 transform -translate-x-1/2 py-1.5 px-2 h-fit"
                onClick={toggleIframe}
              >
                😭 Close Window
              </Button>
            </div>
          </div>
        )}

      {/* Main Content */}
      <div className="mx-auto flex w-full flex-col justify-center items-center sm:w-[450px] md:w-[1000px] mt-16 md:mt-0">
        {/* Title - Centered above everything */}
        <div className="text-center mb-12 max-w-[600px]">
          <h3 className="text-2xl font-semibold dark:text-zinc-50">Welcome back to Star Trader</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">
            Sign in with your email and password or continue as a guest
          </p>
        </div>

        {/* Login Options Container */}
        <div className="w-full flex flex-col md:flex-row justify-center items-center space-y-6 md:space-y-0 md:space-x-12">
          {/* Left Side - Login Form */}
          <div className="w-full md:w-[450px] px-6 flex flex-col items-center">
            <div className="w-full">
              <AuthForm action={handleSubmit} defaultEmail={email}>
                <div className="flex flex-col items-center w-full">
                  <StartTradingButton isSuccessful={isSuccessful} />
                </div>
              </AuthForm>
            </div>

            {/* Sign up text */}
            <p className="text-center text-sm text-gray-600 mt-8 dark:text-zinc-400">
              {"Don't have an account? "}
              <Link
                href="/register"
                className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              >
                Sign up
              </Link>
              {' for free'}
            </p>
          </div>

          {/* Center Divider - Desktop Only */}
          <div className="hidden md:flex flex-col items-center justify-center">
            <div className="relative h-32">
              <div className="absolute top-1/2 -translate-y-1/2 bg-gray-200 dark:bg-zinc-700 w-[1px] h-full"></div>
            </div>
            <span className="bg-background dark:text-zinc-400 text-gray-500 px-4 text-base font-medium">
              or
            </span>
            <div className="relative h-32">
              <div className="absolute top-1/2 -translate-y-1/2 bg-gray-200 dark:bg-zinc-700 w-[1px] h-full"></div>
            </div>
          </div>

          {/* Right Side - Guest Login */}
          <div className="w-full md:w-[450px] px-6 flex flex-col items-center">
            <div className="w-full" style={{ maxWidth: '280px' }}>
              <Button
                variant="default"
                onClick={handleGuestLogin}
                className="w-full px-5 py-4 text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <svg
                    className="animate-spin h-5 w-5"
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
              </Button>
              <p className="text-center text-sm text-gray-500 dark:text-zinc-400 mt-3">
                Consider creating an account to save your chat history
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Render iframe in a portal */}
      {showIframe && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2147483647, // Maximum possible z-index
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
          }}
          onClick={() => setShowIframe(false)}
        >
          <div
            className="bg-white shadow-lg rounded-md relative max-h-[90vh] max-w-[95vw]"
            style={{
              width: '400px',
              height: '680px',
              border: '5px solid #11CADF',
              borderRadius: '20px',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            <iframe
              id="kofiframe"
              src="https://ko-fi.com/danielvnz/?hidefeed=true&widget=true&embed=true&preview=true"
              style={{
                border: 'none',
                width: '100%',
                height: 'calc(100% - 50px)',
                background: '#f9f9f9',
                borderRadius: '16px',
              }}
              title="Support me on Ko-fi"
            />
            <Button2
              className="bg-red-500 hover:bg-red-700 text-white absolute bottom-2 left-1/2 transform -translate-x-1/2 py-1.5 px-2 h-fit"
              onPress={() => setShowIframe(false)}
            >
              😭 Close Window
            </Button2>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
