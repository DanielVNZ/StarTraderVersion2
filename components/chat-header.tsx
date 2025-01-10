'use client';

import { useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';
import { createPortal } from 'react-dom';
import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { PlusIcon } from './icons';
import { useSidebar } from './ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { type VisibilityType, VisibilitySelector } from '@/components/visibility-selector';
import posthog from 'posthog-js';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteOldChats } from '@/app/actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDownIcon } from './icons';
import { cn } from '@/lib/utils';


posthog.init('phc_hf6aHkwqcMFrKU4jQf1o4laa4ROxMJtzyWFfCid0dNT', {
  api_host: 'https://us.i.posthog.com',
  person_profiles: 'always',
});

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
}& React.ComponentProps<typeof Button>) {
  const [open2, setOpen] = useState(false);
  const router = useRouter();
  const { open } = useSidebar();
  const { width: windowWidth } = useWindowSize();
  const [showIframe, setShowIframe] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [daysToDelete, setDaysToDelete] = useState('3');

  const handleDeleteOldChats = async () => {
    try {
      const days = parseInt(daysToDelete);
      if (isNaN(days) || days < 1) {
        toast.error('Please enter a valid number of days');
        return;
      }

      const result = await deleteOldChats(days);
      if (result.status === 'success') {
        toast.success(`Successfully deleted ${result.count} old chats`);
        setShowDeleteDialog(false);
        window.location.reload();
      } else {
        toast.error('Failed to delete old chats');
      }
    } catch (error) {
      toast.error('Failed to delete old chats');
      console.error(error);
    }
  };

  return (
    <>
      <header className="flex top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
        <div className="flex items-center gap-2">
          {/* Dropdown Button - Far Left */}
          <DropdownMenu open={open2} onOpenChange={setOpen}>
  <DropdownMenuTrigger 
  asChild 
  className={cn(
    'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
  )}
  >
    <Button variant="outline" className="md:px-2 md:h-[34px]">
      <span className="text-sm font-medium">Menu</span>
      <ChevronDownIcon size={12} />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent
align="start" 
className="min-w-[300px]"
  >
    <DropdownMenuItem
      className="gap-2 group/item flex flex-row justify-left items-center"
      onClick={() => router.push('/information')}
    >
      <span>ℹ️</span>
      <span>Information</span>
    </DropdownMenuItem>
    <hr className="border-t border-gray-200" />
    <DropdownMenuItem
      className="gap-2 group/item flex flex-row justify-left items-center"
      onClick={() => setShowIframe(!showIframe)}
    >
      <span>☕</span>
      <span>Buy me a Coffee</span>
    </DropdownMenuItem>
    <hr className="border-t border-gray-200" />
    <DropdownMenuItem
      className="gap-2 group/item flex flex-row justify-left items-cente"
      onClick={() =>
        window.open('https://github.com/DanielVNZ/StarTraderVersion2', '_blank')
      }
    >
      <span>⭐</span>
      <span>Star on GitHub</span>
    </DropdownMenuItem>
    <hr className="border-t border-gray-200" />
    <DropdownMenuItem
      className="gap-2 group/item flex flex-row justify-left items-cente"
      onClick={() =>
        window.open('https://discord.gg/zy9x4UKwsw', '_blank')
      }
    >
      <span>👋</span>
      <span>Join our Discord</span>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>


        </div>

        <div className="flex items-center gap-2">
          <SidebarToggle />
        </div>

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
      </header>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Old Chats</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="days">Delete chats older than (days)</Label>
              <Input
                id="days"
                type="number"
                value={daysToDelete}
                onChange={(e) => setDaysToDelete(e.target.value)}
                min="1"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleDeleteOldChats}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showIframe &&
        createPortal(
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2147483647,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
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
              onClick={(e) => e.stopPropagation()}
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
                title="danielvnz"
              />
              <Button
                className="bg-red-500 hover:bg-red-700 text-white absolute bottom-2 left-1/2 transform -translate-x-1/2 py-1.5 px-2 h-fit"
                onClick={() => setShowIframe(false)}
              >
                😭 Close Window
              </Button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}


export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});