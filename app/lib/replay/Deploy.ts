// State for deploying a chat to production.

import { callNutAPI } from './NutAPI';

// External Netlify credentials for deployment.
export interface DeploySettingsNetlify {
  // Authentication token for Netlify account.
  authToken: string;

  // Account slug for creating a new site.
  accountSlug: string;
}

// External Supabase credentials for deployment.
export interface DeploySettingsSupabase {
  // URL of the Supabase project.
  databaseURL: string;

  // Anonymous key for the Supabase project.
  anonKey: string;

  // Service role key for the Supabase project.
  serviceRoleKey: string;

  // Internal URL of the Postgres database, including password.
  postgresURL: string;
}

// Result of attempting to deploy an app.
export interface DeployResult {
  // Deployment time.
  time: string;

  // Site name used.
  siteName: string;

  // Repository and version of the app which was deployed.
  repositoryId: string;
  version: string;

  // Any error encountered.
  error?: string;

  // On a successful deployment, the Netlify site ID and app URL.
  netlifySiteId?: string;
  siteURL?: string;
}

// Deployment settings for an app.
export interface DeploySettings {
  // Result of every deployment attempt.
  results?: DeployResult[];

  // Name of the site to create.
  siteName?: string;

  // Any external Netlify account to use.
  netlify?: DeploySettingsNetlify;

  // Any external Supabase credentials to use.
  supabase?: DeploySettingsSupabase;
}

export async function deployApp(appId: string, settings: DeploySettings): Promise<DeployResult> {
  const { result } = await callNutAPI('deploy-app', {
    appId,
    settings,
  });

  return result;
}

export function lastDeployResult(deploySettings: DeploySettings): DeployResult | undefined {
  if (!deploySettings.results?.length) {
    return undefined;
  }
  return deploySettings.results[deploySettings.results.length - 1];
}

export async function downloadRepository(repositoryId: string): Promise<string> {
  const { repositoryContents } = await callNutAPI('get-repository-contents', {
    repositoryId,
  });

  return repositoryContents;
}
