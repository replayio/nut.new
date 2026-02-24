import * as RadixDialog from '@radix-ui/react-dialog';
import { motion, type Variants } from 'framer-motion';
import React, { memo, type ReactNode } from 'react';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { IconButton } from './IconButton';
import { Button } from './button';
import { X } from './Icon';

export { Close as DialogClose, Root as DialogRoot } from '@radix-ui/react-dialog';

const transition = {
  duration: 0.15,
  ease: cubicEasingFn,
};

export const dialogBackdropVariants = {
  closed: {
    opacity: 0,
    transition,
  },
  open: {
    opacity: 1,
    transition,
  },
} satisfies Variants;

export const dialogVariants = {
  closed: {
    x: '-50%',
    y: '-40%',
    scale: 0.96,
    opacity: 0,
    transition,
  },
  open: {
    x: '-50%',
    y: '-50%',
    scale: 1,
    opacity: 1,
    transition,
  },
} satisfies Variants;

interface DialogButtonProps {
  type: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
  onClick?: (event: React.UIEvent) => void;
  disabled?: boolean;
}

const variantMap = {
  primary: 'default',
  secondary: 'secondary',
  danger: 'destructive',
} as const;

export const DialogButton = memo(({ type, children, onClick, disabled = false }: DialogButtonProps) => {
  return (
    <Button variant={variantMap[type]} size="sm" className="h-[35px] rounded-lg" onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
});

export const DialogTitle = memo(({ className, children, ...props }: RadixDialog.DialogTitleProps) => {
  return (
    <RadixDialog.Title
      className={classNames(
        'px-5 py-4 flex items-center justify-between border-b border-border text-lg font-semibold leading-6 text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </RadixDialog.Title>
  );
});

export const DialogDescription = memo(({ className, children, ...props }: RadixDialog.DialogDescriptionProps) => {
  return (
    <RadixDialog.Description className={classNames('px-5 py-4 text-foreground text-md', className)} {...props}>
      {children}
    </RadixDialog.Description>
  );
});

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const dialogSizeClasses: Record<DialogSize, string> = {
  sm: 'max-w-[350px]',
  md: 'max-w-[450px]',
  lg: 'max-w-[600px]',
  xl: 'max-w-[900px]',
  full: 'max-w-[95vw]',
};

interface DialogProps {
  children: ReactNode | ReactNode[];
  className?: string;
  size?: DialogSize;
  showCloseButton?: boolean;
  onBackdrop?: (event: React.UIEvent) => void;
  onClose?: (event: React.UIEvent) => void;
}

export const Dialog = memo(
  ({ className, children, size = 'md', showCloseButton = true, onBackdrop, onClose }: DialogProps) => {
    return (
      <RadixDialog.Portal>
        <RadixDialog.Overlay onClick={onBackdrop} asChild>
          <motion.div
            className="bg-black/50 fixed inset-0 z-max"
            initial="closed"
            animate="open"
            exit="closed"
            variants={dialogBackdropVariants}
          />
        </RadixDialog.Overlay>
        <RadixDialog.Content asChild>
          <motion.div
            className={classNames(
              'fixed top-[50%] left-[50%] z-max max-h-[85vh] w-[90vw] translate-x-[-50%] translate-y-[-50%] border border-border rounded-lg bg-muted shadow-lg focus:outline-none overflow-hidden',
              dialogSizeClasses[size],
              className,
            )}
            initial="closed"
            animate="open"
            exit="closed"
            variants={dialogVariants}
          >
            {children}
            {showCloseButton && (
              <RadixDialog.Close asChild onClick={onClose}>
                <IconButton testId="dialog-close" icon={<X size={20} />} className="absolute top-[10px] right-[10px]" />
              </RadixDialog.Close>
            )}
          </motion.div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    );
  },
);
