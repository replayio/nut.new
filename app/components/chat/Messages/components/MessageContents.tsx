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
        <div data-testid="message-content" className="overflow-hidden">
          <div className="prose prose-sm max-w-none text-bolt-elements-textPrimary">
            <Markdown html onCheckboxChange={onCheckboxChange}>
              {message.content}
            </Markdown>
          </div>
        </div>
      );
    case 'image':
      return (
        <div data-testid="message-content" className="overflow-hidden">
          <div className="flex flex-col gap-4 mt-2">
            <div className="relative group">
              <img
                src={message.dataURL}
                className="max-w-full h-auto rounded-xl border border-bolt-elements-borderColor shadow-lg transition-all duration-200 group-hover:shadow-xl"
                style={{ maxHeight: '512px', objectFit: 'contain' }}
                alt="Uploaded image"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
            </div>
          </div>
        </div>
      );
  }
}
