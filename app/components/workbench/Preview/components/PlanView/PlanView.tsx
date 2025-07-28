import { type AppSummary } from '~/lib/persistence/messageAppSummary';
import Pages from './components/Pages';
import Features from './components/Features/Features';
import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { AnimatePresence, motion, cubicBezier } from 'framer-motion';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import WithTooltip from '~/components/ui/Tooltip';

interface PlanViewProps {
  appSummary: AppSummary | null;
}

const customEasingFn = cubicBezier(0.4, 0, 0.2, 1);

const PlanView = ({ appSummary }: PlanViewProps) => {
  const listenResponses = useStore(chatStore.listenResponses);

  return (
    <div className="relative h-full w-full">
      <div className="h-full overflow-auto bg-transparent p-6">
        <div className="max-w-4xl mx-auto min-h-full flex flex-col">
          <div className="flex-1">
            <div className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary">App Build Plan</div>
              {!listenResponses && appSummary?.features?.length && (
                <AnimatePresence>
                  <TooltipProvider>
                    <WithTooltip tooltip={"Continue Building"}>
                      <motion.button
                        title={"Continue Building"}
                        transition={{ ease: customEasingFn, duration: 0.17 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        onClick={(event) => {
                          event.preventDefault();
                          console.log("CONTINUE_BUILDING");
                        }}
                      >
                        <div className="i-ph:rocket-launch text-xl"></div>
                      </motion.button>
                    </WithTooltip>
                  </TooltipProvider>
                </AnimatePresence>
            
            )}
            <div className="mb-8">
              <div className="text-lg font-semibold mb-3 text-bolt-elements-textPrimary">Project Description</div>
              <div className="text-bolt-elements-textSecondary leading-relaxed">{appSummary?.description}</div>
            </div>
            {appSummary?.pages && <Pages appSummary={appSummary} />}
          </div>
          {(appSummary?.features || appSummary?.mockupStatus) && (
            <div className="mt-auto">
              <Features appSummary={appSummary} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanView;
