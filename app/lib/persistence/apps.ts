// Functions for accessing the apps table in the database

import { getSupabase } from '~/lib/supabase/client';
import type { Message } from './message';
import { pingTelemetry } from '../hooks/pingTelemetry';

export interface BuildAppOutcome {
  testsPassed?: boolean;
  hasDatabase?: boolean;
}

export interface BuildAppSummary {
  id: string;
  title: string | undefined;
  prompt: string | undefined;
  elapsedMinutes: number;
  totalPeanuts: number;
  imageDataURL: string | undefined;
  outcome: BuildAppOutcome;
  appId: string;
  createdAt: string;
}

export interface BuildAppResult extends BuildAppSummary {
  messages: Message[];
  protocolChatId: string;
}

function parseBuildAppOutcome(outcome: string): BuildAppOutcome {
  try {
    const json = JSON.parse(outcome);
    return {
      testsPassed: !!json.testsPassed,
      hasDatabase: !!json.hasDatabase,
    };
  } catch (error) {
    // 2025/04/26: Watch for old formats for outcomes.
    if (outcome === 'success') {
      return {
        testsPassed: true,
      };
    }
    if (outcome === 'error') {
      return {
        testsPassed: false,
      };
    }
    console.error('Failed to parse outcome:', error);
    return {};
  }
}

const BUILD_APP_SUMMARY_COLUMNS = [
  'id',
  'title',
  'prompt',
  'elapsed_minutes',
  'total_peanuts',
  'image_url',
  'outcome',
  'app_id',
  'created_at',
].join(',');

function databaseRowToBuildAppSummary(row: any): BuildAppSummary {
  const outcome = parseBuildAppOutcome(row.outcome);

  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    elapsedMinutes: row.elapsed_minutes || 0,
    totalPeanuts: row.total_peanuts || 0,
    imageDataURL: row.image_url,
    outcome,
    appId: row.app_id,
    createdAt: row.created_at,
  };
}

function databaseRowToBuildAppResult(row: any): BuildAppResult {
  return {
    ...databaseRowToBuildAppSummary(row),
    messages: row.messages || [],
    protocolChatId: row.protocol_chat_id,
  };
}

/**
 * Get all apps created within the last X hours
 * @param hours Number of hours to look back
 * @returns Array of BuildAppResult objects
 */
async function getAppsCreatedInLastXHours(hours: number): Promise<BuildAppSummary[]> {
  try {
    // Calculate the timestamp for X hours ago
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);

    const { data, error } = await getSupabase()
      .from('apps')
      .select(BUILD_APP_SUMMARY_COLUMNS)
      .eq('deleted', false)
      .gte('created_at', hoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recent apps:', error);
      throw error;
    }

    // Ignore apps that don't have a title or image.
    return data.map(databaseRowToBuildAppSummary).filter((app) => app.title && app.imageDataURL);
  } catch (error) {
    console.error('Failed to get recent apps:', error);
    throw error;
  }
}

const HOUR_RANGES = [1, 2, 3, 6, 12, 24];

export async function getRecentApps(numApps: number): Promise<BuildAppSummary[]> {
  let apps: BuildAppSummary[] = [];
  for (const range of HOUR_RANGES) {
    apps = await getAppsCreatedInLastXHours(range);
    if (apps.length >= numApps) {
      return apps.slice(0, numApps);
    }
  }
  return apps;
}

export async function getAppById(id: string): Promise<BuildAppResult> {
  console.log('GetAppByIdStart', id);

  // In local testing we've seen problems where this query hangs.
  const timeout = setTimeout(() => {
    pingTelemetry('GetAppByIdTimeout', {});
  }, 5000);

  const { data, error } = await getSupabase().from('apps').select('*').eq('id', id).single();

  clearTimeout(timeout);

  console.log('GetAppByIdDone', id);

  if (error) {
    console.error('Error fetching app by id:', error);
    throw error;
  }

  return databaseRowToBuildAppResult(data);
}
