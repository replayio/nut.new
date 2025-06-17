// Routines for parsing the current state of the app from backend messages.

import { assert } from '~/lib/replay/ReplayProtocolClient';
import type { Message } from './message';

// Message sent whenever the app summary is updated.
export const APP_SUMMARY_CATEGORY = 'AppSummary';

export interface AppFeature {
  id: number;
  description: string;

  // Set when the feature has been implemented and all tests pass.
  done: boolean;
}

export enum PlaywrightTestStatus {
  Pass = 'Pass',
  Fail = 'Fail',
  NotRun = 'NotRun',
}

export interface AppTest {
  title: string;
  featureId?: number;
  status: PlaywrightTestStatus;
  recordingId?: string;
}

export interface AppAbstraction {
  // Name of the abstraction as referred to in the abstracted description.
  name: string;

  // Value in the original client messages which this abstraction represents.
  representation: string;
}

export interface AppSummary {
  description: string;
  abstractions: AppAbstraction[];
  features: AppFeature[];
  tests: AppTest[];

  // Any planned feature for which initial code changes have been made but not
  // all tests are passing yet.
  inProgressFeatureId?: number;
}

export function parseAppSummaryMessage(message: Message): AppSummary | undefined {
  try {
    assert(message.category === APP_SUMMARY_CATEGORY, 'Message is not an app summary message');
    assert(message.type === 'text', 'Message is not a text message');
    const appSummary = JSON.parse(message.content) as AppSummary;
    assert(appSummary.description, 'Missing app description');
    return appSummary;
  } catch (e) {
    console.error('Failed to parse feature done message', e);
    return undefined;
  }
}

  // Get the latest app summary from messages (use passed messages, not store)
  export const getLatestAppSummary = (messages: Message[]): AppSummary | null => {
    if (!messages) return null;
    
    // Find the last message with APP_SUMMARY_CATEGORY
    const appSummaryMessage = messages
      .slice()
      .reverse()
      .find(message => message.category === APP_SUMMARY_CATEGORY);
    
    if (!appSummaryMessage) return null;
    return parseAppSummaryMessage(appSummaryMessage) || null;
  };