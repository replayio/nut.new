import { useLoaderData } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { logStore } from '~/lib/stores/logs'; // Import logStore
import { chatStore } from '~/lib/stores/chat';
import { database } from './apps';
import { createMessagesForRepository, type Message } from './message';

export function useChatHistory() {
  const {
    id: mixedId,
    repositoryId,
    appId,
  } = useLoaderData<{ id?: string; repositoryId?: string; appId?: string }>() ?? {};

  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(!mixedId && !repositoryId);

  useEffect(() => {
    (async () => {
      try {
        if (mixedId) {
          const chatContents = await database.getChatContents(mixedId);
          if (chatContents) {
            setInitialMessages(chatContents.messages);
            chatStore.currentChat.set(chatContents);
            if (chatContents.lastProtocolChatId && chatContents.lastProtocolChatResponseId) {
              setResumeChat({
                protocolChatId: chatContents.lastProtocolChatId,
                protocolChatResponseId: chatContents.lastProtocolChatResponseId,
              });
            }
            setReady(true);
            return;
          }

          const publicData = await database.getChatPublicData(mixedId);
          const messages = createMessagesForRepository(publicData.title, publicData.repositoryId);
          await importChat(publicData.title, messages);
        } else if (repositoryId) {
          await loadRepository(repositoryId);
          setReady(true);
        } else if (appId) {
          await loadApp(appId);
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
    resumeChat,
    storeMessageHistory: async (messages: Message[]) => {
      if (messages.length === 0) {
        return;
      }

      if (!chatStore.currentChat.get()) {
        const title = 'New Chat';
        const chat = await database.createChat(title, initialMessages);
        chatStore.currentChat.set(chat);
        navigateChat(chat.id);
      }

      debouncedSetChatContents(messages);
    },
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
  url.search = '';

  window.history.replaceState({}, '', url);
}
