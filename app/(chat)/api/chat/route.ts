import {
  type Message,
  convertToCoreMessages,
  createDataStreamResponse,
  streamText,
} from 'ai';

import { auth } from '@/app/(auth)/auth';
import { customModel } from '@/lib/ai';
import { models } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils';

import { tools } from './tools';

import { generateTitleFromUserMessage } from '../../actions';

import { NextRequest } from "next/server";
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export const maxDuration = 60;

type AllowedTools =
  'calculateBestTradeRoute' |
  'getCommoditiesByTerminal' |
  'getTerminalInfo'




const myTools: AllowedTools[] = [
  'calculateBestTradeRoute',  
  'getCommoditiesByTerminal',
  'getTerminalInfo',



];

const allTools: AllowedTools[] = [...myTools];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    // Add context tracking for commodity searches
    const recentMessages = messages.slice(-5); // Look at last 5 messages
    const lastCommodityContext = recentMessages.find((msg: Message) => 
      typeof msg.content === 'string' && 
      msg.content.toLowerCase().includes('commodity:')
    );

    // If this is a "show more" request, ensure we have context
    const isShowMoreRequest = typeof messages[messages.length - 1].content === 'string' &&
      messages[messages.length - 1].content
        .toLowerCase()
        .includes('show more');

    if (isShowMoreRequest && !lastCommodityContext) {
      return new Response(
        JSON.stringify({
          error: "Please search for a commodity first before requesting more locations."
        }),
        { status: 400 }
      );
    }

    const {
      id,
      modelId,
    }: { id: string; messages: Array<Message>; modelId: string } = body;

    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const model = models.find((model) => model.id === modelId);

    if (!model) {
      return new Response('Model not found', { status: 404 });
    }

    const coreMessages = convertToCoreMessages(messages);
    const userMessage = getMostRecentUserMessage(coreMessages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({ message: userMessage });
      await saveChat({ id, userId: session.user.id, title });
    }

    const userMessageId = generateUUID();

    await saveMessages({
      messages: [
        { ...userMessage, id: userMessageId, createdAt: new Date(), chatId: id },
      ],
    });

    return createDataStreamResponse({
      execute: async (dataStream) => {
        dataStream.writeData({
          type: 'user-message-id',
          content: userMessageId,
        });

        try {
          // Fetch data from Supabase
         // const { data: commodities, error: commoditiesError } = await supabase
         //   .from('Commodities')
         //   .select('*');
         //   console.log('Fetched Commodities...');

          const { data: locations, error: locationsError } = await supabase
            .from('Locations')
            .select('*');
            console.log('Fetched Locations...');
          if (locationsError) {
            throw new Error(
              `Error fetching data: ${
                locationsError?.message || ''
              }`
            );
          }

          dataStream.writeData({
            type: 'supabase-data',
            content: { locations },
          });

          // Proceed with message generation
          const result = await streamText({
            model: customModel(model.apiIdentifier),
            system: systemPrompt,
            messages: coreMessages,
            maxSteps: 5,
            experimental_activeTools: allTools,
            tools,
            toolChoice: 'auto',
            maxTokens: 2500,
            experimental_toolCallStreaming: true,
            maxRetries: 3,
            experimental_telemetry: {
              isEnabled: true,
              functionId: 'stream-text',
            },
            onFinish: async ({ response, usage }) => {
              if (session.user?.id) {
                try { 
                  console.log('Token usage:', usage);

                  const sanitizedMessages = sanitizeResponseMessages(
                    response.messages
                  );
                  await saveMessages({
                    messages: sanitizedMessages.map((message) => ({
                      id: generateUUID(),
                      chatId: id,
                      role: message.role,
                      content: message.content,
                      createdAt: new Date(),
                    })),
                  });
                } catch (error) {
                  console.error('Failed to save messages:', error);
                }
              }
            },
          });

          result.mergeIntoDataStream(dataStream);
        } catch (error) {
          if (error instanceof Error) {
            console.error('Error during execution:', error.message);
            dataStream.writeData({ type: 'error', content: error.message });
          } else {
            console.error('Unknown error during execution:', error);
            dataStream.writeData({
              type: 'error',
              content: 'An unknown error occurred',
            });
          }
        }
      },
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}