import { genSaltSync, hashSync, hash } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte, lt, inArray, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { v4 as uuidv4 } from 'uuid';
import { authConfig } from '@/app/(auth)/auth.config';
import getServerSession, { Session } from 'next-auth';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  type Message,
  message,
  vote,
} from './schema';
import type { BlockKind } from '@/components/block';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Define a custom type that extends the NextAuth session
interface CustomSession extends Session {
  user: {
    id: string; // Define the user ID type
  };
}

// Type guard to check if session is of type CustomSession
function isCustomSession(session: any): session is CustomSession {
  return session && session.user && typeof session.user.id === 'string';
}

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  try {
    const hashedPassword = await hash(password, 10);
    
    const userId = uuidv4();
    
    const result = await db
      .insert(user)
      .values({
        id: userId,
        email,
        password: hashedPassword,
      })
      .returning();

    if (!result || result.length === 0) {
      throw new Error('Failed to create user');
    }

    return result;
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    // First verify the user exists
    const userExists = await db
      .select()
      .from(user)
      .where(eq(user.id, userId));

    if (!userExists || userExists.length === 0) {
      // Try to get user by email as fallback
      const userByEmail = await db
        .select()
        .from(user)
        .where(like(user.email, 'guest_%'));
      
      if (userByEmail && userByEmail.length > 0) {
        // Use the first matching guest user
        userId = userByEmail[0].id;
      } else {
        throw new Error(`User with ID ${userId} does not exist and no guest user found`);
      }
    }

    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error('Failed to save chat in database:', error);
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: BlockKind;
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    return await db
      .delete(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}

export async function manualDeleteOldChats(days: number = 1) {
  try {
    // Get the session
    const session = await getServerSession(authConfig);
    if (!isCustomSession(session)) {
      throw new Error('User not authenticated');
    }
    const userId = session.user.id;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // Get all old chat IDs for the logged-in user
    const oldChats = await db
      .select({ id: chat.id })
      .from(chat)
      .innerJoin(user, eq(chat.userId, user.id))
      .where(
        and(
          lt(chat.createdAt, daysAgo),
          eq(chat.userId, userId) // Only select chats for the logged-in user
        )
      );

    const chatIds = oldChats.map(chat => chat.id);

    if (chatIds.length === 0) {
      return []; // No chats to delete
    }

    // Delete related records using IN clause
    await db.delete(vote)
      .where(inArray(vote.chatId, chatIds));

    await db.delete(message)
      .where(inArray(message.chatId, chatIds));

    // Delete the chats
    const result = await db.delete(chat)
      .where(inArray(chat.id, chatIds))
      .returning();

    console.log(`Deleted ${result.length} old chats for user ID ${userId}`);
    return result;
  } catch (error) {
    console.error('Failed to delete old chats from database:', error);
    throw error;
  }
}

export async function deleteOldChats(days: number = 1) {
  try {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // Get all old chat IDs from guest accounts only
    const oldChats = await db
      .select({ id: chat.id })
      .from(chat)
      .innerJoin(user, eq(chat.userId, user.id))
      .where(
        and(
          lt(chat.createdAt, daysAgo),
          like(user.email, 'guest_%') // Only select chats from guest accounts
        )
      );

    const chatIds = oldChats.map(chat => chat.id);

    if (chatIds.length === 0) {
      return []; // No chats to delete
    }

    // Delete related records using IN clause
    await db.delete(vote)
      .where(inArray(vote.chatId, chatIds));

    await db.delete(message)
      .where(inArray(message.chatId, chatIds));

    // Delete the chats
    const result = await db.delete(chat)
      .where(inArray(chat.id, chatIds))
      .returning();

    console.log(`Deleted ${result.length} old guest chats`);
    return result;
  } catch (error) {
    console.error('Failed to delete old guest chats from database:', error);
    throw error;
  }
}