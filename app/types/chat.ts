import type { Message, MessageImage, MessageText } from '~/lib/persistence/message';

export interface ChatProps {
  initialMessages: Message[];
}

// Re-export types we need
export type { Message, MessageImage, MessageText };

export interface UserMessage extends MessageText {
  role: 'user';
  type: 'text';
}

export interface UserImageMessage extends MessageImage {
  role: 'user';
  type: 'image';
}
