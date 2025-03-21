import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Path to the problem files directory
const problemsDir = join(process.cwd(), '..', 'data');

// Types for problems
interface BoltProblemComment {
  username?: string;
  content: string;
  timestamp: number;
}

interface BoltProblemSolution {
  simulationData: any;
  messages: any[];
  evaluator?: string;
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
  repositoryContents: string;
  comments?: BoltProblemComment[];
  solution?: BoltProblemSolution;
  [key: string]: any; // Allow for additional properties
}

// Database connection details
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Log connection details for debugging
console.log('Supabase URL detected:', SUPABASE_URL ? 'Yes' : 'No');
console.log('Supabase key detected:', SUPABASE_KEY ? 'Yes' : 'No');

type ValueType = 'null' | 'string' | 'number' | 'boolean' | 'object' | string;

function getValueType(value: any): ValueType {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    const itemTypes = new Set(value.map((item) => getValueType(item)));
    return `array<${Array.from(itemTypes).join(' | ')}>`;
  }

  if (typeof value === 'object') {
    return 'object';
  }

  return typeof value;
}

async function getProblemFiles(): Promise<string[]> {
  try {
    const files = await readdir(problemsDir);
    return files.filter((file) => file.startsWith('problem-') && file.endsWith('.json') && !file.includes('summaries'));
  } catch (error) {
    console.error('Error reading problem files directory:', error);
    return [];
  }
}

async function analyzeLocalSchema(problemFiles: string[]): Promise<Map<string, Set<string>>> {
  try {
    // Track all fields and their types
    const fieldTypes = new Map<string, Set<string>>();
    const fieldNullability = new Map<string, boolean>();
    const fieldExamples = new Map<string, string>();
    let hasShownComments = false;

    // Process each problem file
    for (const file of problemFiles) {
      const filePath = join(problemsDir, file);
      const problemData = await readFile(filePath, 'utf8');
      const problem: BoltProblem = JSON.parse(problemData);

      // Special handling for comments
      if (problem.comments && problem.comments.length > 0 && !hasShownComments) {
        console.log('\nComments Analysis:');
        console.log('Example comment structure:');
        console.log(JSON.stringify(problem.comments[0], null, 2));

        console.log('\nComment fields:');

        if (problem.comments[0]) {
          Object.entries(problem.comments[0]).forEach(([key, value]) => {
            console.log(`${key}: ${typeof value} = ${JSON.stringify(value)}`);
          });
        }

        hasShownComments = true;
      }

      // Special handling for timestamp
      if (problem.timestamp) {
        const date = new Date(problem.timestamp);

        if (!fieldExamples.has('timestamp')) {
          console.log('\nTimestamp Analysis:');
          console.log('Raw value:', problem.timestamp);
          console.log('As date:', date.toISOString());
          console.log('Type:', typeof problem.timestamp);
        }
      }

      // Collect all keys and their types
      for (const [key, value] of Object.entries(problem)) {
        const valueType = getValueType(value);

        // Track types
        if (!fieldTypes.has(key)) {
          fieldTypes.set(key, new Set());
        }

        fieldTypes.get(key)?.add(valueType);

        // Track nullability
        if (!fieldNullability.has(key)) {
          fieldNullability.set(key, true); // assume nullable until proven otherwise
        }

        if (value !== null && value !== undefined) {
          fieldNullability.set(key, false);
        }

        // Track example values (non-null)
        if (value !== null && value !== undefined && !fieldExamples.has(key)) {
          fieldExamples.set(key, JSON.stringify(value).slice(0, 50) + (JSON.stringify(value).length > 50 ? '...' : ''));
        }
      }
    }

    // Generate schema report
    console.log('\nLocal Problem Files Schema Analysis:\n');
    console.log('Field Name | Types | Nullable | Example Value');
    console.log('-'.repeat(80));

    for (const [field, types] of fieldTypes) {
      const typeStr = Array.from(types).join(' | ');
      const nullable = fieldNullability.get(field) ? 'YES' : 'NO';
      const example = fieldExamples.get(field) || 'N/A';

      console.log(`${field.padEnd(20)} | ${typeStr.padEnd(20)} | ${nullable.padEnd(8)} | ${example}`);
    }

    return fieldTypes;
  } catch (error) {
    console.error('Error analyzing local schema:', error);
    return new Map();
  }
}

export async function analyzeDatabaseSchema(): Promise<void> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log('Supabase URL or key not found in environment variables');
      return;
    }

    console.log('\nFetching database schema for problems table...\n');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use direct SQL query to get the schema information
    const { data: columnsData, error: columnsError } = await supabase
      .from('pg_catalog.information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'problems')
      .eq('table_schema', 'public');

    if (columnsError) {
      console.log(`Error in database schema fetch: ${columnsError.message}`);
      return;
    }

    if (!columnsData || columnsData.length === 0) {
      console.log('No schema information found for the problems table');
      return;
    }

    console.log('\nDatabase Problems Table Schema:\n');
    console.log('Column Name | Data Type | Nullable | Default Value');
    console.log('--------------------------------------------------------------------------------');

    columnsData.forEach((column: any) => {
      console.log(
        `${column.column_name.padEnd(20)} | ${column.data_type.padEnd(20)} | ${column.is_nullable === 'YES' ? 'YES' : 'NO'.padEnd(8)} | ${column.column_default || ''}`,
      );
    });

    // Get a sample row to show example values
    const { data: sampleData, error: sampleError } = await supabase.from('problems').select('*').limit(1);

    if (!sampleError && sampleData && sampleData.length > 0) {
      console.log('\nExample values from first row:');
      const sampleRow = sampleData[0];

      Object.entries(sampleRow).forEach(([key, value]) => {
        const displayValue =
          typeof value === 'object'
            ? JSON.stringify(value).substring(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '')
            : String(value).substring(0, 50) + (String(value).length > 50 ? '...' : '');

        console.log(`${key.padEnd(20)}: ${displayValue}`);
      });
    }

    // Check if problem_comments table exists
    console.log('\nChecking for problem_comments table...');

    const { data: commentsTableData, error: commentsTableError } = await supabase
      .from('pg_catalog.information_schema.tables')
      .select('table_name')
      .eq('table_name', 'problem_comments')
      .eq('table_schema', 'public');

    if (commentsTableError) {
      console.log(`Error checking for problem_comments table: ${commentsTableError.message}`);
      return;
    }

    if (commentsTableData && commentsTableData.length > 0) {
      console.log('problem_comments table found, fetching schema...');

      const { data: commentColumnsData, error: commentColumnsError } = await supabase
        .from('pg_catalog.information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', 'problem_comments')
        .eq('table_schema', 'public');

      if (commentColumnsError) {
        console.log(`Error in problem_comments schema fetch: ${commentColumnsError.message}`);
        return;
      }

      console.log('\nDatabase Problem Comments Table Schema:\n');
      console.log('Column Name | Data Type | Nullable | Default Value');
      console.log('--------------------------------------------------------------------------------');

      commentColumnsData.forEach((column: any) => {
        console.log(
          `${column.column_name.padEnd(20)} | ${column.data_type.padEnd(20)} | ${column.is_nullable === 'YES' ? 'YES' : 'NO'.padEnd(8)} | ${column.column_default || ''}`,
        );
      });

      // Check for foreign key relationship
      const { data: fkData, error: fkError } = await supabase
        .from('pg_catalog.information_schema.key_column_usage')
        .select('column_name, constraint_name')
        .eq('table_name', 'problem_comments')
        .eq('table_schema', 'public');

      if (!fkError && fkData && fkData.length > 0) {
        console.log('\nForeign key relationships:');
        fkData.forEach((fk: any) => {
          console.log(`${fk.column_name} -> ${fk.constraint_name}`);
        });
      }
    } else {
      console.log('problem_comments table not found in the database');
    }
  } catch (error) {
    console.log('Error in database analysis:', error);
  }
}

async function main(): Promise<void> {
  try {
    // First analyze local problem files
    console.log(`Looking for problem files in: ${problemsDir}`);

    const problemFiles = await getProblemFiles();
    console.log(`Found ${problemFiles.length} problem files to analyze.`);
    console.log();

    // Analyze local schema, but we're not using it for comparison
    await analyzeLocalSchema(problemFiles);

    // Then analyze database
    await analyzeDatabaseSchema();

    console.log("\nNote: Schema comparison skipped as we're directly logging database schema information.");
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the analysis
main();
