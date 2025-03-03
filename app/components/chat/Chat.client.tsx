/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { useStore } from '@nanostores/react';
import type { CreateMessage, Message } from 'ai';
import { useChat } from 'ai/react';
import { useAnimate } from 'framer-motion';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
import { useMessageParser, usePromptEnhancer, useShortcuts, useSnapScroll } from '~/lib/hooks';
import { description, useChatHistory } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { PROMPT_COOKIE_KEY } from '~/utils/constants';
import { cubicEasingFn } from '~/utils/easings';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import { BaseChat } from './BaseChat';
import Cookies from 'js-cookie';
import { debounce } from '~/utils/debounce';
import { useSettings } from '~/lib/hooks/useSettings';
import { useSearchParams } from '@remix-run/react';
import { createSampler } from '~/utils/sampler';
import { saveProjectContents } from './Messages.client';
import { getSimulationRecording, getSimulationEnhancedPrompt, simulationAddData, simulationRepositoryUpdated } from '~/lib/replay/SimulationPrompt';
import { getIFrameSimulationData } from '~/lib/replay/Recording';
import { getCurrentIFrame } from '../workbench/Preview';
import { getCurrentMouseData } from '../workbench/PointSelector';
import { anthropicNumFreeUsesCookieName, anthropicApiKeyCookieName, MaxFreeUses } from '~/utils/freeUses';
import type { FileMap } from '~/lib/stores/files';
import { shouldIncludeFile } from '~/utils/fileUtils';
import { getNutLoginKey, submitFeedback } from '~/lib/replay/Problems';
import { shouldUseSimulation } from '~/lib/hooks/useSimulation';
import { pingTelemetry } from '~/lib/hooks/pingTelemetry';
import type { RejectChangeData } from './ApproveChange';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

const logger = createScopedLogger('Chat');

// Debounce things after file writes to avoid creating a bunch of chats.
let gResetChatFileWrittenTimeout: NodeJS.Timeout | undefined;

export function resetChatFileWritten() {
  clearTimeout(gResetChatFileWrittenTimeout);
  gResetChatFileWrittenTimeout = setTimeout(async () => {
    const { contentBase64 } = await workbenchStore.generateZipBase64();
    await simulationRepositoryUpdated(contentBase64);
  }, 500);
}

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

function filterFiles(files: FileMap): FileMap {
  const rv: FileMap = {};
  for (const [path, file] of Object.entries(files)) {
    if (shouldIncludeFile(path)) {
      rv[path] = file;
    }
  }
  return rv;
}

export const ChatImpl = memo(
  ({ description, initialMessages, storeMessageHistory, importChat, exportChat }: ChatProps) => {
    useShortcuts();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]); // Move here
    const [imageDataList, setImageDataList] = useState<string[]>([]); // Move here
    const [searchParams, setSearchParams] = useSearchParams();
    const [simulationLoading, setSimulationLoading] = useState(false);
    const files = useStore(workbenchStore.files);
    const { promptId } = useSettings();

    const { showChat } = useStore(chatStore);

    const [animationScope, animate] = useAnimate();

    const { messages, isLoading, input, handleInputChange, setInput, stop, append, setMessages } = useChat({
      api: '/api/chat',
      body: {
        files: filterFiles(files),
        promptId,
      },
      sendExtraMessageFields: true,
      onError: (error) => {
        logger.error('Request failed\n\n', error);
        toast.error(
          'There was an error processing your request: ' + (error.message ? error.message : 'No details were returned'),
        );
      },
      initialMessages,
      initialInput: Cookies.get(PROMPT_COOKIE_KEY) || '',
    });

    useEffect(() => {
      const prompt = searchParams.get('prompt');

      if (prompt) {
        setSearchParams({});
        runAnimation();
        append({
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
          ] as any, // Type assertion to bypass compiler check
        });
      }
    }, [searchParams]);

    const { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer } = usePromptEnhancer();
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

    const scrollTextArea = () => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    };

    const abort = () => {
      stop();
      gNumAborts++;
      chatStore.setKey('aborted', true);
      workbenchStore.abortAllActions();
      setSimulationLoading(false);
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

    const createRecording = async () => {
      let recordingId, message;
      try {
        recordingId = await getSimulationRecording();
        message = `[Recording of the bug](https://app.replay.io/recording/${recordingId})\n\n`;
      } catch (e) {
        console.error("Error creating recording", e);
        message = "Error creating recording.";
      }

      const recordingMessage: Message = {
        id: `create-recording-${messages.length}`,
        role: 'assistant',
        content: message,
      };

      return { recordingId, recordingMessage };
    };

    const getEnhancedPrompt = async (userMessage: string) => {
      let enhancedPrompt, message;
      try {
        const mouseData = getCurrentMouseData();
        enhancedPrompt = await getSimulationEnhancedPrompt(messages, userMessage, mouseData);
        message = `Explanation of the bug:\n\n${enhancedPrompt}`;
      } catch (e) {
        console.error("Error enhancing prompt", e);
        message = "Error enhancing prompt.";
      }

      const enhancedPromptMessage: Message = {
        id: `enhanced-prompt-${messages.length}`,
        role: 'assistant',
        content: message,
      };

      return { enhancedPrompt, enhancedPromptMessage };
    }

    const sendMessage = async (messageInput?: string) => {
      const _input = messageInput || input;
      const numAbortsAtStart = gNumAborts;

      if (_input.length === 0 || isLoading) {
        return;
      }

      const loginKey = getNutLoginKey();

      const apiKeyCookie = Cookies.get(anthropicApiKeyCookieName);
      const anthropicApiKey = apiKeyCookie?.length ? apiKeyCookie : undefined;

      if (!loginKey && !anthropicApiKey) {
        const numFreeUses = +(Cookies.get(anthropicNumFreeUsesCookieName) || 0);
        if (numFreeUses >= MaxFreeUses) {
          toast.error('All free uses consumed. Please set a login key or Anthropic API key in the "User Info" settings.');
          return;
        }

        Cookies.set(anthropicNumFreeUsesCookieName, (numFreeUses + 1).toString());
      }

      setSimulationLoading(true);

      /**
       * @note (delm) Usually saving files shouldn't take long but it may take longer if there
       * many unsaved files. In that case we need to block user input and show an indicator
       * of some kind so the user is aware that something is happening. But I consider the
       * happy case to be no unsaved files and I would expect users to save their changes
       * before they send another message.
       */
      await workbenchStore.saveAllFiles();

      let simulationEnhancedPrompt: string | undefined;

      const simulation = await shouldUseSimulation(messages, _input);

      if (numAbortsAtStart != gNumAborts) {
        return;
      }

      console.log("UseSimulation", simulation);

      let didEnhancePrompt = false;

      if (simulation) {
        gLockSimulationData = true;
        try {
          await flushSimulationData();

          const createRecordingPromise = createRecording();
          const enhancedPromptPromise = getEnhancedPrompt(_input);

          const { recordingId, recordingMessage } = await createRecordingPromise;

          if (numAbortsAtStart != gNumAborts) {
            return;
          }

          console.log("RecordingMessage", recordingMessage);
          setMessages([...messages, recordingMessage]);

          if (recordingId) {
            const info = await enhancedPromptPromise;

            if (numAbortsAtStart != gNumAborts) {
              return;
            }

            simulationEnhancedPrompt = info.enhancedPrompt;
            didEnhancePrompt = true;

            console.log("EnhancedPromptMessage", info.enhancedPromptMessage);
            setMessages([...messages, info.enhancedPromptMessage]);
          }
        } finally {
          gLockSimulationData = false;
        }
      }

      const fileModifications = workbenchStore.getFileModifcations();

      chatStore.setKey('aborted', false);

      runAnimation();

      setSimulationLoading(false);

      append({
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
      }, { body: { simulationEnhancedPrompt, anthropicApiKey, loginKey } });

      if (fileModifications !== undefined) {
        /**
         * After sending a new message we reset all modifications since the model
         * should now be aware of all the changes.
         */
        workbenchStore.resetAllFileModifications();
      }

      setInput('');
      Cookies.remove(PROMPT_COOKIE_KEY);

      // Add file cleanup here
      setUploadedFiles([]);
      setImageDataList([]);

      resetEnhancer();

      textareaRef.current?.blur();

      // The project contents are associated with the last message present when
      // the user message is added.
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        const { contentBase64 } = await workbenchStore.generateZipBase64();
        saveProjectContents(lastMessage.id, { content: contentBase64 });
        gLastProjectContents = contentBase64;
      }

      await pingTelemetry("Chat.SendMessage", {
        numMessages: messages.length,
        simulation,
        didEnhancePrompt,
        loginKey: getNutLoginKey(),
      });
    };

    const onRewind = async (messageId: string, contents: string) => {
      console.log("Rewinding", messageId, contents);

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

      await pingTelemetry("Chat.Rewind", {
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
      console.log("ApproveChange", messageId);

      await flashScreen();

      await pingTelemetry("Chat.ApproveChange", {
        numMessages: messages.length,
        loginKey: getNutLoginKey(),
      });
    };

    const onRejectChange = async (messageId: string, projectContents: string, data: RejectChangeData) => {
      console.log("RejectChange", messageId, data);

      const message = messages.find((message) => message.id === messageId);
      const messageContents = message?.content ?? "";

      await onRewind(messageId, projectContents);

      let shareProjectSuccess = false;
      if (data.shareProject) {
        const feedbackData: any = {
          explanation: data.explanation,
          retry: data.retry,
          chatMessages: getLastChatMessages(),
          repositoryContents: getLastProjectContents(),
          loginKey: getNutLoginKey(),
        };
    
        if (feedbackData.share) {
          // Note: We don't just use the workbench store here because wrangler generates a strange error.
          feedbackData.repositoryContents = getLastProjectContents();
          feedbackData.chatMessages = messages;
        }
    
        shareProjectSuccess = await submitFeedback(feedbackData);
      }

      if (data.retry) {
        sendMessage(messageContents);
      }

      await pingTelemetry("Chat.RejectChange", {
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
      handleInputChange(event);
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
        isStreaming={isLoading || simulationLoading}
        enhancingPrompt={enhancingPrompt}
        promptEnhanced={promptEnhanced}
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
        enhancePrompt={() => {
          enhancePrompt(
            input,
            (input) => {
              setInput(input);
              scrollTextArea();
            },
          );
        }}
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        imageDataList={imageDataList}
        setImageDataList={setImageDataList}
        onRewind={onRewind}
        onApproveChange={onApproveChange}
        onRejectChange={onRejectChange}
      />
    );
  },
);
