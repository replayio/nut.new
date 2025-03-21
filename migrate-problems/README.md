# Migrate Problems

This folder contains scripts to migrate problem data from Replay's WebSocket API to a Supabase database.

## Overview

These scripts handle the migration process for problems from Replay to Supabase:

1. `export-problems.ts` - Fetches problems from Replay's API and saves them to JSON files
2. `insert-problems.ts` - Imports problems from JSON files into the Supabase database
3. `analyze-schema.ts` - Analyzes and compares local problem data with the Supabase database schema

## Setup

1. Create a `.env.local` file in this directory with your Supabase credentials:

```
SUPABASE_URL=https://your-project-url.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

2. Install dependencies:

```bash
npm install
# or
bun install
```

## Usage

### Export Problems from Replay

Fetches all problems from Replay's WebSocket API and saves them as JSON files in the `../data` directory:

```bash
bun export-problems.ts
```

To include test problems:

```bash
bun export-problems.ts --include-test
```

### Analyze Schema

Analyzes the structure of the exported problem files and compares with the Supabase database schema:

```bash
bun analyze-schema.ts
```

### Import Problems to Supabase

Imports problems from the `data` directory into Supabase:

```bash
bun insert-problems.ts
```

**Warning**: This script deletes existing problems in the database that don't have "tic tac toe" in their title before importing.

## Problem Data Structure

Problems have the following structure:

```typescript
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
}
```

When imported to Supabase, large fields (repository contents, solutions, prompts) are stored in separate storage buckets.