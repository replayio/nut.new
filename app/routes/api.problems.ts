import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { listAllProblems, getProblem, submitProblem, updateProblem } from '~/lib/replay/Problems.server';
import type { BoltProblemInput } from '~/lib/replay/Problems.client';

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
 * PUT /api/problems?id=xyz - Update an existing problem
 */
export async function action({ request }: ActionFunctionArgs) {
  const data = await request.json() as BoltProblemInput;
  
  // Handle update (PUT) requests
  if (request.method === 'PUT') {
    const url = new URL(request.url);
    const problemId = url.searchParams.get('id');
    
    if (!problemId) {
      return json({ error: 'Problem ID is required for updates' }, { status: 400 });
    }
    
    await updateProblem(problemId, data);
    return json({ success: true });
  }
  
  // Handle creation (POST) requests
  if (request.method === 'POST') {
    const problemId = await submitProblem(data);
    if (!problemId) {
      return json({ error: 'Failed to create problem' }, { status: 500 });
    }
    return json({ problemId });
  }
  
  return json({ error: 'Method not allowed' }, { status: 405 });
} 