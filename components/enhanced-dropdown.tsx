'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { signOut } from 'next-auth/react';

interface EnhancedDropdownProps {
  toggleIframe: () => void
  router: ReturnType<typeof useRouter>
}

export function EnhancedDropdown({ toggleIframe, router }: EnhancedDropdownProps) {
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const { theme, setTheme } = useTheme()

  const menuItems = [
    { icon: '🏠', label: 'Home', action: () => router.push('/') },
    { icon: 'ℹ️', label: 'Information', action: () => router.push('/information') },
    { icon: '☕', label: 'Buy me a Coffee', action: toggleIframe },
    { icon: '⭐', label: 'Star on GitHub', action: () => window.open('https://github.com/DanielVNZ/StarTraderVersion2', '_blank') },
    { icon: '👋', label: 'Join our Discord', action: () => window.open('https://discord.gg/zy9x4UKwsw', '_blank') },
    { icon: theme === 'dark' ? '🌞' : '🌙', label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`, action: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
    { icon: '🏃', label: 'Sign Out', action: () => signOut({ redirectTo: '/', }) },  
    ]


  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
        )}
      >
        <Button variant="outline" className="md:px-2 md:h-[34px]">
          <span className="text-sm font-medium mr-2">Menu</span>
          <motion.div
            animate={{ rotate: dropdownOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDownIcon size={12} />
          </motion.div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
  align="start"
  className="min-w-[300px] bg-background border border-border rounded-md shadow-lg p-2 space-y-1"
>
  {menuItems.map((item, index) => (
    <DropdownMenuItem
      key={item.label}
      className={cn(
        'px-1 py-1 rounded-sm focus:bg-accent focus:text-accent-foreground border border-border',
        item.label === 'Buy me a Coffee' && 'bg-orange-400 text-black' // Apply color conditionally
      )}
      onClick={item.action}
    >
      <motion.div
        className="flex items-center gap-3 w-full"
        initial={{ x: -10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: index * 0.05 }}
      >
        <Button
          variant="ghost"
          className="w-full justify-start text-left font-normal px-2 py-1.5"
        >
          <span className="text-xl mr-2">{item.icon}</span>
          <span className="text-sm">{item.label}</span>
        </Button>
      </motion.div>
    </DropdownMenuItem>
  ))}
</DropdownMenuContent>

    </DropdownMenu>
  )
}

