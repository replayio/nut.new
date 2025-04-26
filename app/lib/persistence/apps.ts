// Functions for accessing the apps table in the database

import { getSupabase } from '~/lib/supabase/client';
import type { Message } from './message';

export enum BuildAppOutcome {
  Success = 'success',
  Error = 'error',
}

export interface BuildAppResult {
  title: string | undefined;
  elapsedMinutes: number;
  totalPeanuts: number;
  imageDataURL: string | undefined;
  messages: Message[];
  protocolChatId: string;
  outcome: BuildAppOutcome;
  appId: string;
}

function databaseRowToBuildAppResult(row: any): BuildAppResult {
  // Determine the outcome based on the result field
  let outcome = BuildAppOutcome.Error;
  if (row.outcome === 'success') {
    outcome = BuildAppOutcome.Success;
  }

  return {
    title: row.title,
    elapsedMinutes: row.elapsed_minutes || 0,
    totalPeanuts: row.total_peanuts || 0,
    imageDataURL: row.image_url,
    messages: row.messages || [],
    protocolChatId: row.protocol_chat_id,
    outcome,
    appId: row.app_id,
  };
}

/**
 * Get all apps created within the last X hours
 * @param hours Number of hours to look back
 * @returns Array of BuildAppResult objects
 */
async function getAppsCreatedInLastXHours(hours: number): Promise<BuildAppResult[]> {
  try {
    // Calculate the timestamp for X hours ago
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);

    const { data, error } = await getSupabase()
      .from('apps')
      .select('*')
      .eq('deleted', false)
      .gte('created_at', hoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recent apps:', error);
      throw error;
    }

    // Ignore apps that don't have a title or image.
    return data.map(databaseRowToBuildAppResult).filter((app) => app.title && app.imageDataURL);
  } catch (error) {
    console.error('Failed to get recent apps:', error);
    throw error;
  }
}

const HOUR_RANGES = [1, 2, 3, 6, 12, 24];

export async function getRecentApps(numApps: number): Promise<BuildAppResult[]> {
  let apps: BuildAppResult[] = [];
  for (const range of HOUR_RANGES) {
    apps = await getAppsCreatedInLastXHours(range);
    if (apps.length >= numApps) {
      return apps.slice(0, numApps);
    }
  }
  return apps;
}
