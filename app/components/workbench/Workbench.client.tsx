import { useStore } from '@nanostores/react';
import { motion, type Variants } from 'framer-motion';
import { memo } from 'react';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { Preview } from './Preview/Preview';
import useViewport from '~/lib/hooks';
import { useLayoutWidths } from '~/lib/hooks/useLayoutWidths';
import { userStore } from '~/lib/stores/auth';

interface WorkspaceProps {
  chatStarted?: boolean;
  isResizable?: boolean;
}

const createWorkbenchVariants = (workbenchWidth: number) =>
  ({
    closed: {
      width: 0,
      transition: {
        duration: 0.2,
        ease: cubicEasingFn,
      },
    },
    open: {
      width: workbenchWidth,
      transition: {
        duration: 0.2,
        ease: cubicEasingFn,
      },
    },
  }) satisfies Variants;

export const Workbench = memo(({ chatStarted, isResizable }: WorkspaceProps) => {
  renderLogger.trace('Workbench');

  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const user = useStore(userStore);
  const { workbenchWidth, workbenchLeft } = useLayoutWidths(!!user);
  const workbenchVariants = createWorkbenchVariants(workbenchWidth);

  const isSmallViewport = useViewport(1024);

  // When using resizable panels, render inline without fixed positioning
  if (isResizable && chatStarted) {
    return (
      <div className="h-full w-full p-2">
        <div className="h-full flex flex-col bg-card border border-border overflow-hidden rounded-md">
          <div className="relative flex-1 overflow-hidden">
            <Preview />
          </div>
        </div>
      </div>
    );
  }

  return (
    chatStarted && (
      <motion.div
        initial="closed"
        animate={showWorkbench ? 'open' : 'closed'}
        variants={workbenchVariants}
        className="z-[15] h-full"
      >
        <div
          className={classNames('fixed z-0 transition-[left,width,transform] duration-200 ease-cubic-bezier', {
            'top-[calc(54px+0.5rem)] bottom-[calc(3.5rem+0.5rem)] left-1 right-1': isSmallViewport,
            'top-[calc(54px+1.5rem)] bottom-6 mr-4 p-6': !isSmallViewport,
            'translate-x-0': showWorkbench && isSmallViewport,
            'translate-x-full': !showWorkbench && isSmallViewport,
            'left-[100%]': !showWorkbench && !isSmallViewport,
          })}
          style={
            !isSmallViewport
              ? {
                  width: `${workbenchWidth}px`,
                  left: showWorkbench ? `${workbenchLeft}px` : '100%',
                }
              : undefined
          }
        >
          <div
            className={classNames('absolute inset-0', {
              'px-6': !isSmallViewport,
            })}
          >
            <div className="h-full flex flex-col bg-card border border-border shadow-lg overflow-hidden rounded-md">
              <div className="relative flex-1 overflow-hidden">
                <Preview />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  );
});
