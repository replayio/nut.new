import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { submitFeedback } from '~/lib/replay/Problems.server';

/**
 * POST /api/feedback - Submit feedback
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const data = await request.json();
    const success = await submitFeedback(data);

    if (!success) {
      return json({ error: 'Failed to submit feedback' }, { status: 500 });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
} 