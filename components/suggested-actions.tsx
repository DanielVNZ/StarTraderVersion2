'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import type { ChatRequestOptions, CreateMessage, Message } from 'ai';
import { memo } from 'react';
import { generateUUID } from '@/lib/utils';

interface SuggestedActionsProps {
  chatId: string;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
}

function PureSuggestedActions({ chatId, append }: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: 'Most profitable location to sell',
      label: '200 SCU of Gold in Stanton',
      action: 'Most profitable location to sell 200 SCU of Gold in Stanton',
    },
    {
      title: 'Plan a trade route',
      label: `for Gold within the Stanton system`,
      action: `Plan a trade route for Gold within the Stanton system. I have 100 SCU of storage and looking for the most profitable route`,
    },
    {
      title: 'Most profitable trade route?',
      label: `Plans the most profitable trade route`,
      action: `Whats the most profitable trade route?`,
    },
    {
      title: 'Most profitable commodity?',
      label: 'Locates the most profitable commodity to trade',
      action: 'Whats the most profitable commodity to trade?',
    },
  ];

  return (
    <div className="flex flex-col gap-3 px-4 w-full max-w-full overflow-x-hidden">
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="w-full"
        >
          <Button
            variant="outline"
            className="w-full text-left flex flex-col items-start gap-1.5 overflow-hidden text-ellipsis whitespace-normal py-8 px-8"
            onClick={async () => {
              await append({
                id: generateUUID(),
                content: suggestedAction.action,
                role: 'user',
              });
            }}
          >
            <span className="font-medium">{suggestedAction.title}</span>
            <span className="text-muted-foreground text-sm break-words">
              {suggestedAction.label}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);
