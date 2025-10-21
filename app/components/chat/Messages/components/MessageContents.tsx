/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import * as React from 'react';
import { Markdown } from '~/components/chat/Markdown';
import { AttachmentDisplay } from './AttachmentDisplay';
import type { Message } from '~/lib/persistence/message';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbEllipsis,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

interface MessageContentsProps {
  message: Message;
  onCheckboxChange?: (contents: string, checked: boolean) => void;
}

export function MessageContents({ message, onCheckboxChange }: MessageContentsProps) {
  const componentNames = message.componentReference?.componentNames || [];

  // Filter and reverse the array
  const reversedNames = [...componentNames].reverse();
  const filteredNames = reversedNames.filter(
    (name: string) => !(name.includes('Provider') || name === 'Anonymous' || name.includes('$')),
  );

  
  // Helper to determine if a name is a React component (PascalCase) or HTML element (lowercase)
  const isReactComponent = (name: string) => {
    return name && name[0] === name[0].toUpperCase();
  };

  // Separate React components from HTML elements
  const reactComponents = filteredNames.filter(isReactComponent);
  const htmlElements = filteredNames.filter((name) => !isReactComponent(name));

  const firstReact = reactComponents[0];
  const lastReact = reactComponents[reactComponents.length - 1]; // Currently selected React component
  const lastHtml = htmlElements[htmlElements.length - 1]; // Currently selected HTML element

  return (
    <div data-testid="message-content" className="overflow-hidden">
      {filteredNames.length > 0 && (
        <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg flex-wrap">
          <div className="i-ph:cursor text-blue-500 text-sm flex-shrink-0"></div>
          <div className="text-sm font-medium">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <span className="text-bolt-elements-textPrimary">Selected:</span>
                </BreadcrumbItem>

                {/* Show currently selected React component (last React component) */}
                {lastReact && lastReact !== firstReact && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-blue-600 dark:text-blue-400">{lastReact}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}

                {/* Second ellipsis for HTML elements (if there are any) */}
                {htmlElements.length > 1 && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center gap-1 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors">
                          <BreadcrumbEllipsis className="h-4 w-4" />
                          <span className="sr-only">More HTML elements</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {htmlElements.slice(0, -1).map((name: string, index: number) => (
                            <DropdownMenuItem key={index} className="text-purple-600 dark:text-purple-400">
                              &lt;{name}&gt;
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </BreadcrumbItem>
                  </>
                )}

                {/* Show currently selected HTML element (last HTML element) */}
                {lastHtml && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-purple-600 dark:text-purple-400">{lastHtml}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      )}
      <div className="prose prose-sm max-w-none text-bolt-elements-textPrimary">
        <Markdown html onCheckboxChange={onCheckboxChange}>
          {message.content}
        </Markdown>
      </div>
      {message.attachments && message.attachments.length > 0 && (
        <div className="mt-3 space-y-2">
          {message.attachments.map((attachment, index) => (
            <AttachmentDisplay key={`${attachment.attachmentId}-${index}`} attachment={attachment} />
          ))}
        </div>
      )}
    </div>
  );
}
