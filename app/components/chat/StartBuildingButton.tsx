import { TooltipProvider } from '@radix-ui/react-tooltip';
import { AnimatePresence, cubicBezier, motion } from 'framer-motion';
import WithTooltip from '~/components/ui/Tooltip';
import { Rocket } from '~/components/ui/Icon';

interface StartBuildingButtonProps {
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  startPlanningRating?: number;
  buttonText?: string;
  unpaidFeatureCost?: number;
  tooltip?: string;
}

const customEasingFn = cubicBezier(0.4, 0, 0.2, 1);

export const StartBuildingButton = ({
  onClick,
  startPlanningRating = 0,
  buttonText,
  tooltip,
}: StartBuildingButtonProps) => {
  const hasText = !!buttonText;
  const className = hasText
    ? `relative flex justify-center items-center gap-2 px-4 py-2 bg-foreground hover:bg-foreground/90 text-background rounded-md min-h-[40px] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed group`
    : `absolute flex justify-center items-center bottom-[22px] right-[22px] p-2 bg-foreground hover:bg-foreground/90 text-background rounded-md h-[40px] w-[40px] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed group`;
  const tooltipText = tooltip || 'Start Building Now!';
  const shouldBlink = startPlanningRating === 10;
  const shouldShowTooltipPersistently = startPlanningRating === 10 && !hasText;

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
            {hasText ? (
              <>
                <div className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
                  <Rocket size={18} />
                  {buttonText}
                </div>
              </>
            ) : (
              <Rocket size={20} />
            )}
          </motion.button>
        </WithTooltip>
      </TooltipProvider>
    </AnimatePresence>
  );
};
