import {
  listAllProblems as replayListAllProblems,
  getProblem as replayGetProblem,
  submitProblem as replaySubmitProblem,
  updateProblem as replayUpdateProblem,
} from '~/lib/replay/Problems.server';

import {
  getProblemsUsername as replayGetProblemsUsername,
  saveProblemsUsername as replaySaveProblemsUsername,
  getNutIsAdmin,
  getNutLoginKey,
  saveNutLoginKey,
} from '~/lib/replay/Problems.client';

import {
  BoltProblemStatus,
  type BoltProblem,
  type BoltProblemInput,
  type BoltProblemComment,
} from '~/lib/replay/types';

import type { Database } from './client';

export type Problem = Database['public']['Tables']['problems']['Row'];
export type ProblemComment = Database['public']['Tables']['problem_comments']['Row'];
export type ProblemStatus = Problem['status'];

/**
 * Maps a BoltProblemStatus to a ProblemStatus
 */
export function mapBoltStatusToSupabaseStatus(status: BoltProblemStatus | undefined): ProblemStatus {
  switch (status) {
    case BoltProblemStatus.Pending:
      return 'pending';
    case BoltProblemStatus.Solved:
      return 'solved';
    case BoltProblemStatus.Unsolved:
      return 'unsolved';
    default:
      return 'pending';
  }
}

/**
 * Maps a ProblemStatus to a BoltProblemStatus
 */
export function mapSupabaseStatusToBoltStatus(status: ProblemStatus | undefined): BoltProblemStatus {
  switch (status) {
    case 'pending':
      return BoltProblemStatus.Pending;
    case 'solved':
      return BoltProblemStatus.Solved;
    case 'unsolved':
      return BoltProblemStatus.Unsolved;
    default:
      return BoltProblemStatus.Pending;
  }
}

/**
 * Maps a BoltProblem to a Problem
 */
function mapBoltProblemToProblem(boltProblem: BoltProblem): Problem {
  // Map comments to problem_comments
  const problemComments = (boltProblem.comments || []).map((comment) => ({
    id: String(comment.timestamp), // Use timestamp as id
    created_at: new Date(comment.timestamp).toISOString(),
    problem_id: boltProblem.problemId,
    content: comment.content,
    username: comment.username || 'Anonymous',
  }));

  return {
    id: boltProblem.problemId,
    created_at: new Date(boltProblem.timestamp).toISOString(),
    updated_at: new Date(boltProblem.timestamp).toISOString(),
    title: boltProblem.title,
    description: boltProblem.description,
    status: mapBoltStatusToSupabaseStatus(boltProblem.status),
    keywords: boltProblem.keywords || [],
    repository_contents: boltProblem.repositoryContents,
    user_id: null,
    problem_comments: problemComments,
  };
}

/**
 * Maps a Problem to a BoltProblemInput for updates
 */
function mapProblemUpdatesToBoltProblem(problem: Partial<Problem>): Partial<BoltProblemInput> {
  const boltProblem: Partial<BoltProblemInput> = {};

  if (problem.title !== undefined) {
    boltProblem.title = problem.title;
  }

  if (problem.description !== undefined) {
    boltProblem.description = problem.description;
  }

  if (problem.status !== undefined) {
    boltProblem.status = mapSupabaseStatusToBoltStatus(problem.status);
  }

  if (problem.keywords !== undefined) {
    boltProblem.keywords = problem.keywords;
  }

  if (problem.repository_contents !== undefined) {
    boltProblem.repositoryContents = problem.repository_contents as string;
  }

  return boltProblem;
}

/**
 * Lists all problems
 */
export async function listAllProblems(): Promise<Problem[]> {
  try {
    const boltProblems = await replayListAllProblems();
    return Promise.all(
      boltProblems.map(async (boltProblemDesc) => {
        const fullProblem = await replayGetProblem(boltProblemDesc.problemId);

        if (!fullProblem) {
          // Create a minimal problem if we couldn't get the full details
          return {
            id: boltProblemDesc.problemId,
            created_at: new Date(boltProblemDesc.timestamp).toISOString(),
            updated_at: new Date(boltProblemDesc.timestamp).toISOString(),
            title: boltProblemDesc.title,
            description: boltProblemDesc.description,
            status: mapBoltStatusToSupabaseStatus(boltProblemDesc.status),
            keywords: boltProblemDesc.keywords || [],
            repository_contents: '',
            user_id: null,
            problem_comments: [],
          };
        }

        return mapBoltProblemToProblem(fullProblem);
      }),
    );
  } catch (error) {
    console.error('Error fetching problems:', error);
    throw error;
  }
}

/**
 * Gets a problem by ID
 */
export async function getProblem(id: string): Promise<Problem | null> {
  try {
    const boltProblem = await replayGetProblem(id);

    if (!boltProblem) {
      return null;
    }

    return mapBoltProblemToProblem(boltProblem);
  } catch (error) {
    console.error('Error fetching problem:', error);
    throw error;
  }
}

/**
 * Creates a new problem
 */
export async function createProblem(problem: Database['public']['Tables']['problems']['Insert']): Promise<Problem> {
  try {
    const boltProblemInput: BoltProblemInput = {
      title: problem.title,
      description: problem.description,
      status: mapSupabaseStatusToBoltStatus(problem.status),
      keywords: problem.keywords,
      repositoryContents: problem.repository_contents as string,
      username: getProblemsUsername(),
      version: 1, // Required field
    };

    const problemId = await replaySubmitProblem(boltProblemInput);

    if (!problemId) {
      throw new Error('Failed to create problem');
    }

    // Get the newly created problem
    const newBoltProblem = await replayGetProblem(problemId);

    if (!newBoltProblem) {
      throw new Error('Failed to retrieve created problem');
    }

    return mapBoltProblemToProblem(newBoltProblem);
  } catch (error) {
    console.error('Error creating problem:', error);
    throw error;
  }
}

/**
 * Updates a problem
 */
export async function updateProblem(
  id: string,
  updates: Database['public']['Tables']['problems']['Update'],
): Promise<Problem> {
  try {
    const boltProblemUpdate = mapProblemUpdatesToBoltProblem(updates);

    // Get the current problem to merge with updates
    const currentProblem = await replayGetProblem(id);

    if (!currentProblem) {
      throw new Error('Problem not found');
    }

    // Merge current problem with updates
    const boltProblemInput: BoltProblemInput = {
      ...currentProblem,
      ...boltProblemUpdate,
    };

    await replayUpdateProblem(id, boltProblemInput);

    // Get the updated problem
    const updatedBoltProblem = await replayGetProblem(id);

    if (!updatedBoltProblem) {
      throw new Error('Failed to retrieve updated problem');
    }

    return mapBoltProblemToProblem(updatedBoltProblem);
  } catch (error) {
    console.error('Error updating problem:', error);
    throw error;
  }
}

/**
 * Adds a comment to a problem
 */
export async function addProblemComment(
  comment: Database['public']['Tables']['problem_comments']['Insert'],
): Promise<ProblemComment> {
  try {
    // Get the current problem
    const boltProblem = await replayGetProblem(comment.problem_id);

    if (!boltProblem) {
      throw new Error('Problem not found');
    }

    // Add the new comment
    const newBoltComment: BoltProblemComment = {
      timestamp: Date.now(),
      username: comment.username,
      content: comment.content,
    };

    const boltProblemInput: BoltProblemInput = {
      ...boltProblem,
      comments: [...(boltProblem.comments || []), newBoltComment],
    };

    // Update the problem with the new comment
    await replayUpdateProblem(comment.problem_id, boltProblemInput);

    // Return the new comment in Supabase format
    return {
      id: String(newBoltComment.timestamp),
      created_at: new Date(newBoltComment.timestamp).toISOString(),
      problem_id: comment.problem_id,
      content: newBoltComment.content,
      username: newBoltComment.username || 'Anonymous',
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

// Helper functions for managing user state - reuse the existing implementations

export function getProblemsUsername(): string {
  return replayGetProblemsUsername() || 'Anonymous';
}

export function setProblemsUsername(username: string) {
  replaySaveProblemsUsername(username);
}

export function hasNutAdminKey(): boolean {
  return getNutIsAdmin();
}

export function setNutAdminKey(key: string) {
  saveNutLoginKey(key);
}

export function getNutAdminKey(): string | null {
  return getNutLoginKey() || null;
}
