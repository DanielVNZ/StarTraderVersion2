'use client';

import { useTheme } from 'next-themes';
import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDownIcon } from '@/components/icons';
import { useRouter } from 'next/navigation';

export default function InformationPage() {
  const { theme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showIframe, setShowIframe] = useState(false);
  const router = useRouter();

  const toggleIframe = () => setShowIframe((prev) => !prev);

  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-24 bg-background">
      {/* Header */}
      <div className="fixed top-0 w-full p-4 flex justify-between items-center">
        <div className="flex gap-2">
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger
              asChild
              className="absolute left-0 ml-4 w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
            >
              <Button variant="outline" className="md:px-2 md:h-[34px]">
                <span className="text-sm font-medium">Menu</span>
                <ChevronDownIcon size={12} />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="min-w-[300px]">
              <DropdownMenuItem
                className="gap-2 group/item flex flex-row justify-left items-center"
                onClick={() => router.push('/')}
              >
                <span>🏠</span>
                <span>Home</span>
              </DropdownMenuItem>
              <hr className="border-t border-gray-200" />
              <DropdownMenuItem
                className="gap-2 group/item flex flex-row justify-left items-center"
                onClick={toggleIframe}
              >
                <span>☕</span>
                <span>Buy me a Coffee</span>
              </DropdownMenuItem>
              <hr className="border-t border-gray-200" />
              <DropdownMenuItem
                className="gap-2 group/item flex flex-row justify-left items-center"
                onClick={() => window.open('https://github.com/DanielVNZ/StarTraderVersion2', '_blank')}
              >
                <span>⭐</span>
                <span>Star on GitHub</span>
              </DropdownMenuItem>
              <hr className="border-t border-gray-200" />
              <DropdownMenuItem
                className="gap-2 group/item flex flex-row justify-left items-center"
                onClick={() => window.open('https://discord.gg/zy9x4UKwsw', '_blank')}
              >
                <span>👋</span>
                <span>Join our Discord</span>
              </DropdownMenuItem>
              <hr className="border-t border-gray-200" />
              <DropdownMenuItem
                className="gap-2 group/item flex flex-row justify-left items-center"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <span>{theme === 'dark' ? '🌞' : '🌙'}</span>
                <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl w-full mt-16">
        <h1 className="text-4xl font-bold mb-8 text-center">Star Trader Information</h1>

        <div className="space-y-8">
          {/* About Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">About Star Trader</h2>
            <p className="text-muted-foreground">
              Star Trader is your AI-powered companion for Star Citizen trading. Using real-time data from the UEXCORP API, 
              we help you find the most profitable trade routes and make informed decisions about your trading activities.
            </p>
          </section>

          {/* Features Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Key Features</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Real-time commodity pricing data</li>
              <li>AI-powered trade route suggestions</li>
              <li>Profit margin calculations</li>
              <li>Location-based price comparisons</li>
              <li>Historical price tracking</li>
              <li>User-friendly chat interface</li>
            </ul>
          </section>

          {/* How It Works Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">How It Works</h2>
            <div className="text-muted-foreground space-y-2">
              <p>
                Star Trader combines advanced AI technology with real-time market data to provide you with accurate 
                trading information. Simply ask questions in natural language, and our AI will help you:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Find the best prices for buying and selling commodities</li>
                <li>Discover profitable trade routes</li>
                <li>Get detailed information about trading locations</li>
                <li>Calculate potential profits</li>
              </ul>
            </div>
          </section>

          {/* Data Sources Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Data Sources</h2>
            <p className="text-muted-foreground">
              Our data is sourced directly from the UEXCORP API, ensuring you have access to the most current and 
              accurate trading information in the Star Citizen universe. Prices and availability are updated regularly 
              to reflect the dynamic in-game economy.
            </p>
          </section>

          
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

      </div>
    </div>
    
  );
}