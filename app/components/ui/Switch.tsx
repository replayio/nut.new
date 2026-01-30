import { memo } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { classNames } from '~/utils/classNames';

interface SwitchProps {
  className?: string;
  checked?: boolean;
  onCheckedChange?: (event: boolean) => void;
}

export const Switch = memo(({ className, onCheckedChange, checked }: SwitchProps) => {
  return (
    <SwitchPrimitive.Root
      className={classNames(
        'relative h-6 w-11 cursor-pointer rounded-full border transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Unchecked state
        'bg-muted border-border',
        // Checked state
        'data-[state=checked]:bg-foreground data-[state=checked]:border-foreground',
        className,
      )}
      checked={checked}
      onCheckedChange={(e) => onCheckedChange?.(e)}
    >
      <SwitchPrimitive.Thumb
        className={classNames(
          'block h-5 w-5 rounded-full bg-background border border-border transition-transform duration-200',
          'translate-x-0.5',
          'data-[state=checked]:translate-x-[1.25rem] data-[state=checked]:border-muted',
          'will-change-transform',
        )}
      />
    </SwitchPrimitive.Root>
  );
});
