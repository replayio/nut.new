import { json } from '~/lib/remix-types';
import type { ActionFunction, LoaderFunction } from '~/lib/remix-types';
import { generateIntercomJWT } from '~/lib/intercom';

export const loader: LoaderFunction = async ({ request }) => {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  // Get user information from query parameters or headers
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  const email = url.searchParams.get('email');
  const name = url.searchParams.get('name');

  if (!userId) {
    return json({ error: 'user_id is required' }, { status: 400 });
  }

  if (!process.env.INTERCOM_APP_SECRET) {
    console.error('Intercom app secret is not configured');
    return json({ error: 'Intercom configuration missing' }, { status: 500 });
  }

  try {
    const jwtResponse = await generateIntercomJWT(
      {
        user_id: userId,
        email: email || undefined,
        name: name || undefined,
      },
      process.env.INTERCOM_APP_SECRET!, // Still required for validation
      process.env.INTERCOM_APP_ID!,
      process.env.INTERCOM_SIGNING_KEY!,
      1, // 1 hour expiration
    );

    return json(jwtResponse);
  } catch (error) {
    console.error('Failed to generate Intercom JWT:', error);
    return json({ error: 'Failed to generate JWT' }, { status: 500 });
  }
};

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { user_id, email, name } = body;

    if (!user_id) {
      return json({ error: 'user_id is required' }, { status: 400 });
    }

    if (!process.env.INTERCOM_APP_SECRET) {
      console.error('Intercom app secret is not configured');
      return json({ error: 'Intercom configuration missing' }, { status: 500 });
    }

    const jwtResponse = await generateIntercomJWT(
      {
        user_id,
        email: email || undefined,
        name: name || undefined,
      },
      process.env.INTERCOM_APP_SECRET!,
      process.env.INTERCOM_APP_ID!,
      process.env.INTERCOM_SIGNING_KEY!,
      1, // 1 hour expiration
    );

    return json(jwtResponse);
  } catch (error) {
    console.error('Failed to generate Intercom JWT:', error);
    return json({ error: 'Failed to generate JWT' }, { status: 500 });
  }
};
