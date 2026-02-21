import { classNames } from '~/utils/classNames';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={classNames('bg-muted-foreground animate-pulse rounded-md', className)}
      {...props}
    />
  );
}

export { Skeleton };
