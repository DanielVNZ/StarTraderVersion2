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
            className="rounded-full"
            color="secondary"
            onClick={() => setShowIframe(!showIframe)} // Toggle iframe visibility
          >
            Buy me a ☕ ($3 NZD)
          </Button2>

          {/* GitHub Button */}
          <Button2
            className="rounded-full"
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
          <Button
            className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900 absolute top-2 right-2 py-1.5 px-2 h-fit"
            onClick={() => setShowIframe(false)} // Close iframe
          >
            😭 Close Window
          </Button>
          <iframe
            id="kofiframe"
            src="https://ko-fi.com/danielvnz/?hidefeed=true&widget=true&embed=true&preview=true"
            style={{
              border: 'none',
              width: '100%',
              height: '130%',
              background: '#f9f9f9',
            }}
            title="danielvnz"
          />
        </div>
      )}
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
