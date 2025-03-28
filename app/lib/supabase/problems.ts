// Supabase implementation of problem management functions

import { toast } from 'react-toastify';
import { getSupabase, type Database } from './client';
import type { NutProblem, NutProblemDescription, NutProblemInput, NutProblemStatus } from '~/lib/replay/Problems';
import { getNutIsAdmin } from '~/lib/replay/Problems';

async function downloadBlob(bucket: string, path: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) {
    console.error('Error downloading blob:', error);
    return null;
  }

  return data.text();
}

export async function supabaseListAllProblems(): Promise<NutProblemDescription[]> {
  try {
    const { data, error } = await getSupabase()
      .from('problems')
      .select('id, created_at, updated_at, title, description, status, keywords, user_id')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const problems: NutProblemDescription[] = data.map((problem) => ({
      version: 1,
      problemId: problem.id,
      timestamp: new Date(problem.created_at).getTime(),
      title: problem.title,
      description: problem.description,
      status: problem.status,
      keywords: problem.keywords,
    }));

    return problems;
  } catch (error) {
    console.error('Error fetching problems', error);
    toast.error('Failed to fetch problems');

    return [];
  }
}

export async function supabaseGetProblem(problemId: string): Promise<NutProblem | null> {
  try {
    if (!problemId) {
      toast.error('Invalid problem ID');
      return null;
    }

    const { data, error } = await getSupabase()
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
      // More specific error message based on error code
      if (error.code === 'PGRST116') {
        toast.error('Problem not found');
      } else {
        toast.error(`Failed to fetch problem: ${error.message}`);
      }

      throw error;
    }

    if (!data) {
      toast.error('Problem not found');
      return null;
    }

    // Fetch blob data from storage if paths are available
    let solution = data.solution;
    const prompt = data.prompt;

    // Create a supabase instance for storage operations
    const supabase = getSupabase();

    if (data.solution_path) {
      solution = JSON.parse((await downloadBlob('solutions', data.solution_path)) || '{}');
    }

    // If the problem has a user_id, fetch the profile information
    let username = null;

    if (data.user_id) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', data.user_id)
        .single();

      if (!profileError && profileData) {
        username = profileData.username;
      }
    }

    return {
      problemId: data.id,
      version: 1,
      timestamp: new Date(data.created_at).getTime(),
      title: data.title,
      description: data.description,
      status: data.status as NutProblemStatus,
      keywords: data.keywords,
      repositoryId: data.repository_id,
      username,
      solution: solution || prompt,
      comments: data.problem_comments.map((comment: any) => ({
        id: comment.id,
        timestamp: comment.created_at,
        problemId: comment.problem_id,
        content: comment.content,
        username: comment.username,
      })),
    };
  } catch (error) {
    console.error('Error fetching problem:', error);

    // Don't show duplicate toast if we already showed one above
    if (!(error as any)?.code) {
      toast.error('Failed to fetch problem');
    }
  }

  return null;
}

export async function supabaseSubmitProblem(problem: NutProblemInput): Promise<string | null> {
  try {
    const supabaseProblem = {
      id: undefined as any, // This will be set by Supabase
      title: problem.title,
      description: problem.description,
      status: problem.status as NutProblemStatus,
      keywords: problem.keywords || [],
      repository_id: problem.repositoryId,
      user_id: problem.user_id,
    };

    const { data, error } = await getSupabase().from('problems').insert(supabaseProblem).select().single();

    if (error) {
      throw error;
    }

    return data.id;
  } catch (error) {
    console.error('Error submitting problem', error);
    toast.error('Failed to submit problem');

    return null;
  }
}

export async function supabaseDeleteProblem(problemId: string): Promise<void | undefined> {
  try {
    const { error: deleteError } = await getSupabase().from('problems').delete().eq('id', problemId);

    if (deleteError) {
      throw deleteError;
    }

    return undefined;
  } catch (error) {
    console.error('Error deleting problem', error);

    return undefined;
  }
}

export async function supabaseUpdateProblem(problemId: string, problem: NutProblemInput): Promise<void> {
  try {
    if (!getNutIsAdmin()) {
      toast.error('Admin user required');
      return undefined;
    }

    // Convert to Supabase format
    const updates: Database['public']['Tables']['problems']['Update'] = {
      title: problem.title,
      description: problem.description,
      status: problem.status,
      keywords: problem.keywords || [],
      repository_id: problem.repositoryId,
      solution_path: problem.solution ? `solutions/${problemId}.json` : undefined,
    };

    // Update the problem
    const { error: updateError } = await getSupabase().from('problems').update(updates).eq('id', problemId);

    if (updateError) {
      throw updateError;
    }

    if (updates.solution_path) {
      const { error: solutionError } = await getSupabase()
        .storage.from('solutions')
        .upload(updates.solution_path, JSON.stringify(problem.solution), { upsert: true });

      if (solutionError) {
        throw solutionError;
      }
    }

    // Handle comments if they exist
    if (problem.comments && problem.comments.length > 0) {
      const commentInserts = problem.comments
        .filter((comment) => !comment.id)
        .map((comment) => {
          return {
            problem_id: problemId,
            content: comment.content,
            username: comment.username || 'Anonymous',
          };
        });

      /**
       * Use upsert with onConflict to avoid duplicates.
       * This will insert new comments and ignore existing ones based on created_at.
       */
      const { error: commentsError } = await getSupabase().from('problem_comments').insert(commentInserts);

      if (commentsError) {
        throw commentsError;
      }
    }

    return undefined;
  } catch (error) {
    console.error('Error updating problem', error);
    toast.error('Failed to update problem');

    return undefined;
  }
}

export async function supabaseSubmitFeedback(feedback: any) {
  const supabase = getSupabase();

  // Get the current user ID if available
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id || null;

  // Insert feedback into the feedback table
  const { data, error } = await supabase.from('feedback').insert({
    user_id: userId,
    description: feedback.description || feedback.text || JSON.stringify(feedback),
    metadata: feedback,
  });

  if (error) {
    console.error('Error submitting feedback to Supabase:', error);
    toast.error('Failed to submit feedback');

    return false;
  }

  console.log('Feedback submitted successfully:', data);

  return true;
}
