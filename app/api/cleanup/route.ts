import { NextResponse } from 'next/server';
import { deleteOldChats } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const result = await deleteOldChats(1); // Delete chats older than 1 day
    return NextResponse.json({ 
      success: true, 
      message: `Deleted ${result.length} old guest chats` 
    });
  } catch (error) {
    console.error('Cleanup failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to cleanup old chats' 
    }, { status: 500 });
  }
} 