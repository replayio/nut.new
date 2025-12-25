// Describes all the reference apps that can be used for customization
// during app building.

// Release stage of a reference app.
enum ReferenceAppStage {
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
