'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect, useState } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    const [posthogClient, setPosthogClient] = useState<typeof posthog | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
            const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

            if (!posthogKey) {
                console.error('Error: NEXT_PUBLIC_POSTHOG_KEY is not defined. PostHog will not be initialized.');
                return;
            }

            posthog.init(posthogKey, {
                api_host: posthogHost,
                capture_pageview: false, // Disable automatic pageview capture, as we capture manually
            });

            setPosthogClient(posthog);
        }
    }, []);

    // Render children only after PostHog client is initialized
    if (!posthogClient) {
        return null; // Or a loading state
    }

    return <PHProvider client={posthogClient}>{children}</PHProvider>;
}
