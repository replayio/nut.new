// Describes all the reference apps that can be used for customization
// during app building.

// Placeholder image URL for reference apps without a screenshot
export const REFERENCE_APP_PLACEHOLDER_PHOTO = 'https://placehold.co/800x450/1e293b/94a3b8?text=No+Photo';

// Release stage of a reference app.
export enum ReferenceAppStage {
  Alpha = 'Alpha',
  Beta = 'Beta',
  Release = 'Release',
}

// Tags for broadly categorizing reference apps.
enum ReferenceAppTag {
  Business = 'Business',
  Technical = 'Technical',
  Personal = 'Personal',
  Social = 'Social',
}

export interface LandingPageIndexEntry {
  referenceAppPath: string;
  stage: ReferenceAppStage;
  tags: ReferenceAppTag[];
  name: string;
  shortDescription: string;
  bulletPoints: string[];
  landingPageURL: string;
  screenshotURL: string | undefined;
}

export async function fetchReferenceApps(): Promise<LandingPageIndexEntry[]> {
  const response = await fetch('https://static.replay.io/test-artifacts/LandingPageIndex.json');
  return response.json();
}
