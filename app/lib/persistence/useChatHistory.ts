import { useLoaderData } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { atom } from 'nanostores';
import { toast } from 'react-toastify';
import { logStore } from '~/lib/stores/logs'; // Import logStore
import { createChat, getChatContents, setChatContents, getChatPublicData, databaseUpdateChatTitle } from './db';
import { loadProblem } from '~/components/chat/LoadProblemButton';
import { createMessagesForRepository, type Message } from './message';
import { debounce } from '~/utils/debounce';

export function useChatHistory() {
  const {
    id: mixedId,
    problemId,
    repositoryId,
  } = useLoaderData<{ id?: string; problemId?: string; repositoryId?: string }>() ?? {};

  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(!mixedId && !problemId && !repositoryId);

  const importChat = async (title: string, messages: Message[]) => {
    try {
      const newId = await createChat(title, messages);
      window.location.href = `/chat/${newId}`;
      toast.success('Chat imported successfully');
    } catch (error) {
      if (error instanceof Error) {
        toast.error('Failed to import chat: ' + error.message);
      } else {
        toast.error('Failed to import chat');
      }
    }
  };

  const loadRepository = async (repositoryId: string) => {
    const messages = createMessagesForRepository(`Repository: ${repositoryId}`, repositoryId);
    await importChat(`Repository: ${repositoryId}`, messages);
    toast.success('Repository loaded successfully');
  };

  const debouncedSetChatContents = debounce(async (messages: Message[]) => {
    await setChatContents(currentChatId.get() as string, currentChatTitle.get() as string, messages);
  }, 1000);

  useEffect(() => {
    (async () => {
      try {
        if (mixedId) {
          const chatContents = await getChatContents(mixedId);
          if (chatContents) {
            setInitialMessages(chatContents.messages);
            currentChatTitle.set(chatContents.title);
            currentChatId.set(mixedId);
            setReady(true);
            return;
          }

          const publicData = await getChatPublicData(mixedId);
          const messages = createMessagesForRepository(publicData.title, publicData.repositoryId);
          await importChat(publicData.title, messages);
        } else if (problemId) {
          await loadProblem(problemId, importChat);
          setReady(true);
        } else if (repositoryId) {
          await loadRepository(repositoryId);
          setReady(true);
        }
      } catch (error) {
        logStore.logError('Failed to load chat messages', error);
        toast.error((error as any).message);
      }
    })();
  }, []);

  return {
    ready,
    initialMessages,
    storeMessageHistory: async (messages: Message[]) => {
      if (messages.length === 0) {
        return;
      }

      if (!currentChatId.get()) {
        const id = await createChat('New Chat', initialMessages);
        currentChatId.set(id);
        currentChatTitle.set('New Chat');
        navigateChat(id);
      }

      debouncedSetChatContents(messages);
    },
    importChat,
  };
}

function navigateChat(nextId: string) {
  /**
   * FIXME: Using the intended navigate function causes a rerender for <Chat /> that breaks the app.
   *
   * `navigate(`/chat/${nextId}`, { replace: true });`
   */
  const url = new URL(window.location.href);
  url.pathname = `/chat/${nextId}`;

  window.history.replaceState({}, '', url);
}

export async function handleChatTitleUpdate(id: string, title: string) {
  await databaseUpdateChatTitle(id, title);
  if (currentChatId.get() == id) {
    currentChatTitle.set(title);
  }
}
