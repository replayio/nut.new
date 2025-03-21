import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Define types based on the existing schema in analyze-schema.ts
interface BoltProblemSolution {
  simulationData?: any;
  messages?: any[];
  evaluator?: string;
  [key: string]: any;
}

interface BoltProblem {
  version: number;
  problemId: string;
  timestamp: number;
  title: string;
  description: string;
  status?: string;
  keywords?: string[];
  username?: string;
  user_id?: string;
  repositoryContents?: string;
  solution?: BoltProblemSolution;
  prompt?: any;
  [key: string]: any;
}

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

async function deleteExistingProblems(): Promise<void> {
  try {
    console.log('Deleting all problems that don\'t have "tic tac toe" in their title...');

    // First, query to get all problem IDs that don't match the criteria
    const { data: problemsToDelete, error: fetchError } = await supabase
      .from('problems')
      .select('id, title')
      .not('title', 'ilike', '%tic tac toe%');

    if (fetchError) {
      console.error('Error fetching problems to delete:', fetchError.message);
      throw fetchError;
    }

    if (!problemsToDelete || problemsToDelete.length === 0) {
      console.log('No problems to delete.');
      return;
    }

    console.log(`Found ${problemsToDelete.length} problems to delete.`);

    // Delete the problems
    const { error: deleteError } = await supabase.from('problems').delete().not('title', 'ilike', '%tic tac toe%');

    if (deleteError) {
      console.error('Error deleting problems:', deleteError.message);
      throw deleteError;
    }

    console.log(`Successfully deleted ${problemsToDelete.length} problems.`);
  } catch (error) {
    console.error('Error in deleteNonTicTacToeProblems:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function importProblems(): Promise<void> {
  try {
    // First delete all problems that don't have "tic tac toe" in their title
    await deleteExistingProblems();

    // Get all problem files
    const dataDir = path.join(process.cwd(), 'data');
    const files = await fs.readdir(dataDir);
    const problemFiles = files.filter((file) => file.startsWith('problem-') && file.endsWith('.json'));

    console.log(`Found ${problemFiles.length} problem files to import`);
    console.log('Starting import...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const file of problemFiles) {
      try {
        await processProblemFile(file, dataDir);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    console.log('\nImport Summary:');
    console.log(`Total files: ${problemFiles.length}`);
    console.log(`Successfully imported: ${successCount}`);
    console.log(`Failed to import: ${errorCount}`);
  } catch (error) {
    console.error('Import failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function uploadBlob(bucket: string, path: string, contents: string) {
  const { error } = await supabase.storage.from(bucket).upload(path, contents);

  if (error && error.error !== 'Duplicate') {
    console.error(`  ❌ Error uploading ${path}:`, error.message, error);
    throw error;
  } else {
    console.log(`  ✅ Successfully uploaded ${path} to ${bucket}`);
  }
}

async function processProblemFile(file: string, dataDir: string) {
  try {
    if (file.includes('problem-summaries')) {
      return;
    }

    console.log(`Processing ${file}`);

    const filePath = path.join(dataDir, file);
    const content = await fs.readFile(filePath, 'utf8');
    const problem: BoltProblem = JSON.parse(content);

    // Convert Unix timestamp to ISO string
    const createdAt = new Date(problem.timestamp).toISOString();

    // Extract keywords from the problem data if they exist
    const keywords = Array.isArray(problem.keywords) ? problem.keywords : [];

    // Extract solution and prompt, defaulting to empty objects if not present
    const solution = problem.solution || {};
    const prompt = problem.prompt || {};

    // Validate repository_contents
    let repositoryContents = '';

    try {
      repositoryContents = problem.repositoryContents || '';

      if (repositoryContents && typeof repositoryContents !== 'string') {
        console.warn(`Warning: Invalid repository_contents in ${file}, converting to string`);
        repositoryContents = JSON.stringify(repositoryContents);
      }
    } catch (err) {
      console.warn(
        `Warning: Error processing repository_contents in ${file}:`,
        err instanceof Error ? err.message : String(err),
      );
      repositoryContents = '';
    }

    const repositoryContentsPath = `problem/${problem.problemId}.txt`;
    await uploadBlob('repository-contents', repositoryContentsPath, repositoryContents);

    const solutionPath = `problem/${problem.problemId}.json`;
    await uploadBlob('solutions', solutionPath, JSON.stringify(solution));

    const promptPath = `problem/${problem.problemId}.json`;
    await uploadBlob('prompts', promptPath, JSON.stringify(prompt));

    // Insert into database
    const { error } = await supabase
      .from('problems')
      .upsert({
        user_id: `97cde220-c22b-4eb5-849d-6946fb07ebc4`,
        id: problem.problemId,
        created_at: createdAt,
        updated_at: createdAt,
        title: problem.title,
        description: problem.description,
        status: problem.status || 'pending',
        keywords,
        repository_contents_path: repositoryContentsPath,
        solution_path: solutionPath,
        prompt_path: promptPath,
        version: problem.version,
        repository_contents: null,
        solution: '',
        prompt: '',
      })
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Error updating problem:`, error.message);
      throw error;
    } else {
      console.log(`  ✅ Successfully updated problem`);
      return;
    }
  } catch (error) {
    console.error(`  ❌ Error processing ${file}: ${(error as any).message}`);

    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }

    throw error;
  }
}
importProblems();
