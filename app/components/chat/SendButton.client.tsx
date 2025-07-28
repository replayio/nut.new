import { useStore } from '@nanostores/react';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { AnimatePresence, cubicBezier, motion } from 'framer-motion';
import WithTooltip from '~/components/ui/Tooltip';
import { chatStore } from '~/lib/stores/chat';

interface SendButtonProps {
  show: boolean;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onImagesSelected?: (images: File[]) => void;
}

const customEasingFn = cubicBezier(0.4, 0, 0.2, 1);

export const SendButton = ({ show, disabled, onClick }: SendButtonProps) => {
  const hasPendingMessage = useStore(chatStore.hasPendingMessage);
  const className = `absolute flex justify-center items-center bottom-[95px] right-[22px] p-1 ${
    hasPendingMessage ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
  } color-white rounded-md h-[34px] w-[34px] transition-theme disabled:opacity-50 disabled:cursor-not-allowed`;

  // Determine tooltip text based on button state
  const tooltipText = hasPendingMessage ? 'Stop Generation' : 'Send Message';

  return (
    <AnimatePresence>
      {show ? (
        <TooltipProvider>
          <WithTooltip tooltip={tooltipText}>
            <motion.button
              className={className}
              title={tooltipText}
              transition={{ ease: customEasingFn, duration: 0.17 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              disabled={disabled}
              onClick={(event) => {
                event.preventDefault();

                if (!disabled) {
                  onClick?.(event);
                }
              }}
            >
              {!hasPendingMessage ? (
                <>
                  <div className="i-ph:arrow-up-bold text-xl"></div>
                </>
              ) : (
                <div className="i-ph:stop-circle-bold text-xl"></div>
              )}
            </motion.button>
          </WithTooltip>
        </TooltipProvider>
      ) : null}
    </AnimatePresence>
  );
};
