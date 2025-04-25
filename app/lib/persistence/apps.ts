// Functions for accessing the apps table in the database

import { getSupabase } from '~/lib/supabase/client';

export interface ChatMessage {
  role: string;
  content: string;
}

export enum BuildAppOutcome {
  Success = 'success',
  Error = 'error',
}

export interface BuildAppResult {
  title: string | undefined;
  elapsedMinutes: number;
  totalPeanuts: number;
  imageDataURL: string | undefined;
  messages: ChatMessage[];
  protocolChatId: string;
  outcome: BuildAppOutcome;
  appId: string;
}

function databaseRowToBuildAppResult(row: any): BuildAppResult {
  // Determine the outcome based on the result field
  let outcome = BuildAppOutcome.Error;
  if (row.result === 'success') {
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
export async function getRecentApps(hours: number): Promise<BuildAppResult[]> {
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

    return data.map(databaseRowToBuildAppResult);
  } catch (error) {
    console.error('Failed to get recent apps:', error);
    throw error;
  }
}