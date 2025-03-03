// Server-side functionality for Problems - contains all Supabase operations

import { toast } from 'react-toastify';
import { supabase, type Database } from '~/lib/supabase/client';
import {
  BoltProblemStatus,
  type BoltProblem,
  type BoltProblemDescription,
  type BoltProblemInput,
  type BoltProblemComment,
} from './types';
import { getProblemsUsername, handleClientError } from './Problems.client';

interface UserInfo {
  admin: boolean;
}

// Server-side admin check that doesn't rely on browser cookies
async function checkIsAdmin(request: Request): Promise<boolean> {
  // Get the auth cookie from the request headers
  const authCookie = request.headers
    .get('Cookie')
    ?.split(';')
    .find((c) => c.trim().startsWith('nut_login_key='));

  if (!authCookie) {
    return false;
  }

  const key = authCookie.split('=')[1];

  try {
    const response = await fetch(`/api/auth?key=${encodeURIComponent(key)}`);

    if (!response.ok) {
      return false;
    }

    const userInfo = (await response.json()) as UserInfo;

    return userInfo.admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/* ========================== Status Mapping Functions ========================== */

function mapSupabaseToBoltStatus(status: Database['public']['Tables']['problems']['Row']['status']): BoltProblemStatus {
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

function mapBoltToSupabaseStatus(
  status?: BoltProblemStatus,
): Database['public']['Tables']['problems']['Row']['status'] {
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

/* ========================== Conversion Functions ========================== */

function convertSupabaseProblemToBolt(problem: Database['public']['Tables']['problems']['Row']): BoltProblem {
  // Convert comments
  const comments: BoltProblemComment[] = (problem.problem_comments || []).map((comment) => ({
    username: comment.username,
    content: comment.content,
    timestamp: new Date(comment.created_at).getTime(),
  }));

  return {
    version: 1,
    problemId: problem.id,
    timestamp: new Date(problem.created_at).getTime(),
    title: problem.title,
    description: problem.description,
    status: mapSupabaseToBoltStatus(problem.status),
    keywords: problem.keywords,
    repositoryContents: problem.repository_contents as string,
    comments,
  };
}

function convertBoltProblemDescriptionToSupabase(
  problem: BoltProblemInput,
): Database['public']['Tables']['problems']['Insert'] {
  return {
    id: undefined as any, // This will be set by Supabase
    title: problem.title,
    description: problem.description,
    status: mapBoltToSupabaseStatus(problem.status),
    keywords: problem.keywords || [],
    repository_contents: problem.repositoryContents,
    user_id: null,
  };
}

/* ========================== Database Operations ========================== */

export async function listAllProblems(): Promise<BoltProblemDescription[]> {
  try {
    const { data, error } = await supabase.from('problems').select('*').order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data.map((problem) => ({
      version: 1,
      problemId: problem.id,
      timestamp: new Date(problem.created_at).getTime(),
      title: problem.title,
      description: problem.description,
      status: mapSupabaseToBoltStatus(problem.status),
      keywords: problem.keywords,
    }));
  } catch (error) {
    handleClientError('fetch problems', error);
    return [];
  }
}

export async function getProblem(problemId: string): Promise<BoltProblem | null> {
  try {
    const { data, error } = await supabase
      .from('problems')
      .select(
        `
        *,
        problem_comments (
          *
        )
      `,
      )
      .eq('id', problemId)
      .single();

    if (error) {
      throw error;
    }

    return convertSupabaseProblemToBolt(data);
  } catch (error) {
    handleClientError('fetch problem', error);
    return null;
  }
}

export async function submitProblem(problem: BoltProblemInput, request: Request): Promise<string | null> {
  try {
    if (!(await checkIsAdmin(request))) {
      toast.error('Admin user required');
      return null;
    }

    const supabaseProblem = convertBoltProblemDescriptionToSupabase(problem);

    const { data, error } = await supabase.from('problems').insert(supabaseProblem).select().single();

    if (error) {
      throw error;
    }

    return data.id;
  } catch (error) {
    handleClientError('submit problem', error);
    return null;
  }
}

export async function updateProblem(problemId: string, problem: BoltProblemInput, request: Request): Promise<void> {
  try {
    if (!(await checkIsAdmin(request))) {
      toast.error('Admin user required');
      return;
    }

    // Extract comments to add separately if needed
    const comments = problem.comments || [];
    delete (problem as any).comments;

    // Convert to Supabase format
    const updates: Database['public']['Tables']['problems']['Update'] = {
      title: problem.title,
      description: problem.description,
      status: mapBoltToSupabaseStatus(problem.status),
      keywords: problem.keywords || [],
      repository_contents: problem.repositoryContents,
    };

    // Update the problem
    const { error: updateError } = await supabase.from('problems').update(updates).eq('id', problemId);

    if (updateError) {
      throw updateError;
    }

    // Handle comments if they exist
    if (comments.length > 0) {
      // Get existing comments to avoid duplicates
      const { data: existingComments, error: commentsFetchError } = await supabase
        .from('problem_comments')
        .select('*')
        .eq('problem_id', problemId);

      if (commentsFetchError) {
        throw commentsFetchError;
      }

      // Filter out comments that already exist (based on timestamp)
      const existingTimestamps = existingComments.map((c) => {
        const date = new Date(c.created_at);
        return date.getTime();
      });

      const newComments = comments.filter((c) => !existingTimestamps.includes(c.timestamp));

      // Add new comments
      if (newComments.length > 0) {
        const commentInserts = newComments.map((comment) => ({
          problem_id: problemId,
          content: comment.content,
          username: comment.username || getProblemsUsername() || 'Anonymous',
        }));

        const { error: commentsError } = await supabase.from('problem_comments').insert(commentInserts);

        if (commentsError) {
          throw commentsError;
        }
      }
    }
  } catch (error) {
    handleClientError('update problem', error);
  }
}

export async function submitFeedback(feedback: any, request: Request): Promise<boolean> {
  try {
    if (!(await checkIsAdmin(request))) {
      toast.error('Admin user required');
      return false;
    }

    const { error } = await supabase.from('feedback').insert({
      content: feedback,
      username: getProblemsUsername() || 'Anonymous',
    });

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    handleClientError('submit feedback', error);
    return false;
  }
}
