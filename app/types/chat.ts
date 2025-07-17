import type { Message, MessageImage, MessageText } from '~/lib/persistence/message';
import type { RejectChangeData } from '~/components/chat/ApproveChange';

export interface ChatProps {
  initialMessages: Message[];
}

export interface ChatImplProps extends ChatProps {
  onApproveChange?: (messageId: string) => Promise<void>;
  onRejectChange?: (messageId: string, data: RejectChangeData) => Promise<void>;
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
