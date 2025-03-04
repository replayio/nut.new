import { json, redirect, type ActionFunction } from '@remix-run/cloudflare';
import { getSupabaseClient } from '~/lib/supabase/server';

export const action: ActionFunction = async ({ request, context }) => {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  

  console.log('Sign In Email', email);
  console.log('Sign In Password', password); 

  if (!email || !password) {
    return json({ error: 'Email and password are required' }, { status: 400 });
  }
  
  try {
    const supabase = getSupabaseClient(context);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    

    console.log('Sign In Data', data);
    console.log('Sign In Error', error);

    if (error) {
      throw error;
    }
    
    // Redirect to the home page after successful sign in
    return redirect('/', {
      headers: {
        'Set-Cookie': `session=${data.session?.access_token}; Path=/; HttpOnly; SameSite=Lax`
      }
    });
  } catch (error: any) {
    return json(
      { 
        error: error.message || 'Authentication failed'
      }, 
      { status: 401 }
    );
  }
};

// Add a component for direct access to this route
export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bolt-elements-background-depth-0">
      <div className="p-6 bg-bolt-elements-background-depth-1 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Authentication API</h2>
        <p className="text-center">This is an API endpoint and not meant to be accessed directly.</p>
        <p className="text-center mt-4">
          <a href="/login" className="text-blue-500 hover:underline">Go to login page</a>
        </p>
      </div>
    </div>
  );
} 