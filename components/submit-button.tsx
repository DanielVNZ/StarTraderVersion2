'use client';

import { useFormStatus } from 'react-dom';

import { LoaderIcon } from '@/components/icons';

import { Button } from './ui/button';

export function SubmitButton({
  children,
  isSuccessful,
}: {
  children: React.ReactNode;
  isSuccessful: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="w-full max-w-[350px] relative inline-flex items-center justify-center rounded-md bg-blue-500 px-5 py-4 text-base font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-blue-600"
      type="submit"
      disabled={isSuccessful}
    >
      {children}
    </button>
  );
}
