import { useLoaderData } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { logStore } from '~/lib/stores/logs'; // Import logStore
import { chatStore } from '~/lib/stores/chat';
import { database } from './chats';
import { createMessagesForRepository, type Message } from './message';
import { debounce } from '~/utils/debounce';

export interface ResumeChatInfo {
  protocolChatId: string;
  protocolChatResponseId: string;
}

export function useChatHistory() {
  const { id: mixedId, repositoryId } = useLoaderData<{ id?: string; repositoryId?: string }>() ?? {};

  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [resumeChat, setResumeChat] = useState<ResumeChatInfo | undefined>(undefined);
  const [ready, setReady] = useState<boolean>(!mixedId && !repositoryId);

  const importChat = async (title: string, messages: Message[]) => {
    try {
      const chat = await database.createChat(title, messages);
      window.location.href = `/chat/${chat.id}`;
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
    const chat = chatStore.currentChat.get();
    if (!chat) {
      return;
    }
    await database.setChatContents({ ...chat, messages });
  }, 1000);

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

export async function handleChatTitleUpdate(id: string, title: string) {
  await database.updateChatTitle(id, title);
  const currentChat = chatStore.currentChat.get();
  if (currentChat?.id == id) {
    chatStore.currentChat.set({ ...currentChat, title });
  }
}
