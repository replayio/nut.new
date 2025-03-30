// Client messages match the format used by the Nut protocol.

import { generateId } from '~/utils/fileUtils';

type MessageRole = 'user' | 'assistant';

interface MessageBase {
  id: string;
  role: MessageRole;
  repositoryId?: string;
}

interface MessageText extends MessageBase {
  type: 'text';
  content: string;
}

interface MessageImage extends MessageBase {
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
