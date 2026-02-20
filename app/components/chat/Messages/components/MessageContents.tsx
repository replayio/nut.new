/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import * as React from 'react';
import { MarkdownWithCheckboxes } from '~/components/chat/MarkdownWithCheckboxes';
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
import { buildBreadcrumbData } from '~/utils/componentBreadcrumb';
import { autoFenceCodeBlocks } from '~/utils/markdown-preprocessor';
import type { ChatMessageParams } from '~/components/chat/ChatComponent/components/ChatImplementer/ChatImplementer';
import { parseCheckboxContent } from '~/components/chat/CheckboxForm';

interface MessageContentsProps {
  message: Message;
  messages?: Message[];
  onCheckboxChange?: (contents: string, checked: boolean) => void;
  sendMessage?: (params: ChatMessageParams) => void;
}

export function MessageContents({ message, messages = [], sendMessage }: MessageContentsProps) {
  const componentNames = message.componentReference?.componentNames || [];

  const isReactComponent = (name: string) => name && name[0] === name[0].toUpperCase();

  const breadcrumbData = buildBreadcrumbData(componentNames, {
    getDisplayName: (name) => name,
    getKind: (name) => (isReactComponent(name) ? 'react' : 'html'),
  });

  const filteredNodes = breadcrumbData?.filteredNodes ?? [];
  const htmlElements = breadcrumbData?.htmlElements ?? [];
  const firstReact = breadcrumbData?.firstReact;
  const lastReact = breadcrumbData?.lastReact;
  const lastHtml = breadcrumbData?.lastHtml;

  // Process only user messages to auto-fence code blocks
  // Assistant messages should already have proper code fencing
  const processedContent = React.useMemo(() => {
    if (message.role === 'user') {
      return autoFenceCodeBlocks(message.content);
    }
    return message.content;
  }, [message.content, message.role]);

  // Check if this message has checkboxes
  const hasCheckboxes = React.useMemo(() => {
    const parsed = parseCheckboxContent(processedContent);
    return parsed.hasCheckboxes;
  }, [processedContent]);

  // Find the index of this message in the messages array
  const messageIndex = React.useMemo(() => {
    return messages.findIndex((m) => m.id === message.id);
  }, [messages, message.id]);

  // Get the next user message after this checkbox message (if any)
  // This user message contains the checkbox selections
  // Note: There may be other assistant messages (like DiscoveryRating) between the checkbox message and user response
  const nextUserMessage = React.useMemo(() => {
    if (!hasCheckboxes || messageIndex === -1) {
      return null;
    }

    // Search for the first user message after this checkbox message
    for (let i = messageIndex + 1; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'user') {
        return msg;
      }
    }

    return null;
  }, [hasCheckboxes, messageIndex, messages]);

  // Parse the user message content to extract selections
  // Each selection is on a separate line in the format: "displayText - description"
  const existingSelections = React.useMemo(() => {
    if (!nextUserMessage) {
      return undefined;
    }

    // Split by newlines and filter empty lines
    const selections = nextUserMessage.content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return selections.length > 0 ? selections : undefined;
  }, [nextUserMessage]);

  // Checkbox form is read-only if there's a user message after it (indicating submission)
  const isReadOnly = !!nextUserMessage;

  // Handle checkbox form submission - just send the message, no Supabase needed
  const handleCheckboxSubmit = React.useCallback(
    (params: ChatMessageParams) => {
      if (sendMessage) {
        sendMessage(params);
      }
    },
    [sendMessage],
  );

  return (
    <div data-testid="message-content" className="overflow-hidden">
      {filteredNodes.length > 0 && (
        <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg flex-wrap">
          <div className="i-ph:cursor text-blue-500 text-sm flex-shrink-0"></div>
          <div className="text-sm font-medium">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <span className="text-foreground">Selected:</span>
                </BreadcrumbItem>

                {/* Show currently selected React component (last React component) */}
                {lastReact && firstReact && lastReact.displayName !== firstReact.displayName && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-blue-600 dark:text-blue-400">
                        {lastReact.displayName}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}

                {/* Second ellipsis for HTML elements (if there are any) */}
                {htmlElements.length > 1 && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors bg-accent border border-border rounded-lg p-1">
                          <BreadcrumbEllipsis className="h-4 w-4" />
                          <span className="sr-only">More HTML elements</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {htmlElements.slice(1, -1).map((node, index: number) => (
                            <DropdownMenuItem key={index} className="text-purple-600 dark:text-purple-400">
                              &lt;{node.displayName}&gt;
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
                      <BreadcrumbPage className="text-purple-600 dark:text-purple-400">
                        &lt;{lastHtml.displayName}&gt;
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      )}
      <div className="prose prose-sm max-w-none text-foreground">
        <MarkdownWithCheckboxes
          html
          message={message}
          existingSelections={existingSelections}
          isReadOnly={isReadOnly}
          onChecklistSubmit={hasCheckboxes ? handleCheckboxSubmit : undefined}
        >
          {processedContent}
        </MarkdownWithCheckboxes>
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
