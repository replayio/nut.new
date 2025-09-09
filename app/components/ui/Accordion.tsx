import * as RadixAccordion from '@radix-ui/react-accordion';
import { forwardRef } from 'react';
import { classNames } from '~/utils/classNames';

// Root component
const Accordion = RadixAccordion.Root;

// Item component
const AccordionItem = forwardRef<
  React.ElementRef<typeof RadixAccordion.Item>,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Item>
>(({ className, ...props }, ref) => (
  <RadixAccordion.Item
    ref={ref}
    className={classNames('border-b border-bolt-elements-borderColor', className)}
    {...props}
  />
));
AccordionItem.displayName = 'AccordionItem';

// Trigger component
const AccordionTrigger = forwardRef<
  React.ElementRef<typeof RadixAccordion.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Trigger>
>(({ className, children, ...props }, ref) => (
  <RadixAccordion.Header className="flex">
    <RadixAccordion.Trigger
      ref={ref}
      className={classNames(
        'flex flex-1 items-center justify-between py-4 px-4 font-medium text-sm transition-all bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary [&[data-state=open]>svg]:rotate-180',
        className,
      )}
      {...props}
    >
      {children}
      <svg
        className="h-4 w-4 shrink-0 transition-transform duration-200 text-bolt-elements-textSecondary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </RadixAccordion.Trigger>
  </RadixAccordion.Header>
));
AccordionTrigger.displayName = RadixAccordion.Trigger.displayName;

// Content component
const AccordionContent = forwardRef<
  React.ElementRef<typeof RadixAccordion.Content>,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Content>
>(({ className, children, ...props }, ref) => (
  <RadixAccordion.Content
    ref={ref}
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down bg-bolt-elements-background-depth-2"
    {...props}
  >
    <div className={classNames('pb-4 pt-0 bg-bolt-elements-background-depth-2', className)}>
      {children}
    </div>
  </RadixAccordion.Content>
));
AccordionContent.displayName = RadixAccordion.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };