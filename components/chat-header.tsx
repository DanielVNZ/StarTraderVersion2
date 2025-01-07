'use client';

import { useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';
import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { PlusIcon } from './icons';
import { useSidebar } from './ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Button as Button2, ButtonGroup } from '@nextui-org/react';
import { type VisibilityType, VisibilitySelector } from '@/components/visibility-selector';
import posthog from 'posthog-js'


posthog.init('phc_hf6aHkwqcMFrKU4jQf1o4laa4ROxMJtzyWFfCid0dNT',
  {
      api_host: 'https://us.i.posthog.com',
      person_profiles: 'always' 
  }
)


function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const { width: windowWidth } = useWindowSize();
  const [showIframe, setShowIframe] = useState(false); // State to toggle iframe visibility

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="order-2 md:order-1 md:px-2 px-2 md:h-fit ml-auto md:ml-0"
              onClick={() => {
                router.push('/');
                router.refresh();
              }}
            >
              <PlusIcon />
              <span className="md:sr-only">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
      )}

      {!isReadonly && (
        <ModelSelector
          selectedModelId={selectedModelId}
          className="order-1 md:order-2"
        />
      )}

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          className="order-1 md:order-3"
        />
      )}

      {/* Desktop Buttons */}
      <div className="flex-col items-end order-4 md:ml-auto hidden md:flex">
        <ButtonGroup className="flex gap-4">
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
              window.open(
                'https://github.com/DanielVNZ/StarTraderVersion2',
                '_blank'
              )
            } // Open GitHub in a new tab
          >
            ⭐ on Github
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
        </ButtonGroup>
      </div>

      {/* Mobile Buttons */}
      <div className="flex gap-4 md:hidden order-4 ml-auto">
        {/* Mobile Ko-fi Button */}
        <Button2
          className="rounded-full text-lg"
          color="secondary"
          onPress={() => window.open('https://ko-fi.com/danielvnz', '_blank')} // Open Ko-fi link in a new tab
        >
          ☕
        </Button2>

        {/* Mobile GitHub Button */}
        <Button2
          className="rounded-full text-lg"
          color="secondary"
          onPress={() =>
            window.open(
              'https://github.com/DanielVNZ/StarTraderVersion2',
              '_blank'
            )
          } // Open GitHub in a new tab
        >
          ⭐
        </Button2>
        <Button2
          className="rounded-full text-lg"
          color="secondary"
          onPress={() =>
            window.open(
              'https://discord.gg/zy9x4UKwsw',
              '_blank'
            )
          } // Open GitHub in a new tab
        >
          👋
        </Button2>
      </div>

      {/* Conditionally render the iframe */}
      {showIframe && (
  <div
    className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 rounded-md"
    style={{
      zIndex: 2147483647, // Very high z-index to ensure it appears above everything
    }}
  >
    <div
      className="bg-white shadow-lg rounded-md relative"
      style={{
        width: '400px',
        height: '680px',
        border: '5px solid #11CADF',
        zIndex: 2147483647,
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        top: '20px', // Slight padding from the top  
        borderRadius: '20px', 
      }}
    >
      <iframe
        id="kofiframe"
        src="https://ko-fi.com/danielvnz/?hidefeed=true&widget=true&embed=true&preview=true"
        style={{
          border: 'none',
          width: '100%',
          height: 'calc(100% - 50px)', // Adjust iframe height to account for button
          background: '#f9f9f9',
          borderRadius: '16px',
        }}
        title="danielvnz"
      />
      <Button
  className="bg-red-500 hover:bg-red-700 text-white absolute bottom-2 left-1/2 transform -translate-x-1/2 py-1.5 px-2 h-fit"
  onClick={() => setShowIframe(false)} // Close iframe
>
  😭 Close Window
</Button>
    </div>
  </div>
)}



    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
