import { NextResponse } from 'next/server';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, lt, inArray, gte } from 'drizzle-orm';
import { chat, user, vote, message } from '@/lib/db/schema';

// Initialize the PostgreSQL client
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function POST(request: Request) {
  try {
    // Parse the request body
    const { days, userId } = await request.json();
    console.log('Received:', { days, userId }); // Log the received values

    if (days === undefined || userId === undefined) {
      return NextResponse.json(
        { message: 'Missing required fields: days or userId' },
        { status: 400 }
      );
    }

    // Calculate the date `days` ago
    const daysAgo = new Date();
    if (days === 0) {
      // If days is 0, set daysAgo to the start of today
      daysAgo.setHours(0, 0, 0, 0);
    } else {
      daysAgo.setDate(daysAgo.getDate() - days);
    }

    // Get all old chat IDs for the logged-in user
    const oldChats = await db
      .select({ id: chat.id })
      .from(chat)
      .innerJoin(user, eq(chat.userId, user.id))
      .where(
        and(
          // Adjust the condition to include today's chats when days is 0
          days === 0 ? gte(chat.createdAt, daysAgo) : lt(chat.createdAt, daysAgo), // Chats created today or older
          eq(chat.userId, userId) // Only select chats for the logged-in user
        )
      );

    const chatIds = oldChats.map(chat => chat.id);

    if (chatIds.length === 0) {
      return NextResponse.json(
        { message: 'No chats to delete' },
        { status: 200 }
      );
    }

    await db.delete(message)
      .where(inArray(message.chatId, chatIds));

    // Delete the chats
    const result = await db.delete(chat)
      .where(inArray(chat.id, chatIds))
      .returning();

    return NextResponse.json(
      { message: `Deleted ${result.length} old chats for user: ${userId}` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to delete old chats:', error);
    return NextResponse.json(
      { message: 'Failed to delete old chats' },
      { status: 500 }
    );
  }
}