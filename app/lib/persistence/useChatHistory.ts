import { useLoaderData, useNavigate } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { atom } from 'nanostores';
import { toast } from 'react-toastify';
import { logStore } from '~/lib/stores/logs'; // Import logStore
import { createChat, getChatContents, setChatContents } from './db';
import { loadProblem } from '~/components/chat/LoadProblemButton';
import type { Message } from './message';

export const currentChatId = atom<string | undefined>(undefined);
export const currentChatTitle = atom<string | undefined>(undefined);

export function useChatHistory() {
  const navigate = useNavigate();
  const { id: mixedId, problemId } = useLoaderData<{ id?: string; problemId?: string }>() ?? {};

  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(!mixedId && !problemId);

  const importChat = async (description: string, messages: Message[]) => {
    try {
      const newId = await createChat(description, messages);
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

  useEffect(() => {
    if (mixedId) {
      getChatContents(mixedId)
        .then((chatContents) => {
          if (chatContents && chatContents.messages.length > 0) {
            setInitialMessages(chatContents.messages);
            currentChatTitle.set(chatContents.title);
            currentChatId.set(mixedId);
          } else {
            navigate('/', { replace: true });
          }

          setReady(true);
        })
        .catch((error) => {
          logStore.logError('Failed to load chat messages', error);
          toast.error(error.message);
        });
    } else if (problemId) {
      loadProblem(problemId, importChat).then(() => setReady(true));
    }
  }, []);

  return {
    ready,
    initialMessages,
    storeMessageHistory: async (messages: Message[]) => {
      if (messages.length === 0) {
        return;
      }

      const title = currentChatTitle.get() ?? 'New Chat';

      if (!currentChatId.get()) {
        const id = await createChat(title, initialMessages);
        currentChatId.set(id);
        navigateChat(id);
      }

      await setChatContents(currentChatId.get() as string, title, messages);
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
