/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { useStore } from '@nanostores/react';
import { useAnimate } from 'framer-motion';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
import { useSnapScroll } from '~/lib/hooks';
import { description, useChatHistory } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { PROMPT_COOKIE_KEY } from '~/utils/constants';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { BaseChat } from './BaseChat';
import Cookies from 'js-cookie';
import { debounce } from '~/utils/debounce';
import { useSearchParams } from '@remix-run/react';
import { createSampler } from '~/utils/sampler';
import {
  simulationAddData,
  simulationFinishData,
  simulationRepositoryUpdated,
  sendChatMessage,
  type ChatReference,
} from '~/lib/replay/SimulationPrompt';
import { getIFrameSimulationData } from '~/lib/replay/Recording';
import { getCurrentIFrame } from '~/components/workbench/Preview';
import { getCurrentMouseData } from '~/components/workbench/PointSelector';
import { anthropicNumFreeUsesCookieName, anthropicApiKeyCookieName, maxFreeUses } from '~/utils/freeUses';
import { getNutLoginKey, submitFeedback } from '~/lib/replay/Problems';
import { ChatMessageTelemetry, pingTelemetry } from '~/lib/hooks/pingTelemetry';
import type { RejectChangeData } from './ApproveChange';
import { assert, generateRandomId } from '~/lib/replay/ReplayProtocolClient';
import { getMessagesRepositoryId, getPreviousRepositoryId } from '~/lib/persistence/useChatHistory';
import type { Message } from '~/lib/persistence/message';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

let gLastChatMessages: Message[] | undefined;

export function getLastChatMessages() {
  return gLastChatMessages;
}

async function flushSimulationData() {
  //console.log("FlushSimulationData");

  const iframe = getCurrentIFrame();

  if (!iframe) {
    return;
  }

  const simulationData = await getIFrameSimulationData(iframe);

  if (!simulationData.length) {
    return;
  }

  //console.log("HaveSimulationData", simulationData.length);

  // Add the simulation data to the chat.
  simulationAddData(simulationData);
}

setInterval(async () => {
  flushSimulationData();
}, 1000);

export function Chat() {
  renderLogger.trace('Chat');

  const { ready, initialMessages, storeMessageHistory, importChat, exportChat } = useChatHistory();
  const title = useStore(description);

  return (
    <>
      {ready && (
        <ChatImpl
          description={title}
          initialMessages={initialMessages}
          exportChat={exportChat}
          storeMessageHistory={storeMessageHistory}
          importChat={importChat}
        />
      )}
      <ToastContainer
        closeButton={({ closeToast }) => {
          return (
            <button className="Toastify__close-button" onClick={closeToast}>
              <div className="i-ph:x text-lg" />
            </button>
          );
        }}
        icon={({ type }) => {
          /**
           * @todo Handle more types if we need them. This may require extra color palettes.
           */
          switch (type) {
            case 'success': {
              return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
            }
            case 'error': {
              return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
            }
          }

          return undefined;
        }}
        position="bottom-right"
        pauseOnFocusLoss
        transition={toastAnimation}
      />
    </>
  );
}

const processSampledMessages = createSampler(
  (options: {
    messages: Message[];
    initialMessages: Message[];
    storeMessageHistory: (messages: Message[]) => Promise<void>;
  }) => {
    const { messages, initialMessages, storeMessageHistory } = options;

    if (messages.length > initialMessages.length) {
      storeMessageHistory(messages).catch((error) => toast.error(error.message));
    }
  },
  50,
);

interface ChatProps {
  initialMessages: Message[];
  storeMessageHistory: (messages: Message[]) => Promise<void>;
  importChat: (description: string, messages: Message[]) => Promise<void>;
  exportChat: () => void;
  description?: string;
}

let gNumAborts = 0;

let gActiveChatMessageTelemetry: ChatMessageTelemetry | undefined;

async function clearActiveChat() {
  gActiveChatMessageTelemetry = undefined;
}

export const ChatImpl = memo(
  ({ description, initialMessages, storeMessageHistory, importChat, exportChat }: ChatProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]); // Move here
    const [imageDataList, setImageDataList] = useState<string[]>([]); // Move here
    const [searchParams, setSearchParams] = useSearchParams();
    const [approveChangesMessageId, setApproveChangesMessageId] = useState<string | undefined>(undefined);

    // Input currently in the textarea.
    const [input, setInput] = useState('');

    /*
     * This is set when the user has triggered a chat message and the response hasn't finished
     * being generated.
     */
    const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined);
    const isLoading = activeChatId !== undefined;

    const [messages, setMessages] = useState<Message[]>(initialMessages);

    const { showChat } = useStore(chatStore);

    const [animationScope, animate] = useAnimate();

    useEffect(() => {
      const prompt = searchParams.get('prompt');

      if (prompt) {
        setSearchParams({});
        sendMessage(prompt);
      }
    }, [searchParams]);

    // Load any repository in the initial messages.
    useEffect(() => {
      const repositoryId = getMessagesRepositoryId(initialMessages);

      if (repositoryId) {
        simulationRepositoryUpdated(repositoryId);
      }
    }, [initialMessages]);

    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

    useEffect(() => {
      chatStore.setKey('started', initialMessages.length > 0);
    }, []);

    useEffect(() => {
      processSampledMessages({
        messages,
        initialMessages,
        storeMessageHistory,
      });
    }, [messages, isLoading]);

    const abort = () => {
      stop();
      gNumAborts++;
      chatStore.setKey('aborted', true);
      setActiveChatId(undefined);

      if (gActiveChatMessageTelemetry) {
        gActiveChatMessageTelemetry.abort('StopButtonClicked');
        clearActiveChat();
      }
    };

    useEffect(() => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.style.height = 'auto';

        const scrollHeight = textarea.scrollHeight;

        textarea.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
        textarea.style.overflowY = scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
      }
    }, [input, textareaRef]);

    const runAnimation = async () => {
      if (chatStarted) {
        return;
      }

      await Promise.all([
        animate('#examples', { opacity: 0, display: 'none' }, { duration: 0.1 }),
        animate('#intro', { opacity: 0, flex: 1 }, { duration: 0.2, ease: cubicEasingFn }),
      ]);

      chatStore.setKey('started', true);

      setChatStarted(true);
    };

    const sendMessage = async (messageInput?: string) => {
      const _input = messageInput || input;
      const numAbortsAtStart = gNumAborts;

      if (_input.length === 0 || isLoading) {
        return;
      }

      gActiveChatMessageTelemetry = new ChatMessageTelemetry(messages.length);

      const loginKey = getNutLoginKey();

      const apiKeyCookie = Cookies.get(anthropicApiKeyCookieName);
      const anthropicApiKey = apiKeyCookie?.length ? apiKeyCookie : undefined;

      if (!loginKey && !anthropicApiKey) {
        const numFreeUses = +(Cookies.get(anthropicNumFreeUsesCookieName) || 0);

        if (numFreeUses >= maxFreeUses) {
          toast.error(
            'All free uses consumed. Please set a login key or Anthropic API key in the "User Info" settings.',
          );
          gActiveChatMessageTelemetry.abort('NoFreeUses');
          clearActiveChat();

          return;
        }

        Cookies.set(anthropicNumFreeUsesCookieName, (numFreeUses + 1).toString());
      }

      const chatId = generateRandomId();
      setActiveChatId(chatId);

      const userMessage: Message = {
        id: `user-${chatId}`,
        role: 'user',
        type: 'text',
        content: _input,
      };

      let newMessages = [...messages, userMessage];

      imageDataList.forEach((imageData, index) => {
        const imageMessage: Message = {
          id: `image-${chatId}-${index}`,
          role: 'user',
          type: 'image',
          dataURL: imageData,
        };
        newMessages.push(imageMessage);
      });

      setMessages(newMessages);

      // Add file cleanup here
      setUploadedFiles([]);
      setImageDataList([]);

      await flushSimulationData();
      simulationFinishData();

      chatStore.setKey('aborted', false);

      runAnimation();

      const addResponseMessage = (msg: Message) => {
        if (gNumAborts != numAbortsAtStart) {
          return;
        }

        newMessages = [...newMessages];

        const lastMessage = newMessages[newMessages.length - 1];

        if (lastMessage.id == msg.id) {
          newMessages.pop();
          assert(lastMessage.type == 'text', 'Last message must be a text message');
          assert(msg.type == 'text', 'Message must be a text message');
          newMessages.push({
            ...msg,
            content: lastMessage.content + msg.content,
          });
        } else {
          newMessages.push(msg);
        }

        setMessages(newMessages);
      };

      const references: ChatReference[] = [];

      const mouseData = getCurrentMouseData();

      if (mouseData) {
        references.push({
          kind: 'element',
          selector: mouseData.selector,
          x: mouseData.x,
          y: mouseData.y,
          width: mouseData.width,
          height: mouseData.height,
        });
      }

      try {
        await sendChatMessage(newMessages, references, addResponseMessage);
      } catch (e) {
        toast.error('Error sending message');
        console.error('Error sending message', e);
      }

      if (gNumAborts != numAbortsAtStart) {
        return;
      }

      gActiveChatMessageTelemetry.finish();
      clearActiveChat();

      setActiveChatId(undefined);

      setInput('');
      Cookies.remove(PROMPT_COOKIE_KEY);

      textareaRef.current?.blur();

      const existingRepositoryId = getMessagesRepositoryId(messages);
      const responseRepositoryId = getMessagesRepositoryId(newMessages);

      if (responseRepositoryId && existingRepositoryId != responseRepositoryId) {
        simulationRepositoryUpdated(responseRepositoryId);

        const lastMessage = newMessages[newMessages.length - 1];
        setApproveChangesMessageId(lastMessage.id);
      }
    };

    // Rewind far enough to erase the specified message.
    const onRewind = async (messageId: string) => {
      console.log('Rewinding', messageId);

      const messageIndex = messages.findIndex((message) => message.id === messageId);

      if (messageIndex < 0) {
        toast.error('Rewind message not found');
        return;
      }

      const previousRepositoryId = getPreviousRepositoryId(messages, messageIndex);

      if (!previousRepositoryId) {
        toast.error('No repository ID found for rewind');
        return;
      }

      setMessages(messages.slice(0, messageIndex));
      simulationRepositoryUpdated(previousRepositoryId);

      pingTelemetry('RewindChat', {
        numMessages: messages.length,
        rewindIndex: messageIndex,
        loginKey: getNutLoginKey(),
      });
    };

    const flashScreen = async () => {
      const flash = document.createElement('div');
      flash.style.position = 'fixed';
      flash.style.top = '0';
      flash.style.left = '0';
      flash.style.width = '100%';
      flash.style.height = '100%';
      flash.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
      flash.style.zIndex = '9999';
      flash.style.pointerEvents = 'none';
      document.body.appendChild(flash);

      // Fade out and remove after 500ms
      setTimeout(() => {
        flash.style.transition = 'opacity 0.5s';
        flash.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(flash);
        }, 500);
      }, 200);
    };

    const onApproveChange = async (messageId: string) => {
      console.log('ApproveChange', messageId);

      setApproveChangesMessageId(undefined);

      await flashScreen();

      pingTelemetry('ApproveChange', {
        numMessages: messages.length,
        loginKey: getNutLoginKey(),
      });
    };

    const onRejectChange = async (messageId: string, data: RejectChangeData) => {
      console.log('RejectChange', messageId, data);

      setApproveChangesMessageId(undefined);

      const message = messages.find((message) => message.id === messageId);

      await onRewind(messageId);

      let shareProjectSuccess = false;

      if (data.shareProject) {
        const feedbackData: any = {
          explanation: data.explanation,
          chatMessages: messages,
          repositoryId: message?.repositoryId,
          loginKey: getNutLoginKey(),
        };

        shareProjectSuccess = await submitFeedback(feedbackData);
      }

      pingTelemetry('RejectChange', {
        shareProject: data.shareProject,
        shareProjectSuccess,
        numMessages: messages.length,
        loginKey: getNutLoginKey(),
      });
    };

    /**
     * Handles the change event for the textarea and updates the input state.
     * @param event - The change event from the textarea.
     */
    const onTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(event.target.value);
    };

    /**
     * Debounced function to cache the prompt in cookies.
     * Caches the trimmed value of the textarea input after a delay to optimize performance.
     */
    const debouncedCachePrompt = useCallback(
      debounce((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const trimmedValue = event.target.value.trim();
        Cookies.set(PROMPT_COOKIE_KEY, trimmedValue, { expires: 30 });
      }, 1000),
      [],
    );

    const [messageRef, scrollRef] = useSnapScroll();

    gLastChatMessages = messages;

    return (
      <BaseChat
        ref={animationScope}
        textareaRef={textareaRef}
        input={input}
        showChat={showChat}
        chatStarted={chatStarted}
        isStreaming={isLoading}
        sendMessage={sendMessage}
        messageRef={messageRef}
        scrollRef={scrollRef}
        handleInputChange={(e) => {
          onTextareaChange(e);
          debouncedCachePrompt(e);
        }}
        handleStop={abort}
        description={description}
        importChat={importChat}
        exportChat={exportChat}
        messages={messages}
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        imageDataList={imageDataList}
        setImageDataList={setImageDataList}
        onRewind={onRewind}
        approveChangesMessageId={approveChangesMessageId}
        onApproveChange={onApproveChange}
        onRejectChange={onRejectChange}
      />
    );
  },
);
