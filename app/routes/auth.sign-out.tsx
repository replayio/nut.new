import { json, type ActionFunction } from '@remix-run/cloudflare';
import { getSupabaseClient } from '~/lib/supabase/server';

export const action: ActionFunction = async ({ request, context }) => {
  try {
    const supabase = getSupabaseClient(context);
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw error;
    }
    
    return json({ success: true });
  } catch (error: any) {
    return json(
      { 
        error: error.message || 'Sign out failed'
      },
      { status: 500 }
    );
  }
}; 