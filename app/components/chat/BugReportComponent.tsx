import { TooltipProvider } from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import WithTooltip from '~/components/ui/Tooltip';
import type { BugReport } from '~/lib/persistence/messageAppSummary';
import { chatStore } from '~/lib/stores/chat';
import { doSendMessage } from '~/lib/stores/chat';
import { ChatMode } from '~/lib/replay/SendChatMessage';
import { toast } from 'react-toastify';

interface BugReportComponentProps {
  report: BugReport;
}

export const BugReportComponent = ({ report }: BugReportComponentProps) => {
  const handleResolve = async () => {
    const appId = chatStore.currentAppId.get();
    if (!appId) {
      toast.error('No app selected');
      return;
    }

    // Send a message to mark the bug as resolved
    await doSendMessage({
      appId,
      mode: ChatMode.UserMessage,
      messages: [
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: `Mark bug report "${report.name}" as resolved.`,
          createTime: new Date().toISOString(),
          hasInteracted: false,
        },
      ],
    });
  };

  const handleRetry = async () => {
    const appId = chatStore.currentAppId.get();
    if (!appId) {
      toast.error('No app selected');
      return;
    }

    // Send a message to retry fixing the bug
    await doSendMessage({
      appId,
      mode: ChatMode.UserMessage,
      messages: [
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: `Retry fixing bug report "${report.name}".`,
          createTime: new Date().toISOString(),
          hasInteracted: false,
        },
      ],
    });
  };

  return (
    <motion.div
      className="bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-xl p-4 mb-3 mx-4 mt-3"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <div className="i-ph:bug text-red-500 text-lg"></div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-bolt-elements-textPrimary mb-1">
            {report.name}
          </h3>
          <p className="text-sm text-bolt-elements-textSecondary mb-3">
            {report.description}
          </p>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <WithTooltip tooltip="Mark this bug as resolved">
                <button
                  onClick={handleResolve}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 border border-green-500/20 hover:border-green-500/30"
                >
                  <div className="i-ph:check-circle text-base"></div>
                  Resolve
                </button>
              </WithTooltip>
            </TooltipProvider>

            <TooltipProvider>
              <WithTooltip tooltip="Retry fixing this bug">
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 border border-blue-500/20 hover:border-blue-500/30"
                >
                  <div className="i-ph:arrow-clockwise text-base"></div>
                  Retry
                </button>
              </WithTooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
