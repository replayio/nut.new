
// State for deploying a chat to production.

import { sendCommandDedicatedClient } from "./ReplayProtocolClient";

// Deploy to a Netlify site.
interface DeploySettingsNetlify {
  // ID of any existing site to link to.
  siteId?: string;

  // Information needed when creating a new site.
  createInfo?: {
    accountSlug: string;
    siteName: string;
  };
}

// Deploy to a Supabase project.
interface DeploySettingsSupabase {
  // URL of the Supabase project.
  databaseURL: string;

  // Anonymous key for the Supabase project.
  anonKey: string;

  // Internal URL of the Postgres database, including password.
  postgresURL: string;
}

export interface DeploySettings {
  netlify?: DeploySettingsNetlify;
  supabase?: DeploySettingsSupabase;
}

export interface DeployResult {
  error?: string;
  netlifySiteId?: string;
  siteURL?: string;
}

export async function deployRepository(repositoryId: string, settings: DeploySettings): Promise<DeployResult> {
  const { result } = await sendCommandDedicatedClient({
    method: 'Nut.deployRepository',
    params: {
      repositoryId,
      settings,
    },
  }) as { result: DeployResult };

  return result;
}
