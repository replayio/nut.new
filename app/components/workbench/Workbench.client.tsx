import { useStore } from '@nanostores/react';
import { motion, type Variants } from 'framer-motion';
import { memo, useState, useEffect, useRef } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import { MultiSlider } from '~/components/ui/Slider';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { Preview } from './Preview/Preview';
import useViewport from '~/lib/hooks';
import { chatStore } from '~/lib/stores/chat';
import { getLatestAppSummary } from '~/lib/persistence/messageAppSummary';
import type { Message } from '~/lib/persistence/message';
import type { ChatMode } from '~/lib/replay/ChatManager';
import { ClientOnly } from 'remix-utils/client-only';
import { DeployChatButton } from '~/components/header/DeployChat/DeployChatButton';
import { DownloadButton } from '~/components/header/DownloadButton';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';

interface WorkspaceProps {
  chatStarted?: boolean;
  messages?: Message[];
  handleSendMessage?: (event: React.UIEvent, messageInput: string, startPlanning: boolean, chatMode?: ChatMode) => void;
}

const workbenchVariants = {
  closed: {
    width: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    width: 'var(--workbench-width)',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

export const Workbench = memo(({ chatStarted, messages, handleSendMessage }: WorkspaceProps) => {
  renderLogger.trace('Workbench');

  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const currentChat = useStore(chatStore.currentChat);
  const [activeTab, setActiveTab] = useState<'planning' | 'layout' | 'preview'>('layout');

  const hasSeenPreviewRef = useRef(false);
  const hasSeenProjectPlanRef = useRef(false);
  const hasSetLayoutTabRef = useRef(false);
  const hasSetPlanningTabRef = useRef(false);

  const isSmallViewport = useViewport(1024);

  const appSummary = getLatestAppSummary(messages ?? []);

  useEffect(() => {
    if (hasSeenProjectPlanRef.current) {
      return;
    }

    if (currentChat?.title && currentChat.title !== 'New Chat' && !showWorkbench && appSummary) {
      hasSeenProjectPlanRef.current = true;
      workbenchStore.showWorkbench.set(true);
    }
  }, [currentChat?.title, showWorkbench]);

  useEffect(() => {
    if (showWorkbench && !hasSeenPreviewRef.current) {
      hasSeenPreviewRef.current = true;
    }
  }, [showWorkbench]);

  useEffect(() => {
    if (appSummary?.pages && !hasSetLayoutTabRef.current) {
      hasSetLayoutTabRef.current = true;
      setActiveTab('layout');
    }

    if (appSummary?.features && !hasSetPlanningTabRef.current) {
      hasSetPlanningTabRef.current = true;
      setActiveTab('planning');
    }
  }, [appSummary]);

  const tabOptions = {
    options: [
      { value: 'layout' as const, text: 'Layout' },
      ...(appSummary?.features ? [{ value: 'planning' as const, text: 'Planning' }] : []),
      { value: 'preview' as const, text: 'Preview' },
    ],
  };

  return (
    chatStarted && (
      <motion.div
        initial="closed"
        animate={showWorkbench ? 'open' : 'closed'}
        variants={workbenchVariants}
        className="z-workbench"
      >
        <div
          className={classNames(
            'fixed top-[calc(var(--header-height)+1.5rem)] bottom-6 w-[var(--workbench-inner-width)] mr-4 z-0 transition-[left,width] duration-200 bolt-ease-cubic-bezier',
            {
              'w-full': isSmallViewport,
              'left-0': showWorkbench && isSmallViewport,
              'left-[var(--workbench-left)]': showWorkbench,
              'left-[100%]': !showWorkbench,
            },
          )}
        >
          <div className="absolute inset-0 px-2 lg:px-6">
            <div className="h-full flex flex-col bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor shadow-sm rounded-lg overflow-hidden">
              <div className="flex items-center px-3 py-2 border-b border-bolt-elements-borderColor">
                {appSummary && <MultiSlider selected={activeTab} options={tabOptions} setSelected={setActiveTab} />}
                <div className="flex-1 flex items-center justify-center">
                  {chatStarted && (
                    <span className="px-4 truncate text-center text-bolt-elements-textPrimary">
                      <ClientOnly>{() => <ChatDescription />}</ClientOnly>
                    </span>
                  )}
                </div>
                <div className="flex">
                  {chatStarted && (
                    <>
                      <span className="flex-1 min-w-fit px-4 truncate text-center text-bolt-elements-textPrimary">
                        <ClientOnly>{() => <DeployChatButton />}</ClientOnly>
                      </span>
                      <span className="flex-1 min-w-fit px-4 truncate text-center text-bolt-elements-textPrimary">
                        <ClientOnly>{() => <DownloadButton />}</ClientOnly>
                      </span>
                    </>
                  )}
                </div>
                <IconButton
                  icon="i-ph:x-circle"
                  className="-mr-1"
                  size="xl"
                  onClick={() => {
                    workbenchStore.showWorkbench.set(false);
                  }}
                />
              </div>
              <div className="relative flex-1 overflow-hidden">
                <Preview
                  activeTab={activeTab}
                  appSummary={appSummary}
                  handleSendMessage={handleSendMessage}
                  messages={messages}
                  setActiveTab={setActiveTab}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  );
});
