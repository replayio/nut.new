/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { Markdown } from '~/components/chat/Markdown';
import type { Message } from '~/lib/persistence/message';

interface MessageContentsProps {
  message: Message;
  onCheckboxChange?: (contents: string, checked: boolean) => void;
}

export function MessageContents({ message, onCheckboxChange }: MessageContentsProps) {
  switch (message.type) {
    case 'text':
      return (
        <div data-testid="message-content" className="overflow-hidden pt-[4px]">
          <Markdown html onCheckboxChange={onCheckboxChange}>
            {message.content}
          </Markdown>
        </div>
      );
    case 'image':
      return (
        <div data-testid="message-content" className="overflow-hidden pt-[4px]">
          <div className="flex flex-col gap-4">
            <img
              src={message.dataURL}
              className="max-w-full h-auto rounded-lg"
              style={{ maxHeight: '512px', objectFit: 'contain' }}
            />
          </div>
        </div>
      );
  }
}
