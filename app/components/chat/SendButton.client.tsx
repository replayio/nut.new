import { AnimatePresence, cubicBezier, motion } from 'framer-motion';

interface SendButtonProps {
  show: boolean;
  hasPendingMessage?: boolean;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onImagesSelected?: (images: File[]) => void;
}

const customEasingFn = cubicBezier(0.4, 0, 0.2, 1);

export const SendButton = ({ show, hasPendingMessage, disabled, onClick }: SendButtonProps) => {
  const className =
    'absolute flex justify-center items-center top-[18px] right-[22px] p-1 bg-accent-500 hover:brightness-94 color-white rounded-md w-[34px] h-[34px] transition-theme disabled:opacity-50 disabled:cursor-not-allowed';

  // Determine tooltip text based on button state
  const tooltipText = hasPendingMessage ? 'Stop Generation' : 'Chat';

  return (
    <AnimatePresence>
      {show ? (
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
          <div className="text-lg">
            {!hasPendingMessage ? (
              <div className="i-ph:hand-fill"></div>
            ) : (
              <div className="i-ph:stop-circle-bold"></div>
            )}
          </div>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
};
