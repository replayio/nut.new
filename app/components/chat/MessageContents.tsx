/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { MODEL_REGEX, PROVIDER_REGEX } from '~/utils/constants';
import { Markdown } from './Markdown';
import type { Message } from '~/lib/persistence/message';

interface MessageContentsProps {
  message: Message;
}

export function MessageContents({ message }: MessageContentsProps) {
  switch (message.type) {
    case 'text':
      const textContent = stripMetadata(message.content);
      return <div className="overflow-hidden pt-[4px]"><Markdown html>{textContent}</Markdown></div>;
    case 'image':
      return (
        <div className="overflow-hidden pt-[4px]">
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

function stripMetadata(content: string) {
  return content.replace(MODEL_REGEX, '').replace(PROVIDER_REGEX, '');
}
