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
import { getFirstAppSummary, getLatestPrebuiltAppSummary } from '~/lib/persistence/messageAppSummary';
import type { Message } from '~/lib/persistence/message';
import { prebuiltAppSummaryStore } from '~/lib/stores/appSummary';
import { initialAppSummaryStore } from '~/lib/stores/appSummary';
import type { ChatMode } from '~/lib/replay/ChatManager';

interface WorkspaceProps {
  chatStarted?: boolean;
  handleSendMessage?: (event: React.UIEvent, messageInput?: string, chatMode?: ChatMode) => void;
  messages?: Message[];
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

export const Workbench = memo(({ chatStarted, handleSendMessage, messages }: WorkspaceProps) => {
  renderLogger.trace('Workbench');

  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const currentChat = useStore(chatStore.currentChat);
  const [activeTab, setActiveTab] = useState<'planning' | 'prebuilt' | 'preview'>('planning');

  const hasSeenPreviewRef = useRef(false);
  const hasSeenProjectPlanRef = useRef(false);

  const isSmallViewport = useViewport(1024);

  const [hiddenTab, setHiddenTab] = useState<'planning' | 'prebuilt' | null>(null);
  const [useLatestAppSummary, setUseLatestAppSummary] = useState(false);

  // Switch between getFirstAppSummary and getLatestAppSummary based on state
  const appSummary = useLatestAppSummary 
    ? getLatestPrebuiltAppSummary(messages ?? []) 
    : getFirstAppSummary(messages ?? []);
  
  const prebuiltAppSummary = getLatestPrebuiltAppSummary(messages ?? []);

  const appSummaryContent = useStore(initialAppSummaryStore);
  const prebuiltAppSummaryContent = useStore(prebuiltAppSummaryStore);

  // Debug logging
  console.log('AppSummary debug:', {
    hasAppSummary: !!appSummary,
    tests: appSummary?.tests,
    testsLength: appSummary?.tests?.length,
  });

  useEffect(() => {
    if (hasSeenProjectPlanRef.current) {
      return;
    }

    if (currentChat?.title && currentChat.title !== 'New Chat' && !showWorkbench) {
      hasSeenProjectPlanRef.current = true;
      workbenchStore.showWorkbench.set(true);
    }
  }, [currentChat?.title, showWorkbench]);

  useEffect(() => {
    if (showWorkbench && !hasSeenPreviewRef.current) {
      hasSeenPreviewRef.current = true;
      setActiveTab('planning');
    }
  }, [showWorkbench]);

  // Function to handle tab selection and hiding
  const handleTabSelection = (sourceTab: 'planning' | 'prebuilt') => {
    // Hide the opposite tab
    setHiddenTab(sourceTab === 'planning' ? 'prebuilt' : 'planning');
    
    // If planning tab was used, switch to latest app summary
    if (sourceTab === 'planning') {
      setUseLatestAppSummary(true);
    }
    
    // Switch to preview tab after clicking
    setActiveTab('preview');
  };

  // Filter tab options based on hidden tabs
  const tabOptions = {
    options: [
      { value: 'planning' as const, text: 'Planning' },
      ...(prebuiltAppSummary ? [{ value: 'prebuilt' as const, text: 'Prebuilt' }] : []),
      { value: 'preview' as const, text: 'Preview' },
    ].filter(option => option.value !== hiddenTab),
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
                <div className="ml-auto" />
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
                  appSummaryContent={appSummaryContent}
                  messages={messages}
                  prebuiltAppSummary={prebuiltAppSummary}
                  prebuiltAppSummaryContent={prebuiltAppSummaryContent}
                  handleSendMessage={handleSendMessage}
                  onTabSelection={handleTabSelection}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  );
});
