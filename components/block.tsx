import type {
  Attachment,
  ChatRequestOptions,
  CreateMessage,
  Message,
} from 'ai';
import { formatDistance } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useState,
  useRef,
} from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useDebounceCallback, useWindowSize } from 'usehooks-ts';
import TextareaAutosize from 'react-textarea-autosize';

import type { Document, Suggestion, Vote } from '@/lib/db/schema';
import { cn, fetcher } from '@/lib/utils';

import { DiffView } from './diffview';
import { DocumentSkeleton } from './document-skeleton';
import { Editor } from './editor';
import { MultimodalInput } from './multimodal-input';
import { Toolbar } from './toolbar';
import { VersionFooter } from './version-footer';
import { BlockActions } from './block-actions';
import { BlockCloseButton } from './block-close-button';
import { BlockMessages } from './block-messages';
import { CodeEditor } from './code-editor';
import { Console } from './console';
import { useSidebar } from './ui/sidebar';
import { useBlock } from '@/hooks/use-block';
import equal from 'fast-deep-equal';
import { SuggestedActions } from './suggested-actions';
import { SendIcon } from './icons';

export type BlockKind = 'text' | 'code';

export interface UIBlock {
  title: string;
  documentId: string;
  kind: BlockKind;
  content: string;
  isVisible: boolean;
  status: 'streaming' | 'idle';
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export interface ConsoleOutput {
  id: string;
  status: 'in_progress' | 'completed' | 'failed';
  content: string | null;
}

function PureBlock({
  chatId,
  input,
  setInput,
  handleSubmit,
  isLoading,
  stop,
  attachments,
  setAttachments,
  append,
  messages,
  setMessages,
  reload,
  votes,
  isReadonly,
}: {
  chatId: string;
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<Message>;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
  votes: Array<Vote> | undefined;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  handleSubmit: (
    event?: {
      preventDefault?: () => void;
    },
    chatRequestOptions?: ChatRequestOptions,
  ) => void;
  reload: (
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  isReadonly: boolean;
}) {
  const { block, setBlock } = useBlock();

  const {
    data: documents,
    isLoading: isDocumentsFetching,
    mutate: mutateDocuments,
  } = useSWR<Array<Document>>(
    block.documentId !== 'init' && block.status !== 'streaming'
      ? `/api/document?id=${block.documentId}`
      : null,
    fetcher,
  );

  const { data: suggestions } = useSWR<Array<Suggestion>>(
    documents && block && block.status !== 'streaming'
      ? `/api/suggestions?documentId=${block.documentId}`
      : null,
    fetcher,
    {
      dedupingInterval: 5000,
    },
  );

  const [mode, setMode] = useState<'edit' | 'diff'>('edit');
  const [document, setDocument] = useState<Document | null>(null);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);
  const [consoleOutputs, setConsoleOutputs] = useState<Array<ConsoleOutput>>(
    [],
  );

  const { open: isSidebarOpen } = useSidebar();

  useEffect(() => {
    if (documents && documents.length > 0) {
      const mostRecentDocument = documents.at(-1);

      if (mostRecentDocument) {
        setDocument(mostRecentDocument);
        setCurrentVersionIndex(documents.length - 1);
        setBlock((currentBlock) => ({
          ...currentBlock,
          content: mostRecentDocument.content ?? '',
        }));
      }
    }
  }, [documents, setBlock]);

  useEffect(() => {
    mutateDocuments();
  }, [block.status, mutateDocuments]);

  const { mutate } = useSWRConfig();
  const [isContentDirty, setIsContentDirty] = useState(false);

  const handleContentChange = useCallback(
    (updatedContent: string) => {
      if (!block) return;

      mutate<Array<Document>>(
        `/api/document?id=${block.documentId}`,
        async (currentDocuments) => {
          if (!currentDocuments) return undefined;

          const currentDocument = currentDocuments.at(-1);

          if (!currentDocument || !currentDocument.content) {
            setIsContentDirty(false);
            return currentDocuments;
          }

          if (currentDocument.content !== updatedContent) {
            await fetch(`/api/document?id=${block.documentId}`, {
              method: 'POST',
              body: JSON.stringify({
                title: block.title,
                content: updatedContent,
                kind: block.kind,
              }),
            });

            setIsContentDirty(false);

            const newDocument = {
              ...currentDocument,
              content: updatedContent,
              createdAt: new Date(),
            };

            return [...currentDocuments, newDocument];
          }
          return currentDocuments;
        },
        { revalidate: false },
      );
    },
    [block, mutate],
  );

  const debouncedHandleContentChange = useDebounceCallback(
    handleContentChange,
    2000,
  );

  const saveContent = useCallback(
    (updatedContent: string, debounce: boolean) => {
      if (document && updatedContent !== document.content) {
        setIsContentDirty(true);

        if (debounce) {
          debouncedHandleContentChange(updatedContent);
        } else {
          handleContentChange(updatedContent);
        }
      }
    },
    [document, debouncedHandleContentChange, handleContentChange],
  );

  function getDocumentContentById(index: number) {
    if (!documents) return '';
    if (!documents[index]) return '';
    return documents[index].content ?? '';
  }

  const handleVersionChange = (type: 'next' | 'prev' | 'toggle' | 'latest') => {
    if (!documents) return;

    if (type === 'latest') {
      setCurrentVersionIndex(documents.length - 1);
      setMode('edit');
    }

    if (type === 'toggle') {
      setMode((mode) => (mode === 'edit' ? 'diff' : 'edit'));
    }

    if (type === 'prev') {
      if (currentVersionIndex > 0) {
        setCurrentVersionIndex((index) => index - 1);
      }
    } else if (type === 'next') {
      if (currentVersionIndex < documents.length - 1) {
        setCurrentVersionIndex((index) => index + 1);
      }
    }
  };

  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  /*
   * NOTE: if there are no documents, or if
   * the documents are being fetched, then
   * we mark it as the current version.
   */

  const isCurrentVersion =
    documents && documents.length > 0
      ? currentVersionIndex === documents.length - 1
      : true;

  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const isMobile = windowWidth ? windowWidth < 768 : false;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <AnimatePresence>
      {block.isVisible && (
        <motion.div
          className="flex flex-row h-dvh w-dvw fixed top-0 left-0 z-50 bg-transparent"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { delay: 0.4 } }}
        >
          {!isMobile && (
            <motion.div
              className="fixed bg-background h-dvh"
              initial={{
                width: isSidebarOpen ? windowWidth - 256 : windowWidth,
                right: 0,
              }}
              animate={{ width: windowWidth, right: 0 }}
              exit={{
                width: isSidebarOpen ? windowWidth - 256 : windowWidth,
                right: 0,
              }}
            />
          )}

          {!isMobile && (
            <motion.div
              className="relative w-[400px] bg-muted dark:bg-background h-dvh shrink-0"
              initial={{ opacity: 0, x: 10, scale: 1 }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                transition: {
                  delay: 0.2,
                  type: 'spring',
                  stiffness: 200,
                  damping: 30,
                },
              }}
              exit={{
                opacity: 0,
                x: 0,
                scale: 1,
                transition: { duration: 0 },
              }}
            >
              <AnimatePresence>
                {!isCurrentVersion && (
                  <motion.div
                    className="left-0 absolute h-dvh w-[400px] top-0 bg-zinc-900/50 z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>

              <div className="flex flex-col h-full justify-between items-center gap-4">
                <BlockMessages
                  chatId={chatId}
                  isLoading={isLoading}
                  votes={votes}
                  messages={messages}
                  setMessages={setMessages}
                  reload={reload}
                  isReadonly={isReadonly}
                  blockStatus={block.status}
                />

                <div className="relative flex h-dvh w-screen max-w-full overflow-x-hidden">
                  {/* Message input area */}
                  <div className="absolute bottom-0 left-0 right-0 w-full px-4 py-2 space-y-4 bg-background">
                    {!isReadonly && (
                      <>
                        <div className="relative w-full max-w-full overflow-hidden">
                          {/* Suggested actions */}
                          {messages.length === 0 && (
                            <div className="mb-4 w-full">
                              <SuggestedActions chatId={chatId} append={append} />
                            </div>
                          )}
                          
                          {/* Message input */}
                          <form
                            onSubmit={handleSubmit}
                            className="flex items-end gap-2 w-full max-w-full"
                          >
                            <div className="relative flex-1 overflow-hidden">
                              <TextareaAutosize
                                ref={textareaRef}
                                tabIndex={0}
                                rows={1}
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Send a message to Star Trader..."
                                spellCheck={false}
                                className="w-full resize-none bg-background pr-12 text-base py-3 px-4 rounded-xl border focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700 dark:border-neutral-700 max-h-[400px] overflow-y-auto"
                                style={{
                                  wordWrap: 'break-word'
                                }}
                              />
                              <div className="absolute right-2 bottom-1">
                                <button
                                  disabled={isLoading || input.length === 0}
                                  className={`p-2 rounded-lg ${
                                    isLoading || input.length === 0
                                      ? 'opacity-40'
                                      : 'opacity-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                  }`}
                                >
                                  <SendIcon />
                                </button>
                              </div>
                            </div>
                          </form>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            className="fixed dark:bg-muted bg-background h-dvh flex flex-col overflow-y-scroll border-l dark:border-zinc-700 border-zinc-200"
            initial={
              isMobile
                ? {
                    opacity: 1,
                    x: block.boundingBox.left,
                    y: block.boundingBox.top,
                    height: block.boundingBox.height,
                    width: block.boundingBox.width,
                    borderRadius: 50,
                  }
                : {
                    opacity: 1,
                    x: block.boundingBox.left,
                    y: block.boundingBox.top,
                    height: block.boundingBox.height,
                    width: block.boundingBox.width,
                    borderRadius: 50,
                  }
            }
            animate={
              isMobile
                ? {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    height: windowHeight,
                    width: windowWidth ? windowWidth : 'calc(100dvw)',
                    borderRadius: 0,
                    transition: {
                      delay: 0,
                      type: 'spring',
                      stiffness: 200,
                      damping: 30,
                      duration: 5000,
                    },
                  }
                : {
                    opacity: 1,
                    x: 400,
                    y: 0,
                    height: windowHeight,
                    width: windowWidth
                      ? windowWidth - 400
                      : 'calc(100dvw-400px)',
                    borderRadius: 0,
                    transition: {
                      delay: 0,
                      type: 'spring',
                      stiffness: 200,
                      damping: 30,
                      duration: 5000,
                    },
                  }
            }
            exit={{
              opacity: 0,
              scale: 0.5,
              transition: {
                delay: 0.1,
                type: 'spring',
                stiffness: 600,
                damping: 30,
              },
            }}
          >
            <div className="p-2 flex flex-row justify-between items-start">
              <div className="flex flex-row gap-4 items-start">
                <BlockCloseButton />

                <div className="flex flex-col">
                  <div className="font-medium">
                    {document?.title ?? block.title}
                  </div>

                  {isContentDirty ? (
                    <div className="text-sm text-muted-foreground">
                      Saving changes...
                    </div>
                  ) : document ? (
                    <div className="text-sm text-muted-foreground">
                      {`Updated ${formatDistance(
                        new Date(document.createdAt),
                        new Date(),
                        {
                          addSuffix: true,
                        },
                      )}`}
                    </div>
                  ) : (
                    <div className="w-32 h-3 mt-2 bg-muted-foreground/20 rounded-md animate-pulse" />
                  )}
                </div>
              </div>

              <BlockActions
                block={block}
                currentVersionIndex={currentVersionIndex}
                handleVersionChange={handleVersionChange}
                isCurrentVersion={isCurrentVersion}
                mode={mode}
                setConsoleOutputs={setConsoleOutputs}
              />
            </div>

            <div
              className={cn(
                'dark:bg-muted bg-background h-full overflow-y-scroll !max-w-full pb-40 items-center',
                {
                  'py-2 px-2': block.kind === 'code',
                  'py-8 md:p-20 px-4': block.kind === 'text',
                },
              )}
            >
              <div
                className={cn('flex flex-row', {
                  '': block.kind === 'code',
                  'mx-auto max-w-[600px]': block.kind === 'text',
                })}
              >
                {isDocumentsFetching && !block.content ? (
                  <DocumentSkeleton />
                ) : block.kind === 'code' ? (
                  <CodeEditor
                    content={
                      isCurrentVersion
                        ? block.content
                        : getDocumentContentById(currentVersionIndex)
                    }
                    isCurrentVersion={isCurrentVersion}
                    currentVersionIndex={currentVersionIndex}
                    suggestions={suggestions ?? []}
                    status={block.status}
                    saveContent={saveContent}
                  />
                ) : block.kind === 'text' ? (
                  mode === 'edit' ? (
                    <Editor
                      content={
                        isCurrentVersion
                          ? block.content
                          : getDocumentContentById(currentVersionIndex)
                      }
                      isCurrentVersion={isCurrentVersion}
                      currentVersionIndex={currentVersionIndex}
                      status={block.status}
                      saveContent={saveContent}
                      suggestions={isCurrentVersion ? (suggestions ?? []) : []}
                    />
                  ) : (
                    <DiffView
                      oldContent={getDocumentContentById(
                        currentVersionIndex - 1,
                      )}
                      newContent={getDocumentContentById(currentVersionIndex)}
                    />
                  )
                ) : null}

                {suggestions ? (
                  <div className="md:hidden h-dvh w-12 shrink-0" />
                ) : null}

                <AnimatePresence>
                  {isCurrentVersion && (
                    <Toolbar
                      isToolbarVisible={isToolbarVisible}
                      setIsToolbarVisible={setIsToolbarVisible}
                      append={append}
                      isLoading={isLoading}
                      stop={stop}
                      setMessages={setMessages}
                      blockKind={block.kind}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>

            <AnimatePresence>
              {!isCurrentVersion && (
                <VersionFooter
                  currentVersionIndex={currentVersionIndex}
                  documents={documents}
                  handleVersionChange={handleVersionChange}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              <Console
                consoleOutputs={consoleOutputs}
                setConsoleOutputs={setConsoleOutputs}
              />
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const Block = memo(PureBlock, (prevProps, nextProps) => {
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (!equal(prevProps.votes, nextProps.votes)) return false;
  if (prevProps.input !== nextProps.input) return false;
  if (!equal(prevProps.messages, nextProps.messages.length)) return false;

  return true;
});
