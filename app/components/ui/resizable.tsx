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
        'relative flex items-center justify-center w-4 group cursor-col-resize',
        'focus-visible:outline-none',
        className,
      )}
      {...props}
    >
      <div className="h-12 w-1.5 rounded-full bg-white/20 group-hover:bg-white/30 transition-all" />
    </ResizablePrimitiveHandle>
  ),
);
ResizableHandle.displayName = 'ResizableHandle';


