// Routines for parsing the current state of the app from backend messages.

import { assert } from '~/lib/replay/ReplayProtocolClient';
import type { Message } from './message';
import type { DatabaseSchema } from './databaseSchema';
import { setInitialAppSummary } from '~/lib/stores/appSummary';

// Message sent whenever the app summary is updated.
export const APP_SUMMARY_CATEGORY = 'AppSummary';

export enum PlaywrightTestStatus {
  Pass = 'Pass',
  Fail = 'Fail',
  NotRun = 'NotRun',
}

// Details of the app have a short name and a one sentence description.
export interface AppDetail {
  name: string;
  description: string;
}

// Describes the contents of a page in the app.
export interface AppPage {
  // Path to this page in the app. '/' for the root page, may include wildcards.
  path: string;

  // One sentence description of the page.
  description: string;

  // All components on the page. Name is the component class or function name.
  components: AppDetail[];
}

// Kinds of APIs a feature can define or use.
export enum AppAPIKind {
  // A serverless function which is defined in the backend and called by the frontend.
  ServerlessFunction = 'ServerlessFunction',

  // A function defined in library code and called by frontend components.
  Frontend = 'Frontend',

  // A function defined in library code and called by backend functions.
  Backend = 'Backend',
}

// An API defined or used by a feature.
export interface AppAPI extends AppDetail {
  kind: AppAPIKind;
}

// The status of a feature describes its implementation and whether associated components
// should be functional.
export enum AppFeatureStatus {
  // Not started, all components will be non-functional.
  NotStarted = 'NotStarted',

  // Finished and tests pass, all components will be (or ought to be) functional.
  Done = 'Done',

  // Implementation has started but components may not be functional yet.
  InProgress = 'InProgress',
}

export interface AppFeature {
  // Short name for the feature.
  name: string;

  // Current status of the feature.
  status: AppFeatureStatus;

  // Any existing feature in the Arboretum which will be used to implement this one.
  arboretumRepositoryId?: string;

  // One sentence description of the feature.
  description: string;

  // One paragraph summary of the feature's requirements.
  summary: string;

  // Names of any components which the feature implements.
  componentNames?: string[];

  // Any APIs defined by other features and used by this feature.
  usedAPIs?: AppAPI[];

  // Any APIs defined by this feature.
  definedAPIs?: AppAPI[];

  // Any database changes needed by the feature.
  databaseChange?: DatabaseSchema;

  // Any secrets required by backend APIs in the feature.
  // Names are environment variables.
  secrets?: AppDetail[];

  // Tests for functionality added by the feature.
  tests?: AppTest[];
}

// Describes a planned or implemented playwright test.
export interface AppTest {
  title: string;

  // Set after the test has been implemented.
  status?: PlaywrightTestStatus;

  // Any recording from the last time the test ran.
  recordingId?: string;
}

export interface AppSummary {
  // Short and high level description of the app.
  description: string;

  // Filled in by PlanApp:Start phase.
  pages?: AppPage[];
  navigation?: string;

  // Filled in by PlanApp:DescribeFeatures phase.
  features?: AppFeature[];

  // The repository being described, if available.
  repositoryId?: string;

  // Version string of the repository: Major.Minor.Patch
  // The version advances every time the app changes.
  version?: string;
}

export function parseAppSummaryMessage(message: Message): AppSummary | undefined {
  try {
    assert(message.category === APP_SUMMARY_CATEGORY, 'Message is not an app summary message');
    assert(message.type === 'text', 'Message is not a text message');
    const appSummary = JSON.parse(message.content) as AppSummary;
    setInitialAppSummary(appSummary);
    assert(appSummary.description, 'Missing app description');
    assert(appSummary.pages, 'Missing app pages');
    return appSummary;
  } catch (e) {
    console.error('Failed to parse app summary message', e);
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
