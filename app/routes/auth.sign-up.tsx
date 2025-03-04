import { json, type ActionFunction } from '@remix-run/cloudflare';
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
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      throw error;
    }
    
    return json({ 
      session: data.session,
      user: data.user,
      message: 'Check your email for the confirmation link' 
    });
  } catch (error: any) {
    return json(
      { 
        error: error.message || 'Sign up failed' 
      }, 
      { status: 400 }
    );
  }
}; 