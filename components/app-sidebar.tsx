'use client';

import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { signOut } from 'next-auth/react';

import { PlusIcon } from '@/components/icons';
import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { manualDeleteOldChats } from '@/lib/db/queries';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [daysToDelete, setDaysToDelete] = useState('3');

  const handleDeleteOldChats = async () => {
    try {
      const days = parseInt(daysToDelete);
      if (isNaN(days) || days < 0) {
        toast.error('Please enter a valid number of days');
        return;
      }

      // Call the API route to delete old chats
      const response = await fetch('/api/deleteOldChats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ days, userId: user?.id }), // Pass userId from props
      });

      const result = await response.json();
      console.log(result);
      if (response.ok) {
        toast.success(result.message);
        setShowDeleteDialog(false);
        window.location.reload();
      } else {
        toast.error(result.message || 'Failed to delete old chats');
      }
    } catch (error) {
      toast.error('Failed to delete old chats');
      console.error(error);
    }
  };

  const handleSignUpClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    await signOut({ redirect: false });
    router.push('/register');
  };

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        {user?.email?.startsWith('guest_') && (
          <div className="bg-yellow-100 dark:bg-yellow-900/30 px-4 py-2 text-sm text-yellow-800 dark:text-yellow-200 mb-2">
            ⚠️ Guest chats are deleted daily - {' '}
            <a 
              href="/register" 
              onClick={handleSignUpClick}
              className="underline hover:text-yellow-600 dark:hover:text-yellow-300"
            >
              sign up here
            </a>
          </div>
        )}
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
            >
              <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
                Star Trader
              </span>
            </Link>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowDeleteDialog(true)}
                    title="Delete old chats"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Old Chats</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className="p-2 h-fit"
                    onClick={() => {
                      setOpenMobile(false);
                      router.push('/');
                      router.refresh();
                    }}
                  >
                    <PlusIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent align="end">New Chat</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarHistory user={user} />
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Old Chats</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="days">Delete chats older than (days).</Label>
              <Input
                id="days"
                type="number"
                value={daysToDelete}
                onChange={(e) => setDaysToDelete(e.target.value)}
                min="1"
                className="col-span-3"
              />
              <Label htmlFor="days">WARNING if you type 0 it will delete all chats!</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleDeleteOldChats}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
