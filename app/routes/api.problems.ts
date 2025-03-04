import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { listAllProblems, getProblem, submitProblem, updateProblem } from '~/lib/replay/Problems.server';
import type { BoltProblemInput } from '~/lib/replay/types';

/**
 * GET /api/problems - List all problems
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  // Check for specific problem ID in query params
  const problemId = url.searchParams.get('id');

  if (problemId) {
    const problem = await getProblem(problemId);

    if (!problem) {
      return json({ error: 'Problem not found' }, { status: 404 });
    }

    return json({ problem });
  }

  // Otherwise, list all problems
  const problems = await listAllProblems();

  return json({ problems });
}

/**
 * POST /api/problems - Create a new problem
 * PUT /api/problems/:id - Update an existing problem
 */
export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const problemId = url.searchParams.get('id');
  const method = request.method.toUpperCase();
  const body = (await request.json()) as BoltProblemInput;

  if (method === 'POST') {
    const id = await submitProblem(body, request);

    if (!id) {
      /*
       * Check if it's due to admin permissions
       * Get the auth cookie to see if the user is logged in at all
       */
      const authCookie = request.headers
        .get('Cookie')
        ?.split(';')
        .find((c) => c.trim().startsWith('nut_login_key='));

      if (authCookie) {
        // User is logged in but not an admin
        return json({ error: 'Admin permissions required' }, { status: 403 });
      }

      // General error
      return json({ error: 'Failed to create problem' }, { status: 500 });
    }

    return json({ id });
  }

  if (method === 'PUT' && problemId) {
    await updateProblem(problemId, body, request);

    return json({ success: true });
  }

  return json({ error: 'Invalid request' }, { status: 400 });
}
