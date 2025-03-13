/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { useStore } from '@nanostores/react';
import type { Message } from 'ai';
import { useAnimate } from 'framer-motion';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
import { useMessageParser, useSnapScroll } from '~/lib/hooks';
import { description, useChatHistory } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { PROMPT_COOKIE_KEY } from '~/utils/constants';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { BaseChat } from './BaseChat';
import Cookies from 'js-cookie';
import { debounce } from '~/utils/debounce';
import { useSearchParams } from '@remix-run/react';
import { createSampler } from '~/utils/sampler';
import { saveProjectContents } from './Messages.client';
import {
  getSimulationRecording,
  getSimulationEnhancedPrompt,
  simulationAddData,
  simulationRepositoryUpdated,
  shouldUseSimulation,
  sendDeveloperChatMessage,
} from '~/lib/replay/SimulationPrompt';
import { getIFrameSimulationData } from '~/lib/replay/Recording';
import { getCurrentIFrame } from '~/components/workbench/Preview';
import { getCurrentMouseData } from '~/components/workbench/PointSelector';
import { anthropicNumFreeUsesCookieName, anthropicApiKeyCookieName, maxFreeUses } from '~/utils/freeUses';
import { getNutLoginKey, submitFeedback } from '~/lib/replay/Problems';
import { ChatMessageTelemetry, pingTelemetry } from '~/lib/hooks/pingTelemetry';
import type { RejectChangeData } from './ApproveChange';
import { generateRandomId } from '~/lib/replay/ReplayProtocolClient';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});
let gLastProjectContents: string | undefined;

export function getLastProjectContents() {
  return gLastProjectContents;
}

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
  await simulationAddData(simulationData);
}

let gLockSimulationData = false;

setInterval(async () => {
  if (!gLockSimulationData) {
    flushSimulationData();
  }
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
    isLoading: boolean;
    parseMessages: (messages: Message[], isLoading: boolean) => void;
    storeMessageHistory: (messages: Message[]) => Promise<void>;
  }) => {
    const { messages, initialMessages, isLoading, parseMessages, storeMessageHistory } = options;
    parseMessages(messages, isLoading);

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

/*
 * When files are modified during a chat message we wait until the message finishes
 * before updating the simulation.
 */
let gUpdateSimulationAfterChatMessage = false;

async function clearActiveChat() {
  gActiveChatMessageTelemetry = undefined;

  if (gUpdateSimulationAfterChatMessage) {
    await simulationRepositoryUpdated();
    gUpdateSimulationAfterChatMessage = false;
  }
}

export async function onRepositoryFileWritten() {
  if (gActiveChatMessageTelemetry) {
    gUpdateSimulationAfterChatMessage = true;
  } else {
    await simulationRepositoryUpdated();
  }
}

function buildMessageId(prefix: string, chatId: string) {
  return `${prefix}-${chatId}`;
}

const EnhancedPromptPrefix = 'enhanced-prompt';

export function isEnhancedPromptMessage(message: Message): boolean {
  return message.id.startsWith(EnhancedPromptPrefix);
}

export const ChatImpl = memo(
  ({ description, initialMessages, storeMessageHistory, importChat, exportChat }: ChatProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]); // Move here
    const [imageDataList, setImageDataList] = useState<string[]>([]); // Move here
    const [searchParams, setSearchParams] = useSearchParams();
    const files = useStore(workbenchStore.files);
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

    const { parsedMessages, setParsedMessages, parseMessages } = useMessageParser();

    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

    useEffect(() => {
      chatStore.setKey('started', initialMessages.length > 0);
    }, []);

    useEffect(() => {
      processSampledMessages({
        messages,
        initialMessages,
        isLoading,
        parseMessages,
        storeMessageHistory,
      });
    }, [messages, isLoading, parseMessages]);

    const abort = () => {
      stop();
      gNumAborts++;
      chatStore.setKey('aborted', true);
      workbenchStore.abortAllActions();
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

    const createRecording = async (chatId: string) => {
      let recordingId, message;

      try {
        recordingId = await getSimulationRecording();
        message = `[Recording of the bug](https://app.replay.io/recording/${recordingId})\n\n`;
      } catch (e) {
        console.error('Error creating recording', e);
        message = 'Error creating recording.';
      }

      const recordingMessage: Message = {
        id: buildMessageId('create-recording', chatId),
        role: 'assistant',
        content: message,
      };

      return { recordingId, recordingMessage };
    };

    const getEnhancedPrompt = async (chatId: string, userMessage: string) => {
      let enhancedPrompt,
        message,
        hadError = false;

      try {
        const mouseData = getCurrentMouseData();
        enhancedPrompt = await getSimulationEnhancedPrompt(messages, userMessage, mouseData);
        message = `Explanation of the bug:\n\n${enhancedPrompt}`;
      } catch (e) {
        console.error('Error enhancing prompt', e);
        message = 'Error enhancing prompt.';
        hadError = true;
      }

      const enhancedPromptMessage: Message = {
        id: buildMessageId(EnhancedPromptPrefix, chatId),
        role: 'assistant',
        content: message,
      };

      return { enhancedPrompt, enhancedPromptMessage, hadError };
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
        id: buildMessageId('user', chatId),
        role: 'user',
        content: [
          {
            type: 'text',
            text: _input,
          },
          ...imageDataList.map((imageData) => ({
            type: 'image',
            image: imageData,
          })),
        ] as any, // Type assertion to bypass compiler check
      };

      let newMessages = [...messages, userMessage];
      setMessages(newMessages);

      // Add file cleanup here
      setUploadedFiles([]);
      setImageDataList([]);

      /**
       * @note (delm) Usually saving files shouldn't take long but it may take longer if there
       * many unsaved files. In that case we need to block user input and show an indicator
       * of some kind so the user is aware that something is happening. But I consider the
       * happy case to be no unsaved files and I would expect users to save their changes
       * before they send another message.
       */
      await workbenchStore.saveAllFiles();

      let simulation = false;

      try {
        simulation = chatStarted && (await shouldUseSimulation(_input));
      } catch (e) {
        console.error('Error checking simulation', e);
      }

      if (numAbortsAtStart != gNumAborts) {
        return;
      }

      console.log('UseSimulation', simulation);

      let simulationStatus = 'NoSimulation';

      if (simulation) {
        gActiveChatMessageTelemetry.startSimulation();

        gLockSimulationData = true;

        try {
          await flushSimulationData();

          const createRecordingPromise = createRecording(chatId);
          const enhancedPromptPromise = getEnhancedPrompt(chatId, _input);

          const { recordingId, recordingMessage } = await createRecordingPromise;

          if (numAbortsAtStart != gNumAborts) {
            return;
          }

          console.log('RecordingMessage', recordingMessage);
          newMessages = [...newMessages, recordingMessage];
          setMessages(newMessages);

          if (recordingId) {
            const info = await enhancedPromptPromise;

            if (numAbortsAtStart != gNumAborts) {
              return;
            }

            console.log('EnhancedPromptMessage', info.enhancedPromptMessage);
            newMessages = [...newMessages, info.enhancedPromptMessage];
            setMessages(newMessages);

            simulationStatus = info.hadError ? 'PromptError' : 'Success';
          } else {
            simulationStatus = 'RecordingError';
          }

          gActiveChatMessageTelemetry.endSimulation(simulationStatus);
        } finally {
          gLockSimulationData = false;
        }
      }

      const fileModifications = workbenchStore.getFileModifcations();

      chatStore.setKey('aborted', false);

      runAnimation();

      gActiveChatMessageTelemetry.sendPrompt(simulationStatus);

      const responseMessageId = buildMessageId('response', chatId);
      let responseMessageContent = '';
      let hasResponseMessage = false;

      const addResponseContent = (content: string) => {
        responseMessageContent += content;

        if (gNumAborts != numAbortsAtStart) {
          return;
        }

        newMessages = [...newMessages];

        if (hasResponseMessage) {
          newMessages.pop();
        }

        newMessages.push({
          id: responseMessageId,
          role: 'assistant',
          content: responseMessageContent,
        });
        setMessages(newMessages);
        hasResponseMessage = true;
      };

      try {
        await sendDeveloperChatMessage(newMessages, files, addResponseContent);
      } catch (e) {
        console.error('Error sending message', e);
        addResponseContent('Error sending message.');
      }

      if (gNumAborts != numAbortsAtStart) {
        return;
      }

      gActiveChatMessageTelemetry.finish();
      clearActiveChat();

      setActiveChatId(undefined);

      if (fileModifications !== undefined) {
        /**
         * After sending a new message we reset all modifications since the model
         * should now be aware of all the changes.
         */
        workbenchStore.resetAllFileModifications();
      }

      setInput('');
      Cookies.remove(PROMPT_COOKIE_KEY);

      textareaRef.current?.blur();

      // The project contents are associated with the response message.
      const { contentBase64 } = await workbenchStore.generateZipBase64();
      saveProjectContents(responseMessageId, { content: contentBase64 });
      gLastProjectContents = contentBase64;
      setApproveChangesMessageId(responseMessageId);
    };

    const onRewind = async (messageId: string, contents: string) => {
      console.log('Rewinding', messageId, contents);

      await workbenchStore.restoreProjectContentsBase64(messageId, contents);

      const messageIndex = messages.findIndex((message) => message.id === messageId);

      if (messageIndex >= 0) {
        const newParsedMessages = { ...parsedMessages };

        for (let i = messageIndex + 1; i < messages.length; i++) {
          delete newParsedMessages[i];
        }
        setParsedMessages(newParsedMessages);
        setMessages(messages.slice(0, messageIndex + 1));
      }

      await pingTelemetry('RewindChat', {
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

      await pingTelemetry('ApproveChange', {
        numMessages: messages.length,
        loginKey: getNutLoginKey(),
      });
    };

    const onRejectChange = async (
      messageId: string,
      rewindMessageId: string,
      projectContents: string,
      data: RejectChangeData,
    ) => {
      console.log('RejectChange', messageId, data);

      setApproveChangesMessageId(undefined);

      const message = messages.find((message) => message.id === messageId);
      const messageContents = message?.content ?? '';

      await onRewind(rewindMessageId, projectContents);

      let shareProjectSuccess = false;

      if (data.shareProject) {
        const feedbackData: any = {
          explanation: data.explanation,
          retry: data.retry,
          chatMessages: messages,
          repositoryContents: getLastProjectContents(),
          loginKey: getNutLoginKey(),
        };

        shareProjectSuccess = await submitFeedback(feedbackData);
      }

      if (data.retry) {
        sendMessage(messageContents);
      }

      await pingTelemetry('RejectChange', {
        retry: data.retry,
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

    const chatMessages = messages.map((message, i) => {
      if (message.role === 'user') {
        return message;
      }

      return {
        ...message,
        content: parsedMessages[i] || '',
      };
    });

    gLastChatMessages = chatMessages;

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
        messages={chatMessages}
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
