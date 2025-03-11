// Supabase implementation of problem management functions

import { toast } from 'react-toastify';
import { getSupabase, type Database } from './client';
import type { BoltProblem, BoltProblemDescription, BoltProblemInput, BoltProblemStatus } from '~/lib/replay/Problems';
import { getProblemsUsername, getNutIsAdmin } from '~/lib/replay/Problems';

export async function supabaseListAllProblems(): Promise<BoltProblemDescription[]> {
  try {
    const { data, error } = await getSupabase()
      .from('problems')
      .select('id, created_at, updated_at, title, description, status, keywords, user_id')
      .order('created_at', { ascending: false });

    console.log('ListAllProblemsData', data);

    if (error) {
      throw error;
    }

    const problems: BoltProblemDescription[] = data.map((problem) => ({
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

export async function supabaseGetProblem(problemId: string): Promise<BoltProblem | null> {
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

    // If the problem has a user_id, fetch the profile information
    let username = null;

    if (data.user_id) {
      const { data: profileData, error: profileError } = await getSupabase()
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
      status: data.status as BoltProblemStatus,
      keywords: data.keywords,
      repositoryContents: data.repository_contents,
      username,
      comments: data.problem_comments.map((comment: any) => ({
        id: comment.id,
        createdAt: comment.created_at,
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

export async function supabaseSubmitProblem(problem: BoltProblemInput): Promise<string | null> {
  try {
    const supabaseProblem = {
      id: undefined as any, // This will be set by Supabase
      title: problem.title,
      description: problem.description,
      status: problem.status as BoltProblemStatus,
      keywords: problem.keywords || [],
      repository_contents: problem.repositoryContents,
      user_id: null,
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

export async function supabaseUpdateProblem(problemId: string, problem: BoltProblemInput): Promise<void | undefined> {
  try {
    if (!getNutIsAdmin()) {
      toast.error('Admin user required');
      return undefined;
    }

    // Extract comments to add separately if needed
    const comments = problem.comments || [];
    delete (problem as any).comments;

    // Convert to Supabase format
    const updates: Database['public']['Tables']['problems']['Update'] = {
      title: problem.title,
      description: problem.description,
      status: problem.status,
      keywords: problem.keywords || [],
      repository_contents: problem.repositoryContents,
    };

    // Update the problem
    const { error: updateError } = await getSupabase().from('problems').update(updates).eq('id', problemId);

    if (updateError) {
      throw updateError;
    }

    // Handle comments if they exist
    if (comments.length > 0) {
      /**
       * Create a unique identifier for each comment based on content and timestamp.
       * This allows us to use upsert with onConflict to avoid duplicates.
       */
      const commentInserts = comments.map((comment) => ({
        problem_id: problemId,
        content: comment.content,
        username: comment.username || getProblemsUsername() || 'Anonymous',

        /**
         * Use timestamp as a unique identifier for the comment.
         * This assumes that comments with the same timestamp are the same comment.
         */
        created_at: new Date(comment.timestamp).toISOString(),
      }));

      /**
       * Use upsert with onConflict to avoid duplicates.
       * This will insert new comments and ignore existing ones based on created_at.
       */
      const { error: commentsError } = await getSupabase().from('problem_comments').upsert(commentInserts, {
        onConflict: 'created_at',
        ignoreDuplicates: true,
      });

      if (commentsError) {
        throw commentsError;
      }
    }
  } catch (error) {
    console.error('Error updating problem', error);
    toast.error('Failed to update problem');
  }

  return undefined;
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
