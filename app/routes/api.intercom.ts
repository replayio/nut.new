import { json } from '~/lib/remix-types';
import type { ActionFunction } from '~/lib/remix-types';

export const action: ActionFunction = async ({ request }: { request: Request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  if (!process.env.INTERCOM_ACCESS_TOKEN) {
    console.error('Intercom access token is not configured');
    return json({ error: 'Intercom configuration missing' }, { status: 500 });
  }

  let email;
  try {
    const body = await request.json();
    email = body.email;
    if (!email) {
      return json({ error: 'Email is required' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    console.log(
      'Attempting to create Intercom contact with token:',
      process.env.INTERCOM_ACCESS_TOKEN?.slice(0, 5) + '...',
    );

    const response = await fetch('https://api.intercom.io/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Intercom-Version': '2.10',
        Authorization: `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        signed_up_at: Math.floor(Date.now() / 1000),
        created_at: Math.floor(Date.now() / 1000),
        last_seen_at: Math.floor(Date.now() / 1000),
      }),
    });

    const responseData = await response.json();

    console.log('Contact creation timestamps:', {
      current_time: new Date().toISOString(),
      unix_timestamp: Math.floor(Date.now() / 1000),
      response_data: responseData,
    });

    if (!response.ok) {
      console.error('Intercom API error:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      });
      return json(
        {
          error: 'Failed to create contact',
          details: responseData,
        },
        { status: response.status },
      );
    }

    return json({ success: true, data: responseData });
  } catch (error) {
    console.error('Failed to contact Intercom API:', error);
    return json({ error: 'Failed to contact Intercom API' }, { status: 500 });
  }
};
