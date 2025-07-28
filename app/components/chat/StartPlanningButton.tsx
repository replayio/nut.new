import { TooltipProvider } from '@radix-ui/react-tooltip';
import { AnimatePresence, cubicBezier, motion } from 'framer-motion';
import WithTooltip from '~/components/ui/Tooltip';

interface StartPlanningButtonProps {
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

const customEasingFn = cubicBezier(0.4, 0, 0.2, 1);

export const StartPlanningButton = ({ onClick }: StartPlanningButtonProps) => {
  const className = `absolute flex justify-center items-center bottom-[50px] right-[22px] p-2 bg-blue-500 hover:bg-blue-600 color-white rounded-md h-[34px] w-[34px] transition-theme disabled:opacity-50 disabled:cursor-not-allowed`;
  const tooltipText = 'Start Building Now!';

  return (
    <AnimatePresence>
      <TooltipProvider>
        <WithTooltip tooltip={tooltipText}>
          <motion.button
            className={className}
            title={tooltipText}
            transition={{ ease: customEasingFn, duration: 0.17 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={(event) => {
              event.preventDefault();
              onClick?.(event);
            }}
          >
            <div className="i-ph:rocket-launch text-xl"></div>
          </motion.button>
        </WithTooltip>
      </TooltipProvider>
    </AnimatePresence>
  );
};
