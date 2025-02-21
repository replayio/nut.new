import { supabase, type Database } from './client';
import { logStore } from '~/lib/stores/logs';

export type Problem = Database['public']['Tables']['problems']['Row'];
export type ProblemComment = Database['public']['Tables']['problem_comments']['Row'];
export type ProblemStatus = Problem['status'];

export async function listAllProblems(): Promise<Problem[]> {
  const { data, error } = await supabase
    .from('problems')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching problems:', error);
    throw error;
  }

  return data;
}

export async function getProblem(id: string): Promise<Problem | null> {
  const { data, error } = await supabase
    .from('problems')
    .select(`
      *,
      problem_comments (
        *
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching problem:', error);
    throw error;
  }

  return data;
}

export async function createProblem(problem: Database['public']['Tables']['problems']['Insert']) {
  logStore.logSystem('Starting database problem creation', {
    title: problem.title,
    description: problem.description,
    status: problem.status
  });
  
  try {
    const { data, error } = await supabase
      .from('problems')
      .insert(problem)
      .select()
      .single();

    if (error) {
      logStore.logError('Database error creating problem', error, {
        title: problem.title,
        errorCode: error.code,
        errorMessage: error.message
      });
      throw error;
    }

    logStore.logSystem('Problem created in database successfully', {
      problemId: data.id,
      title: data.title
    });

    return data;
  } catch (error) {
    logStore.logError('Unexpected error creating problem', error, {
      title: problem.title
    });
    throw error;
  }
}

export async function updateProblem(id: string, updates: Database['public']['Tables']['problems']['Update']) {
  const { data, error } = await supabase
    .from('problems')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating problem:', error);
    throw error;
  }

  return data;
}

export async function addProblemComment(comment: Database['public']['Tables']['problem_comments']['Insert']) {
  const { data, error } = await supabase
    .from('problem_comments')
    .insert(comment)
    .select()
    .single();

  if (error) {
    console.error('Error adding comment:', error);
    throw error;
  }

  return data;
}

function isClient() {
  return typeof window !== 'undefined';
}

// Helper functions for managing user state
export function getProblemsUsername(): string {
  return isClient() ? localStorage.getItem('problems_username') || 'Anonymous' : 'Anonymous';
}

export function setProblemsUsername(username: string) {
  if (isClient()) {
    localStorage.setItem('problems_username', username);
  }
}

export function hasNutAdminKey(): boolean {
  return isClient() ? !!localStorage.getItem('nut_admin_key') : false;
}

export function setNutAdminKey(key: string) {
  if (isClient()) {
    localStorage.setItem('nut_admin_key', key);
  }
}

export function getNutAdminKey(): string | null {
  return isClient() ? localStorage.getItem('nut_admin_key') : null;
} 