import { json, redirect, type ActionFunction } from '@remix-run/cloudflare';
import { getSupabaseClient } from '~/lib/supabase/server';

export const action: ActionFunction = async ({ request, context }) => {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  if (!email || !password) {
    return json({ error: 'Email and password are required' }, { status: 400 });
  }
  
  try {
    const supabase = getSupabaseClient(context);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      throw error;
    }
    
    // Return the session data which will be stored by the client
    return json({ session: data.session, user: data.user });
  } catch (error: any) {
    return json(
      { 
        error: error.message || 'Authentication failed'
      }, 
      { status: 401 }
    );
  }
}; 