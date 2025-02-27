// Accessors for the API to access saved problems.

import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import JSZip from 'jszip';
import type { FileArtifact } from '~/utils/folderImport';
import type { ProtocolMessage } from './SimulationPrompt';
import { supabase, type Database } from '~/lib/supabase/client';

export interface BoltProblemComment {
  username?: string;
  content: string;
  timestamp: number;
}

export interface BoltProblemSolution {
  simulationData: any;
  messages: ProtocolMessage[];
  evaluator?: string;
}

export enum BoltProblemStatus {
  // Problem has been submitted but not yet reviewed.
  Pending = 'Pending',

  // Problem has been reviewed and has not been solved yet.
  Unsolved = 'Unsolved',

  // Nut automatically produces a suitable explanation for solving the problem.
  Solved = 'Solved',
}

// Information about each problem stored in the index file.
export interface BoltProblemDescription {
  version: number;
  problemId: string;
  timestamp: number;
  title: string;
  description: string;
  status?: BoltProblemStatus;
  keywords?: string[];
}

export interface BoltProblem extends BoltProblemDescription {
  username?: string;
  repositoryContents: string;
  comments?: BoltProblemComment[];
  solution?: BoltProblemSolution;
}

export type BoltProblemInput = Omit<BoltProblem, 'problemId' | 'timestamp'>;

// Helper functions for mapping between Supabase and Bolt types
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

function mapBoltToSupabaseStatus(status?: BoltProblemStatus): Database['public']['Tables']['problems']['Row']['status'] {
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

function convertSupabaseProblemToBolt(problem: Database['public']['Tables']['problems']['Row']): BoltProblem {
  // Convert comments
  const comments: BoltProblemComment[] = (problem.problem_comments || []).map(comment => ({
    username: comment.username,
    content: comment.content,
    timestamp: new Date(comment.created_at).getTime()
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
    comments
  };
}

function convertBoltProblemDescriptionToSupabase(problem: BoltProblemInput): Database['public']['Tables']['problems']['Insert'] {
  return {
    id: undefined as any, // This will be set by Supabase
    title: problem.title,
    description: problem.description,
    status: mapBoltToSupabaseStatus(problem.status),
    keywords: problem.keywords || [],
    repository_contents: problem.repositoryContents,
    user_id: null
  };
}

export async function listAllProblems(): Promise<BoltProblemDescription[]> {
  try {
    const { data, error } = await supabase
      .from('problems')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }

    return data.map(problem => ({
      version: 1,
      problemId: problem.id,
      timestamp: new Date(problem.created_at).getTime(),
      title: problem.title,
      description: problem.description,
      status: mapSupabaseToBoltStatus(problem.status),
      keywords: problem.keywords
    }));
  } catch (error) {
    console.error('Error fetching problems', error);
    toast.error('Failed to fetch problems');

    return [];
  }
}

export async function getProblem(problemId: string): Promise<BoltProblem | null> {
  try {
    const { data, error } = await supabase
      .from('problems')
      .select(`
        *,
        problem_comments (
          *
        )
      `)
      .eq('id', problemId)
      .single();
    
    if (error) {
      throw error;
    }

    return convertSupabaseProblemToBolt(data);
  } catch (error) {
    console.error('Error fetching problem', error);
    toast.error('Failed to fetch problem');
  }

  return null;
}

export async function submitProblem(problem: BoltProblemInput): Promise<string | null> {
  try {
    const supabaseProblem = convertBoltProblemDescriptionToSupabase(problem);
    
    const { data, error } = await supabase
      .from('problems')
      .insert(supabaseProblem)
      .select()
      .single();
    
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

export async function updateProblem(problemId: string, problem: BoltProblemInput) {
  try {
    if (!getNutIsAdmin()) {
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
      repository_contents: problem.repositoryContents
    };

    // Update the problem
    const { error: updateError } = await supabase
      .from('problems')
      .update(updates)
      .eq('id', problemId);
    
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
      const existingTimestamps = existingComments.map(c => {
        const date = new Date(c.created_at);
        return date.getTime();
      });

      const newComments = comments.filter(c => !existingTimestamps.includes(c.timestamp));

      // Add new comments
      if (newComments.length > 0) {
        const commentInserts = newComments.map(comment => ({
          problem_id: problemId,
          content: comment.content,
          username: comment.username || getProblemsUsername() || 'Anonymous'
        }));

        const { error: commentsError } = await supabase
          .from('problem_comments')
          .insert(commentInserts);
        
        if (commentsError) {
          throw commentsError;
        }
      }
    }
  } catch (error) {
    console.error('Error updating problem', error);
    toast.error('Failed to update problem');
  }
}

const nutLoginKeyCookieName = 'nutLoginKey';
const nutIsAdminCookieName = 'nutIsAdmin';

export function getNutLoginKey(): string | undefined {
  const cookieValue = Cookies.get(nutLoginKeyCookieName);
  return cookieValue?.length ? cookieValue : undefined;
}

export function getNutIsAdmin(): boolean {
  return Cookies.get(nutIsAdminCookieName) === 'true';
}

interface UserInfo {
  username: string;
  loginKey: string;
  details: string;
  admin: boolean;
}

export async function saveNutLoginKey(key: string) {
  // For simplicity, assume any key with admin=true will be an admin
  const userInfo: UserInfo = {
    username: 'admin',
    loginKey: key,
    details: '',
    admin: true
  };

  console.log('UserInfo', userInfo);

  Cookies.set(nutLoginKeyCookieName, key);
  Cookies.set(nutIsAdminCookieName, userInfo.admin ? 'true' : 'false');
}

export function setNutIsAdmin(isAdmin: boolean) {
  Cookies.set(nutIsAdminCookieName, isAdmin ? 'true' : 'false');
}

const nutProblemsUsernameCookieName = 'nutProblemsUsername';

export function getProblemsUsername(): string | undefined {
  const cookieValue = Cookies.get(nutProblemsUsernameCookieName);
  return cookieValue?.length ? cookieValue : undefined;
}

export function saveProblemsUsername(username: string) {
  Cookies.set(nutProblemsUsernameCookieName, username);
}

export async function extractFileArtifactsFromRepositoryContents(repositoryContents: string): Promise<FileArtifact[]> {
  const zip = new JSZip();
  await zip.loadAsync(repositoryContents, { base64: true });

  const fileArtifacts: FileArtifact[] = [];

  for (const [key, object] of Object.entries(zip.files)) {
    if (object.dir) {
      continue;
    }

    fileArtifacts.push({
      content: await object.async('text'),
      path: key,
    });
  }

  return fileArtifacts;
}

export async function submitFeedback(feedback: any) {
  try {
    // Store feedback in supabase if needed
    // For now, just return true
    console.log('Feedback submitted:', feedback);
    
    return true;
  } catch (error) {
    console.error('Error submitting feedback', error);
    toast.error('Failed to submit feedback');

    return false;
  }
}
