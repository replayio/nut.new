import { useStore } from '@nanostores/react';
import { motion, type Variants } from 'framer-motion';
import { memo, useState, useEffect, useRef } from 'react';
import { MultiSlider } from '~/components/ui/Slider';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { Preview } from './Preview/Preview';
import useViewport from '~/lib/hooks';
import { ClientOnly } from 'remix-utils/client-only';
import { DeployChatButton } from '~/components/header/DeployChat/DeployChatButton';
import { DownloadButton } from '~/components/header/DownloadButton';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import ViewVersionHistoryButton from './VesionHistory/ViewVersionHistoryButton';
import { chatStore } from '~/lib/stores/chat';
import type { ChatMessageParams } from '~/components/chat/ChatComponent/components/ChatImplementer/ChatImplementer';

interface WorkspaceProps {
  chatStarted?: boolean;
  mobileActiveTab?: 'chat' | 'planning' | 'preview';
  handleSendMessage: (params: ChatMessageParams) => void;
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

export const Workbench = memo(({ chatStarted, mobileActiveTab, handleSendMessage }: WorkspaceProps) => {
  renderLogger.trace('Workbench');

  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const [activeTab, setActiveTab] = useState<'planning' | 'preview'>('planning');
  const appId = useStore(chatStore.currentAppId);
  const hasSeenPreviewRef = useRef(false);
  const hasSeenProjectPlanRef = useRef(false);
  const hasSetPlanningTabRef = useRef(false);
  const appSummary = useStore(chatStore.appSummary);

  const isSmallViewport = useViewport(1024);

  useEffect(() => {
    if (mobileActiveTab === 'planning') {
      setActiveTab('planning');
    } else if (mobileActiveTab === 'preview') {
      setActiveTab('preview');
    }
  }, [mobileActiveTab]);

  useEffect(() => {
    if (hasSeenProjectPlanRef.current) {
      return;
    }

    if (!showWorkbench && appSummary) {
      hasSeenProjectPlanRef.current = true;
      workbenchStore.showWorkbench.set(true);
    }
  }, [appSummary, showWorkbench]);

  useEffect(() => {
    if (showWorkbench && !hasSeenPreviewRef.current) {
      hasSeenPreviewRef.current = true;
    }
  }, [showWorkbench]);

  useEffect(() => {
    if (
      (appSummary?.features && !hasSetPlanningTabRef.current) ||
      (appSummary?.pages && !hasSetPlanningTabRef.current)
    ) {
      hasSetPlanningTabRef.current = true;

      setActiveTab('planning');
    }
  }, [appSummary]);

  const tabOptions = {
    options: [
      { value: 'planning' as const, text: 'Planning' },
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
            'fixed w-[var(--workbench-inner-width)] mr-4 z-0 transition-[left,width] duration-200 bolt-ease-cubic-bezier',
            {
              'top-[calc(var(--header-height)+0rem)] bottom-13': isSmallViewport,
              'top-[calc(var(--header-height)+1.5rem)] bottom-6': !isSmallViewport,
              'w-full': isSmallViewport,
              'left-0': showWorkbench && isSmallViewport,
              'left-[var(--workbench-left)]': showWorkbench,
              'left-[100%]': !showWorkbench,
            },
          )}
        >
          <div
            className={classNames('absolute inset-0', {
              'lg:px-6': !isSmallViewport,
            })}
          >
            <div
              className={classNames(
                'h-full flex flex-col bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor shadow-lg overflow-hidden',
                {
                  'rounded-xl': !isSmallViewport,
                },
              )}
            >
              {!isSmallViewport && (
                <div className="flex items-center px-4 py-4 border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-2/50">
                  {appSummary && <MultiSlider selected={activeTab} options={tabOptions} setSelected={setActiveTab} />}
                  <div className="flex items-center justify-center min-w-0 flex-shrink flex-grow basis-0 max-w-300">
                    {chatStarted && (
                      <div className="w-full px-4">
                        <ClientOnly>{() => <ChatDescription />}</ClientOnly>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 items-center">
                    {chatStarted && (
                      <>
                        <div className="flex items-center justify-center">
                          <ClientOnly>{() => <DeployChatButton />}</ClientOnly>
                        </div>
                        {appId && (
                          <div className="flex items-center justify-center">
                            <ClientOnly>{() => <ViewVersionHistoryButton />}</ClientOnly>
                          </div>
                        )}
                        <div className="flex items-center justify-center">
                          <ClientOnly>{() => <DownloadButton />}</ClientOnly>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              <div className="relative flex-1 overflow-hidden">
                <Preview activeTab={activeTab} handleSendMessage={handleSendMessage} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  );
});
