// Script to fetch all problems and save them to a JSON file
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { WebSocket } from 'ws';

// Augment ImportMeta type for Bun
declare global {
  interface ImportMeta {
    dir: string;
  }
}

// Types from Problems.ts
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

enum BoltProblemStatus {
  Pending = 'Pending',
  Unsolved = 'Unsolved',
  Solved = 'Solved',
}

interface BoltProblemDescription {
  version: number;
  problemId: string;
  timestamp: number;
  title: string;
  description: string;
  status?: BoltProblemStatus;
  keywords?: string[];
}

interface BoltProblem extends BoltProblemDescription {
  username?: string;
  user_id?: string;
  repositoryContents: string;
  comments?: BoltProblemComment[];
  solution?: BoltProblemSolution;
}

// URL of the Replay WebSocket server
const replayWsServer = 'wss://dispatch.replay.io';

// Helper functions from ReplayProtocolClient.ts
function assert(condition: any, message: string = 'Assertion failed!'): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return { promise, resolve, reject };
}

type EventListener = (params: any) => void;

// ProtocolClient adapted for Bun/Node.js
class ProtocolClient {
  openDeferred = createDeferred<void>();
  eventListeners = new Map<string, Set<EventListener>>();
  nextMessageId = 1;
  pendingCommands = new Map<number, { method: string; deferred: Deferred<any> }>();
  socket: WebSocket;

  constructor() {
    console.log(`Creating WebSocket for ${replayWsServer}`);
    this.socket = new WebSocket(replayWsServer);
    this.socket.on('close', () => this.onSocketClose());
    this.socket.on('error', (error) => this.onSocketError(error));
    this.socket.on('open', () => this.onSocketOpen());
    this.socket.on('message', (data) => this.onSocketMessage(data));
    this.listenForMessage('Recording.sessionError', (error) => {
      console.log(`Session error ${error}`);
    });
  }

  initialize() {
    return this.openDeferred.promise;
  }

  close() {
    this.socket.close();
    for (const info of this.pendingCommands.values()) {
      info.deferred.reject(new Error('Client destroyed'));
    }
    this.pendingCommands.clear();
  }

  listenForMessage(method: string, callback: EventListener) {
    let listeners = this.eventListeners.get(method);
    if (listeners == null) {
      listeners = new Set([callback]);
      this.eventListeners.set(method, listeners);
    } else {
      listeners.add(callback);
    }
    return () => {
      listeners!.delete(callback);
    };
  }

  sendCommand(args: { method: string; params: any; sessionId?: string }) {
    const id = this.nextMessageId++;
    const { method, params, sessionId } = args;
    console.log('Sending command', { id, method, params, sessionId });
    const command = {
      id,
      method,
      params,
      sessionId,
    };
    this.socket.send(JSON.stringify(command));
    const deferred = createDeferred<any>();
    this.pendingCommands.set(id, { method, deferred });
    return deferred.promise;
  }

  onSocketClose() {
    console.log('Socket closed');
  }

  onSocketError(error: any) {
    console.log(`Socket error ${error}`);
  }

  onSocketMessage(data: any) {
    const { error, id, method, params, result } = JSON.parse(String(data));
    if (id) {
      const info = this.pendingCommands.get(id);
      assert(info, `Received message with unknown id: ${id}`);
      this.pendingCommands.delete(id);
      if (result) {
        info.deferred.resolve(result);
      } else if (error) {
        console.error('ProtocolError', info.method, id, error);
        info.deferred.reject(new Error(`Protocol error ${error.code}: ${error.message}`));
      } else {
        info.deferred.reject(new Error('Channel error'));
      }
    } else if (this.eventListeners.has(method)) {
      const callbacks = this.eventListeners.get(method);
      if (callbacks) {
        callbacks.forEach((callback) => callback(params));
      }
    } else {
      console.log('Received message without a handler', { method, params });
    }
  }

  onSocketOpen() {
    console.log('Socket opened');
    this.openDeferred.resolve();
  }
}

// Send a single command with a one-use protocol client
async function sendCommandDedicatedClient(args: { method: string; params: any }) {
  const client = new ProtocolClient();
  await client.initialize();
  try {
    const rval = await client.sendCommand(args);
    client.close();
    return rval;
  } finally {
    client.close();
  }
}

// Function to list all problems (adapted from Problems.ts)
async function listAllProblems(includeTestProblems = false): Promise<BoltProblemDescription[]> {
  try {
    const rv = await sendCommandDedicatedClient({
      method: 'Recording.globalExperimentalCommand',
      params: {
        name: 'listBoltProblems',
      },
    });
    console.log('ListProblemsRval', rv);
    let problems = rv.rval.problems.reverse();
    // Filter out test problems if not explicitly included
    if (!includeTestProblems) {
      problems = problems.filter((problem: BoltProblemDescription) => !problem.title.includes('[test]'));
    }
    return problems;
  } catch (error) {
    console.error('Error fetching problems', error);
    return [];
  }
}

// Function to get a specific problem by ID (adapted from Problems.ts)
async function getProblem(problemId: string): Promise<BoltProblem | null> {
  try {
    if (!problemId) {
      console.error('Invalid problem ID');
      return null;
    }

    const rv = await sendCommandDedicatedClient({
      method: 'Recording.globalExperimentalCommand',
      params: {
        name: 'fetchBoltProblem',
        params: { problemId },
      },
    });

    const problem = (rv as { rval: { problem: BoltProblem } }).rval.problem;

    if (!problem) {
      console.error('Problem not found');
      return null;
    }

    // Handle legacy format
    if ('prompt' in problem) {
      // Convert from old format
      (problem as any).repositoryContents = (problem as any).prompt.content;
      delete (problem as any).prompt;
    }

    return problem;
  } catch (error) {
    console.error('Error fetching problem', error);
    return null;
  }
}

// Main function
async function main() {
  try {
    // Check if --include-test flag is provided
    const includeTestProblems = process.argv.includes('--include-test');
    console.log(`Fetching problems${includeTestProblems ? ' (including test problems)' : ''}...`);

    // Get problem summaries
    const problemDescriptions = await listAllProblems(includeTestProblems);

    // Create data directory if it doesn't exist
    const dataDir = join(import.meta.dir, '../data');
    await mkdir(dataDir, { recursive: true });

    // Save problem summaries
    const summaryFile = join(dataDir, 'problem-summaries.json');
    await writeFile(summaryFile, JSON.stringify(problemDescriptions, null, 2));
    console.log(`Successfully saved ${problemDescriptions.length} problem summaries to ${summaryFile}`);

    // Fetch full problem details
    console.log('Fetching full problem details...');
    let counter = 0;
    let successCount = 0;

    for (const summary of problemDescriptions) {
      counter++;
      const { problemId, title } = summary;
      console.log(`Fetching problem ${counter}/${problemDescriptions.length}: ${title} (${problemId})`);

      const fullProblem = await getProblem(problemId);
      if (fullProblem) {
        // Save each problem to its own file
        const problemFile = join(dataDir, `problem-${problemId}.json`);
        await writeFile(problemFile, JSON.stringify(fullProblem, null, 2));
        successCount++;
      }
    }

    console.log(`Successfully saved ${successCount} problems to individual files in ${dataDir}`);
  } catch (error) {
    console.error('Failed to save problems:', error);
    process.exit(1);
  }
}

// Run the script
main();
