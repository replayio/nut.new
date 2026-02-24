import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '~/lib/utils';

export interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  size?: 'sm' | 'default' | 'lg';
  label?: string;
  description?: string;
  id?: string;
  className?: string;
  onCheckedChange?: (checked: boolean) => void;
  checked?: boolean;
}

const sizeClasses = {
  sm: { box: 'h-4 w-4', icon: 12, label: 'text-sm', description: 'text-xs' },
  default: { box: 'h-5 w-5', icon: 14, label: 'text-sm', description: 'text-xs' },
  lg: { box: 'h-6 w-6', icon: 16, label: 'text-base', description: 'text-sm' },
};

const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, size = 'default', label, description, id, onCheckedChange, checked, ...props }: CheckboxProps, ref) => {
    const sizeConfig = sizeClasses[size];
    const checkboxId = id || React.useId();

    const checkbox = (
      <CheckboxPrimitive.Root
        ref={ref}
        id={checkboxId}
        className={cn(
          'peer shrink-0 rounded border-2 transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'border-border bg-background',
          'data-[state=checked]:bg-foreground data-[state=checked]:border-foreground data-[state=checked]:text-background',
          'hover:border-muted-foreground',
          sizeConfig.box,
          className,
        )}
        checked={checked}
        onCheckedChange={(e: boolean) => onCheckedChange?.(e)}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center">
          <Check size={sizeConfig.icon} strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );

    if (label || description) {
      return (
        <div className="flex items-center gap-3">
          {checkbox}
          <div className="flex flex-col gap-0.5">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn('font-medium text-foreground cursor-pointer', sizeConfig.label)}
              >
                {label}
              </label>
            )}
            {description && <span className={cn('text-muted-foreground', sizeConfig.description)}>{description}</span>}
          </div>
        </div>
      );
    }

    return checkbox;
  },
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
