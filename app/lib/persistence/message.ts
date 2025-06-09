// Client messages match the format used by the Nut protocol.

import { generateId } from '~/utils/fileUtils';

type MessageRole = 'user' | 'assistant';

interface MessageBase {
  id: string;
  role: MessageRole;
  repositoryId?: string;
  repositoryURL?: string;
  peanuts?: number;
  category?: string;
  createTime?: string;

  // Not part of the protocol, indicates whether the user has explicitly approved
  // the message. Once approved, the approve/reject UI is not shown again for the message.
  approved?: boolean;
}

export interface MessageText extends MessageBase {
  type: 'text';
  content: string;
}

export interface MessageImage extends MessageBase {
  type: 'image';
  dataURL: string;
}

export type Message = MessageText | MessageImage;

// Get the repositoryId before any changes in the message at the given index.
export function getPreviousRepositoryId(messages: Message[], index: number): string | undefined {
  for (let i = index - 1; i >= 0; i--) {
    const message = messages[i];

    if (message.repositoryId) {
      return message.repositoryId;
    }
  }
  return undefined;
}

// Get the repositoryId after applying some messages.
export function getMessagesRepositoryId(messages: Message[]): string | undefined {
  return getPreviousRepositoryId(messages, messages.length);
}

// Return a couple messages for a new chat operating on a repository.
export function createMessagesForRepository(title: string, repositoryId: string): Message[] {
  const filesContent = `I've copied the "${title}" chat.`;

  const userMessage: Message = {
    role: 'user',
    id: generateId(),
    content: `Copy the "${title}" chat`,
    type: 'text',
  };

  const filesMessage: Message = {
    role: 'assistant',
    content: filesContent,
    id: generateId(),
    repositoryId,
    type: 'text',
  };

  const messages = [userMessage, filesMessage];

  return messages;
}

// Category for the initial response made to every user message.
// All messages up to the next UserResponse are responding to this message.
export const USER_RESPONSE_CATEGORY = 'UserResponse';
