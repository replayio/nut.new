import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';

const inputVariants = cva(
  'flex w-full rounded-md border bg-background text-foreground transition-all duration-200 placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
        ghost: 'border-transparent bg-transparent focus:bg-background focus:border-input',
        error:
          'border-destructive focus:ring-2 focus:ring-destructive text-destructive placeholder:text-destructive/60',
        success: 'border-green-500 focus:ring-2 focus:ring-green-500',
      },
      size: {
        sm: 'h-9 px-3 py-1 text-sm',
        default: 'h-10 px-3 py-2 text-sm',
        lg: 'h-12 px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, type, leftIcon, rightIcon, ...props }, ref) => {
    if (leftIcon || rightIcon) {
      return (
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(inputVariants({ variant, size, className }), leftIcon && 'pl-10', rightIcon && 'pr-10')}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center pointer-events-none text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
      );
    }

    return <input type={type} className={cn(inputVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Input.displayName = 'Input';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    Omit<VariantProps<typeof inputVariants>, 'size'> {
  size?: 'sm' | 'default' | 'lg';
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, size = 'default', ...props }, ref) => {
    const sizeClasses = {
      sm: 'min-h-[80px] px-3 py-2 text-sm',
      default: 'min-h-[100px] px-3 py-2 text-sm',
      lg: 'min-h-[120px] px-4 py-3 text-base',
    };

    return (
      <textarea
        className={cn(
          'flex w-full rounded-md border bg-background text-foreground transition-all duration-200 placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none',
          variant === 'error'
            ? 'border-destructive focus:ring-2 focus:ring-destructive text-destructive placeholder:text-destructive/60'
            : variant === 'success'
              ? 'border-green-500 focus:ring-2 focus:ring-green-500'
              : 'border-input focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
          sizeClasses[size],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Input, Textarea, inputVariants };
