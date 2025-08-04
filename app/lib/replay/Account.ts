// Methods for getting information about the user's account.

import { callNutAPI } from './NutAPI';

export async function getPeanutsRemaining(): Promise<number> {
  const { peanutsRemaining } = await callNutAPI('get-peanuts-remaining', {});
  return peanutsRemaining;
}

export async function getPeanutsSubscription(): Promise<{ peanuts: number; reloadTime: string } | undefined> {
  const { peanuts, reloadTime } = await callNutAPI('get-peanuts-subscription', {});
  return { peanuts, reloadTime };
}

// Set a subscription for peanuts. Every month if the number of peanuts is below
// than the subscribed value, it will be set to that value.
export async function setPeanutsSubscription(peanuts: number) {
  await callNutAPI('set-peanuts-subscription', { peanuts });
}

// One time addition of peanuts to the account.
export async function addPeanuts(peanuts: number) {
  await callNutAPI('add-peanuts', { peanuts });
}

enum PeanutChangeReason {
  SetSubscription = 'SetSubscription',
  SubscriptionRefill = 'SubscriptionRefill',
  AddPeanuts = 'AddPeanuts',
  FeatureImplemented = 'FeatureImplemented',
  FeatureValidated = 'FeatureValidated',
}

interface PeanutHistoryEntry {
  time: string;

  // Change in peanuts due to this entry.
  peanutsDelta: number;

  // Peanuts remaining on the account after this entry.
  peanutsRemaining: number;

  // Reason for the change.
  reason: PeanutChangeReason;
  subscriptionPeanuts?: number;
  appId?: string;
  featureName?: string;
}

export async function getPeanutsHistory(): Promise<PeanutHistoryEntry[]> {
  const { history } = await callNutAPI('get-peanuts-history', {});
  return history;
}
