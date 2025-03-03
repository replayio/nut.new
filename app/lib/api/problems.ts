import { handleClientError } from '~/lib/replay/Problems.client';
import type { 
  BoltProblemDescription, 
  BoltProblem, 
  BoltProblemInput 
} from '~/lib/replay/Problems.client';

/**
 * Fetch all problems from the API
 */
export async function listAllProblems(): Promise<BoltProblemDescription[]> {
  try {
    const response = await fetch('/api/problems');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return data.problems;
  } catch (error) {
    handleClientError('fetch problems', error);
    return [];
  }
}

/**
 * Fetch a specific problem by ID
 */
export async function getProblem(problemId: string): Promise<BoltProblem | null> {
  try {
    const response = await fetch(`/api/problems?id=${encodeURIComponent(problemId)}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return data.problem;
  } catch (error) {
    handleClientError('fetch problem', error);
    return null;
  }
}

/**
 * Submit a new problem
 */
export async function submitProblem(problem: BoltProblemInput): Promise<string | null> {
  try {
    const response = await fetch('/api/problems', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(problem),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    return data.problemId;
  } catch (error) {
    handleClientError('submit problem', error);
    return null;
  }
}

/**
 * Update an existing problem
 */
export async function updateProblem(problemId: string, problem: BoltProblemInput): Promise<boolean> {
  try {
    const response = await fetch(`/api/problems?id=${encodeURIComponent(problemId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(problem),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return true;
  } catch (error) {
    handleClientError('update problem', error);
    return false;
  }
}

/**
 * Submit feedback
 */
export async function submitFeedback(feedback: any): Promise<boolean> {
  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedback),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return true;
  } catch (error) {
    handleClientError('submit feedback', error);
    return false;
  }
} 