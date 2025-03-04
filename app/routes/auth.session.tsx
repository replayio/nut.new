import { json, type LoaderFunction } from '@remix-run/cloudflare';
import { getSupabaseClient } from '~/lib/supabase/server';

export const loader: LoaderFunction = async ({ request, context }) => {
  try {
    const supabase = getSupabaseClient(context);
    
    // Extract auth token from the request header if present
    const authHeader = request.headers.get('Authorization');
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // If token is present, we can use it to get the session
    if (token) {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      return json({ session: data.session, user: data.session?.user || null });
    }
    
    return json({ session: null, user: null });
  } catch (error: any) {
    return json(
      { 
        error: error.message || 'Failed to get session',
        session: null,
        user: null
      },
      { status: 401 }
    );
  }
}; 