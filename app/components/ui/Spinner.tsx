import { memo } from 'react';
import { cn } from '~/lib/utils';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  text?: string;
  textClassName?: string;
  variant?: 'default' | 'dual' | 'dots';
}

const sizeClasses: Record<SpinnerSize, { spinner: string; border: string; text: string }> = {
  xs: { spinner: 'w-3 h-3', border: 'border', text: 'text-xs' },
  sm: { spinner: 'w-4 h-4', border: 'border-2', text: 'text-sm' },
  md: { spinner: 'w-6 h-6', border: 'border-2', text: 'text-sm' },
  lg: { spinner: 'w-12 h-12', border: 'border-4', text: 'text-base' },
  xl: { spinner: 'w-16 h-16', border: 'border-4', text: 'text-lg' },
};

export const Spinner = memo(({ size = 'md', className, text, textClassName, variant = 'default' }: SpinnerProps) => {
  const sizeConfig = sizeClasses[size];

  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex space-x-1">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={cn(
                'bg-muted-foreground rounded-full animate-pulse',
                size === 'xs' && 'w-1 h-1',
                size === 'sm' && 'w-1.5 h-1.5',
                size === 'md' && 'w-2 h-2',
                size === 'lg' && 'w-2.5 h-2.5',
                size === 'xl' && 'w-3 h-3',
              )}
              style={{
                animationDelay: `${index * 150}ms`,
                animationDuration: '1s',
              }}
            />
          ))}
        </div>
        {text && <span className={cn('text-muted-foreground', sizeConfig.text, textClassName)}>{text}</span>}
      </div>
    );
  }

  if (variant === 'dual') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="relative">
          <div
            className={cn(
              sizeConfig.spinner,
              sizeConfig.border,
              'rounded-full border-border border-t-foreground animate-spin',
            )}
          />
          <div
            className={cn(
              'absolute inset-0 rounded-full border-transparent border-t-muted-foreground/30 animate-spin',
              sizeConfig.spinner,
              sizeConfig.border,
            )}
            style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
          />
        </div>
        {text && <span className={cn('text-muted-foreground', sizeConfig.text, textClassName)}>{text}</span>}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          sizeConfig.spinner,
          sizeConfig.border,
          'rounded-full border-muted-foreground border-t-foreground animate-spin',
        )}
      />
      {text && <span className={cn('text-muted-foreground', sizeConfig.text, textClassName)}>{text}</span>}
    </div>
  );
});

Spinner.displayName = 'Spinner';
