import { useLoaderData } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { logStore } from '~/lib/stores/logs'; // Import logStore
import { chatStore } from '~/lib/stores/chat';
import { database } from './db';
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
      const newId = await database.createChat(title, messages);
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
    await database.setChatContents(chatStore.chatId.get() as string, chatStore.chatTitle.get() as string, messages);
  }, 1000);

  useEffect(() => {
    (async () => {
      try {
        if (mixedId) {
          const chatContents = await database.getChatContents(mixedId);
          if (chatContents) {
            setInitialMessages(chatContents.messages);
            chatStore.chatTitle.set(chatContents.title);
            chatStore.chatId.set(mixedId);
            setReady(true);
            return;
          }

          const publicData = await database.getChatPublicData(mixedId);
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

      if (!chatStore.chatId.get()) {
        const title = 'New Chat';
        const id = await database.createChat(title, initialMessages);
        chatStore.chatId.set(id);
        chatStore.chatTitle.set(title);
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
  await database.updateChatTitle(id, title);
  if (chatStore.chatId.get() == id) {
    chatStore.chatTitle.set(title);
  }
}
