// Client messages match the format used by the Nut protocol.

import { generateId } from '~/utils/fileUtils';
import { assert } from '~/lib/replay/ReplayProtocolClient';

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

function ignoreMessageRepositoryId(message: Message) {
  if (message.category === SEARCH_ARBORETUM_CATEGORY) {
    // Repositories associated with Arboretum search results have details abstracted
    // and shouldn't be displayed in the UI. We should get a new message shortly
    // afterwards with the repository instantiated for details in this request.
    return true;
  }
  return false;
}

// Get the repositoryId before any changes in the message at the given index.
export function getPreviousRepositoryId(messages: Message[], index: number): string | undefined {
  for (let i = index - 1; i >= 0; i--) {
    const message = messages[i];

    if (message.repositoryId && !ignoreMessageRepositoryId(message)) {
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

// Message sent whenever tests have been run.
export const TEST_RESULTS_CATEGORY = 'TestResults';

export function parseTestResultsMessage(message: Message): PlaywrightTestResult[] {
  if (message.type !== 'text') {
    return [];
  }

  const results: PlaywrightTestResult[] = [];
  const lines = message.content.split('\n');
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

// Message sent after the initial user response to describe the app's features.
// Contents are a JSON-stringified AppDescription.
export const DESCRIBE_APP_CATEGORY = 'DescribeApp';

export interface AppDescription {
  // Short description of the app's overall purpose.
  description: string;

  // Short descriptions of each feature of the app, in the order they should be implemented.
  features: string[];
}

export function parseDescribeAppMessage(message: Message): AppDescription | undefined {
  try {
    assert(message.type === 'text', 'Message is not a text message');
    const appDescription = JSON.parse(message.content) as AppDescription;
    assert(appDescription.description, 'Missing description');
    assert(appDescription.features, 'Missing features');
    return appDescription;
  } catch (e) {
    console.error('Failed to parse describe app message', e);
    return undefined;
  }
}

// Message sent when a match was found in the arboretum.
// Contents are a JSON-stringified ArboretumMatch.
export const SEARCH_ARBORETUM_CATEGORY = 'SearchArboretum';

export interface BestAppFeatureResult {
  arboretumRepositoryId: string;
  arboretumDescription: AppDescription;
  revisedDescription: AppDescription;
}

export function parseSearchArboretumResult(message: Message): BestAppFeatureResult | undefined {
  try {
    assert(message.type === 'text', 'Message is not a text message');
    const bestAppFeatureResult = JSON.parse(message.content) as BestAppFeatureResult;
    assert(bestAppFeatureResult.arboretumRepositoryId, 'Missing arboretum repository id');
    assert(bestAppFeatureResult.arboretumDescription, 'Missing arboretum description');
    assert(bestAppFeatureResult.revisedDescription, 'Missing revised description');
    return bestAppFeatureResult;
  } catch (e) {
    console.error('Failed to parse best app feature result message', e);
    return undefined;
  }
}

// Message sent when a feature has finished being implemented.
export const FEATURE_DONE_CATEGORY = 'FeatureDone';

export interface FeatureDoneResult {
  implementedFeatureIndex: number;
  featureDescription: string;
}

export function parseFeatureDoneMessage(message: Message): FeatureDoneResult | undefined {
  try {
    assert(message.type === 'text', 'Message is not a text message');
    const featureDoneResult = JSON.parse(message.content) as FeatureDoneResult;
    assert(featureDoneResult.featureDescription, 'Missing feature description');
    return featureDoneResult;
  } catch (e) {
    console.error('Failed to parse feature done message', e);
    return undefined;
  }
}
