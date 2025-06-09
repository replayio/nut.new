import { useStore } from '@nanostores/react';
import { motion, type Variants } from 'framer-motion';
import { memo } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { Preview } from './Preview';
import useViewport from '~/lib/hooks';
import { chatStore } from '~/lib/stores/chat';

interface WorkspaceProps {
  chatStarted?: boolean;
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

export const Workbench = memo(({ chatStarted }: WorkspaceProps) => {
  renderLogger.trace('Workbench');

  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const showChat = useStore(chatStore.showChat);

  const isSmallViewport = useViewport(1024);

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
            'fixed top-[calc(var(--header-height))] bottom-0 w-[var(--workbench-inner-width)] mr-4 z-0 transition-[left,width] duration-200 bolt-ease-cubic-bezier',
            {
              'w-full': isSmallViewport,
              'left-0': showWorkbench && isSmallViewport,
              'left-[var(--workbench-left)]': showWorkbench,
              'left-[100%]': !showWorkbench,
            },
          )}
        >
          <div className="absolute inset-0 px-0">
            <div className="h-full flex flex-col bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor shadow-sm rounded-lg overflow-hidden">
              <div className="relative flex-1 overflow-hidden">
                <Preview />
              </div>
            </div>
          </div>
          {!showChat && (
            <div className="absolute top-0 right-18 left-1/2 bg-green-100 px-4 py-3 rounded-md shadow-sm border border-bolt-elements-borderColor">
              Hello World  asdfsfdds fsd dfs dfs
            </div>
          )}
        </div>
      </motion.div>
    )
  );
});
