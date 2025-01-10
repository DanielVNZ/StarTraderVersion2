'use server';

import { deleteOldChats as deleteOldChatsFromDb } from '@/lib/db/queries';

export async function deleteOldChats(days: number) {
  try {
    const result = await deleteOldChatsFromDb(days);
    return { status: 'success', count: result.length };
  } catch (error) {
    console.error('Failed to delete old chats:', error);
    return { status: 'error', message: 'Failed to delete old chats' };
  }
} 