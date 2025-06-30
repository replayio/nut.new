// Routines for parsing the current state of the app from backend messages.

import { assert } from '~/lib/replay/ReplayProtocolClient';
import type { Message } from './message';
import type { DatabaseSchema } from './databaseSchema';

// Message sent whenever the app summary is updated.
export const APP_SUMMARY_CATEGORY = 'AppSummary';

export enum PlaywrightTestStatus {
  Pass = 'Pass',
  Fail = 'Fail',
  NotRun = 'NotRun',
}

// Describes an app feature.
export interface AppFeature {
  // Short description of the feature.
  description: string;

  // Set when the feature has been implemented and all tests pass.
  done: boolean;
}

// Describes a planned or implemented playwright test.
export interface AppTest {
  // Title of the test.
  title: string;

  // Any feature associated with this test.
  featureIndex?: number;

  // Set after the test has been implemented.
  status?: PlaywrightTestStatus;

  // Any recording from the last time the test ran.
  recordingId?: string;
}

// Describes a backend serverless function API which the app requires.
export interface AppBackendAPI {
  // First feature which depends on this API.
  featureIndex?: number;

  // Name of the backend function.
  name: string;

  // Short description of the backend function.
  description: string;
}

// Describes a change to the database schema.
export interface AppDatabaseChange {
  // First feature which depends on this database change.
  featureIndex?: number;

  // Database schema change, incremental with previous changes.
  schema: DatabaseSchema;
}

// In some cases details of an app are abstracted away to make them easier to reuse.
//
// Abstractions are always enclosed with [brackets] in abstracted app descriptions,
// prompts and the app UIs.
//
// For example, a "Todo List" app and a "Grocery List" app can be abstracted the same
// way as a "[Something] List" app where "Something" = "Todo" or "Grocery" when
// instantiating the two apps.
//
// Apps in the Arboretum are always abstracted, and when building for the Arboretum
// we abstract away features when possible early on.
//
// Apps built for normal clients (not for the Arboretum) are always instantiated.
// After finding an app in the Arboretum it will be instantiated before being returned.
export interface AppAbstraction {
  // Name of the abstraction as referred to in the abstracted description.
  name: string;

  // Value in the original client messages which this abstraction represents.
  representation: string;
}

export interface AppSummary {
  // Short and high level description of the app.
  description: string;

  // Any abstractions in use by this app.
  abstractions: AppAbstraction[];

  // All the app's features.
  features: AppFeature[];

  // Any available details about the app's implementation plan.
  tests?: AppTest[];
  backendAPIs?: AppBackendAPI[];
  databaseChanges?: AppDatabaseChange[];

  // Any planned feature for which initial code changes have been made but not
  // all tests are passing yet.
  inProgressFeatureIndex?: number;

  // The repository being described, if available. Currently only set for client messages.
  repositoryId?: string;

  // Version string of the repository: Major.Minor.Patch
  // The version advances every time the app changes.
  // Currently only set for client messages.
  version?: string;
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
  if (!messages) {
    return null;
  }

  // Find the last message with APP_SUMMARY_CATEGORY
  const appSummaryMessage = messages
    .slice()
    .reverse()
    .find((message) => message.category === APP_SUMMARY_CATEGORY);

  if (!appSummaryMessage) {
    return null;
  }
  return parseAppSummaryMessage(appSummaryMessage) || null;
};
