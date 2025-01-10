import { deleteOldChats } from './queries';

export async function scheduleChatCleanup() {
  // Run cleanup every 24 hours
  setInterval(async () => {
    try {
      await deleteOldChats();
      console.log('Completed scheduled cleanup of old chats');
    } catch (error) {
      console.error('Failed to run scheduled cleanup:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
} 