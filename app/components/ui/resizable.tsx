"use client";

import * as React from 'react';
import {
  Panel as ResizablePrimitivePanel,
  PanelGroup as ResizablePrimitiveGroup,
  PanelResizeHandle as ResizablePrimitiveHandle,
  type PanelGroupProps,
  type PanelProps,
  type PanelResizeHandleProps,
} from 'react-resizable-panels';
import { cn } from '~/lib/utils';

type ResizableHandleProps = PanelResizeHandleProps & {
  withHandle?: boolean;
};

export const ResizablePanelGroup = React.forwardRef<HTMLDivElement, PanelGroupProps>(
  ({ className, ...props }, ref) => (
    <ResizablePrimitiveGroup ref={ref} className={cn('flex', className)} {...props} />
  ),
);
ResizablePanelGroup.displayName = 'ResizablePanelGroup';

export const ResizablePanel = React.forwardRef<HTMLDivElement, PanelProps>(({ className, ...props }, ref) => (
  <ResizablePrimitivePanel ref={ref} className={cn('flex flex-col', className)} {...props} />
));
ResizablePanel.displayName = 'ResizablePanel';

export const ResizableHandle = React.forwardRef<HTMLDivElement, ResizableHandleProps>(
  ({ withHandle = false, className, ...props }, ref) => (
    <ResizablePrimitiveHandle
      ref={ref}
      className={cn(
        'relative flex items-center justify-center px-0.5',
        'bg-bolt-elements-borderColor/40 transition-colors hover:bg-bolt-elements-borderColor/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bolt-elements-focus',
        className,
      )}
      {...props}
    >
      {withHandle ? (
        <div className="flex h-20 w-3 items-center justify-center rounded-full border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 shadow-sm">
          <div className="h-8 w-0.5 rounded-full bg-bolt-elements-borderColor/60" />
        </div>
      ) : (
        <span className="pointer-events-none absolute inset-y-1/4 left-1/2 w-[2px] -translate-x-1/2 rounded bg-bolt-elements-borderColor/70" />
      )}
    </ResizablePrimitiveHandle>
  ),
);
ResizableHandle.displayName = 'ResizableHandle';


