
// State for deploying a chat to production.

import { sendCommandDedicatedClient } from "./ReplayProtocolClient";

// Deploy to a Netlify site.
interface DeploySettingsNetlify {
  // Authentication token for Netlify account.
  authToken: string;

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

// Deploy settings passed in to the protocol.
export interface DeploySettings {
  netlify?: DeploySettingsNetlify;
  supabase?: DeploySettingsSupabase;
}

// Deploy result returned from the protocol.
export interface DeployResult {
  error?: string;
  netlifySiteId?: string;
  siteURL?: string;
}

// Information about a chat's deployment saved to the database.
export interface DeploySettingsDatabase extends DeploySettings {
  // Last repository which was deployed.
  repositoryId?: string;

  // URL of the deployed site.
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
