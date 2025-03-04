import { useState } from 'react';
import { Form, useActionData, useNavigation } from '@remix-run/react';

interface AuthProps {
  onClose: () => void;
}

export function Auth({ onClose }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Get the data from the action response
  const actionData = useActionData<{ error?: string; session?: any; message?: string }>();
  const navigation = useNavigation();
  const isLoading = navigation.state === 'submitting';

  // Form action determines which server route to use
  const formAction = isSignUp ? '/auth/sign-up' : '/auth/sign-in';

  // Handle success message or redirect
  if (actionData?.message && !actionData?.error) {
    return (
      <div className="p-6 bg-bolt-elements-background-depth-1 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Success</h2>
        <p className="text-center">{actionData.message}</p>
        <button
          onClick={onClose}
          className="w-full mt-4 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-bolt-elements-background-depth-1 rounded-lg shadow-lg max-w-md w-full">
      <h2 className="text-2xl font-bold mb-6 text-center">{isSignUp ? 'Create Account' : 'Sign In'}</h2>

      <Form method="post" action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-bolt-elements-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-bolt-elements-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {actionData?.error && <div className="text-red-500 text-sm">{actionData.error}</div>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400"
        >
          {isLoading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
      </Form>

      <div className="mt-4 text-center">
        <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-500 hover:underline">
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
} 