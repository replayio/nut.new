import { TooltipProvider } from '@radix-ui/react-tooltip';
import { AnimatePresence, cubicBezier, motion } from 'framer-motion';
import WithTooltip from '~/components/ui/Tooltip';

interface StartPlanningButtonProps {
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  startPlanningRating?: number;
}

const customEasingFn = cubicBezier(0.4, 0, 0.2, 1);

export const StartPlanningButton = ({ onClick, startPlanningRating = 0 }: StartPlanningButtonProps) => {
  const className = `absolute flex justify-center items-center bottom-[22px] right-[22px] p-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl h-[40px] w-[40px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 border border-white/20 hover:border-white/30 group`;
  const tooltipText = 'Start Building Now!';
  const shouldBlink = startPlanningRating === 10;
  const shouldShowTooltipPersistently = startPlanningRating === 10;

  return (
    <AnimatePresence>
      <TooltipProvider>
        <WithTooltip tooltip={tooltipText} forceOpen={shouldShowTooltipPersistently}>
          <motion.button
            className={className}
            title={tooltipText}
            initial={{ opacity: 0, y: 10 }}
            animate={
              shouldBlink
                ? {
                    opacity: [1, 0.4, 1],
                    y: 0,
                  }
                : { opacity: 1, y: 0 }
            }
            exit={{ opacity: 0, y: 10 }}
            transition={
              shouldBlink
                ? {
                    opacity: {
                      repeat: Infinity,
                      duration: 1.5,
                      ease: 'easeInOut',
                    },
                    y: { ease: customEasingFn, duration: 0.17 },
                  }
                : { ease: customEasingFn, duration: 0.17 }
            }
            onClick={(event) => {
              event.preventDefault();
              onClick?.(event);
            }}
          >
            <div className="i-ph:rocket-launch text-xl transition-transform duration-200 group-hover:scale-110"></div>
          </motion.button>
        </WithTooltip>
      </TooltipProvider>
    </AnimatePresence>
  );
};
