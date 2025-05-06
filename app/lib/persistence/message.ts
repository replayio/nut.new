// Client messages match the format used by the Nut protocol.

import { generateId } from '~/utils/fileUtils';

type MessageRole = 'user' | 'assistant';

interface MessageBase {
  id: string;
  role: MessageRole;
  repositoryId?: string;
  peanuts?: number;
  category?: string;

  // Not part of the protocol, indicates whether the user has explicitly approved
  // the message. Once approved, the approve/reject UI is not shown again for the message.
  approved?: boolean;
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

export enum PlaywrightTestStatus {
  Pass = 'Pass',
  Fail = 'Fail',
  NotRun = 'NotRun',
}

export interface PlaywrightTestResult {
  title: string;
  status: PlaywrightTestStatus;
  recordingId?: string;
}

export function parseTestResultsMessage(contents: string): PlaywrightTestResult[] {
  const results: PlaywrightTestResult[] = [];
  const lines = contents.split('\n');
  for (const line of lines) {
    const match = line.match(/TestResult (.*?) (.*?) (.*)/);
    if (!match) {
      continue;
    }
    const [status, recordingId, title] = match.slice(1);
    results.push({
      status: status as PlaywrightTestStatus,
      title,
      recordingId: recordingId == 'NoRecording' ? undefined : recordingId,
    });
  }
  return results;
}
