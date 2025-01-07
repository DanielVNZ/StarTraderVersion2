import type { Metadata } from 'next';
import { Toaster } from 'sonner';

import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { PostHogProvider } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://startrader.space'),
  title: 'Star Trader',
  description: 'AI Chat bot to help you with trading in Star Citizen',
  keywords: 'Star Citizen trading, Star Citizen trade routes, Star Citizen commodity prices, Star Citizen economy tools, Star Citizen trade assistant, Star Citizen AI trading bot, Star Citizen market data, Star Citizen resource prices, Star Citizen trade planning, Star Citizen economy tracker, Star Citizen trade route planner, Best trade routes Star Citizen, Star Citizen profitable trade routes, Fast trade routes Star Citizen, Star Citizen trading optimization, Star Citizen trading profits, UEXCORP API Star Citizen, Star Citizen economy API, Star Citizen real-time prices, Star Citizen resource trading, Star Citizen commodities market, Trading tools for Star Citizen, Star Citizen trading calculator, Star Citizen trading strategies, Star Citizen cargo profits, Star Citizen trading guides, Star Citizen economy planner, Star Citizen commodity tracker, Star Citizen best trading tools, Star Citizen market trends, Star Citizen trade analysis, Star Citizen export tools, Star Citizen import management, Star Citizen price trends, Star Citizen profit calculator, Best cargo routes Star Citizen, Star Citizen data-driven trading, Star Citizen market predictions, Star Citizen real-time market tools, Star Citizen AI trade advisor, Star Citizen trading app, Star Citizen resource planner, Star Citizen economic analysis, Star Citizen supply and demand tracker, Star Citizen financial insights, Optimize trade routes Star Citizen, Star Citizen commodities database, Star Citizen API integration, UEXCORP.space Star Citizen tools, Star Citizen Reddit, Star Citizen, Star Citizen trading tool, Star Citizen trading routes, Star Citizen trading site, UEXCORP, Gallog, Star Citizen trading console locations, Star Citizen trading routes 4.0, SC trade tools, Star Citizen trading commodities, Star Citizen trade bot, Star Trader, Star Trader space, Star space, Trader space',
};

const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)';
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning // Avoid hydration warnings from dynamic classes
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
        <meta
          name="keywords"
          content="Star Citizen trading, Star Citizen trade routes, Star Citizen commodity prices, Star Citizen economy tools, Star Citizen trade assistant, Star Citizen AI trading bot, Star Citizen market data, Star Citizen resource prices, Star Citizen trade planning, Star Citizen economy tracker, Star Citizen trade route planner, Best trade routes Star Citizen, Star Citizen profitable trade routes, Fast trade routes Star Citizen, Star Citizen trading optimization, Star Citizen trading profits, UEXCORP API Star Citizen, Star Citizen economy API, Star Citizen real-time prices, Star Citizen resource trading, Star Citizen commodities market, Trading tools for Star Citizen, Star Citizen trading calculator, Star Citizen trading strategies, Star Citizen cargo profits, Star Citizen trading guides, Star Citizen economy planner, Star Citizen commodity tracker, Star Citizen best trading tools, Star Citizen market trends, Star Citizen trade analysis, Star Citizen export tools, Star Citizen import management, Star Citizen price trends, Star Citizen profit calculator, Best cargo routes Star Citizen, Star Citizen data-driven trading, Star Citizen market predictions, Star Citizen real-time market tools, Star Citizen AI trade advisor, Star Citizen trading app, Star Citizen resource planner, Star Citizen economic analysis, Star Citizen supply and demand tracker, Star Citizen financial insights, Optimize trade routes Star Citizen, Star Citizen commodities database, Star Citizen API integration, UEXCORP.space Star Citizen tools, Star Citizen Reddit, Star Citizen, Star Citizen trading tool, Star Citizen trading routes, Star Citizen trading site, UEXCORP, Gallog, Star Citizen trading console locations, Star Citizen trading routes 4.0, SC trade tools, Star Citizen trading commodities, Star Citizen trade bot, Star Trader, Star Trader space, Star space, Trader space"
        />
        <link rel="canonical" href="https://startrader.space" />
      </head>
      <body className="antialiased">
        <PostHogProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Toaster position="top-center" />
            <header style={{
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: '0',
  border: '0',
  clip: 'rect(0 0 0 0)',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
}}>
  <h1>Star Trader: Your AI Companion for Star Citizen Trading</h1>
  <h2>with UEXCORP API data you can ensure accuracy with trade route planning for Star Citizen</h2>
</header>

            {children}
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
