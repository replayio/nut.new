// Accessors for the API to access saved problems.

import { toast } from "react-toastify";
import { sendCommandDedicatedClient } from "./ReplayProtocolClient";
import type { ProtocolMessage } from "./SimulationPrompt";
import Cookies from 'js-cookie';

export interface BoltProblemComment {
  username?: string;
  content: string;
  timestamp: number;
}

export interface BoltProblemSolution {
  simulationData: any;
  messages: ProtocolMessage[];
  evaluator: string;
}

export enum BoltProblemStatus {
  // Problem has been submitted but not yet reviewed.
  Pending = "Pending",

  // Problem has been reviewed and has not been solved yet.
  Unsolved = "Unsolved",

  // Nut automatically produces a suitable explanation for solving the problem.
  Solved = "Solved",
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

export type BoltProblemInput = Omit<BoltProblem, "problemId" | "timestamp">;

export async function listAllProblems(): Promise<BoltProblemDescription[]> {
  try {
    const rv = await sendCommandDedicatedClient({
      method: "Recording.globalExperimentalCommand",
      params: {
        name: "listBoltProblems",
      },
    });
    console.log("ListProblemsRval", rv);
    return (rv as any).rval.problems.reverse();
  } catch (error) {
    console.error("Error fetching problems", error);
    toast.error("Failed to fetch problems");
    return [];
  }
}

export async function getProblem(problemId: string): Promise<BoltProblem | null> {
  try {
    const rv = await sendCommandDedicatedClient({
      method: "Recording.globalExperimentalCommand",
      params: {
        name: "fetchBoltProblem",
        params: { problemId },
      },
    });
    console.log("FetchProblemRval", rv);
    const problem = (rv as { rval: { problem: BoltProblem } }).rval.problem;
    if ("prompt" in problem) {
      // 2/11/2025: Update obsolete data format for older problems.
      problem.repositoryContents = (problem as any).prompt.content;
      delete problem.prompt;
    }
    return problem;
  } catch (error) {
    console.error("Error fetching problem", error);
    toast.error("Failed to fetch problem");
  }
  return null;
}

export async function submitProblem(problem: BoltProblemInput): Promise<string | null> {
  try {
    const rv = await sendCommandDedicatedClient({
      method: "Recording.globalExperimentalCommand",
      params: {
        name: "submitBoltProblem",
        params: { problem },
      },
    });
    console.log("SubmitProblemRval", rv);
    return (rv as any).rval.problemId;
  } catch (error) {
    console.error("Error submitting problem", error);
    toast.error("Failed to submit problem");
    return null;
  }
}

export async function updateProblem(problemId: string, problem: BoltProblemInput) {
  try {
    const adminKey = Cookies.get(nutAdminKeyCookieName);
    if (!adminKey) {
      toast.error("Admin key not specified");
    }
    await sendCommandDedicatedClient({
      method: "Recording.globalExperimentalCommand",
      params: {
        name: "updateBoltProblem",
        params: { problemId, problem, adminKey },
      },
    });
  } catch (error) {
    console.error("Error updating problem", error);
    toast.error("Failed to update problem");
  }
}

const nutAdminKeyCookieName = 'nutAdminKey';

export function getNutAdminKey(): string | undefined {
  return Cookies.get(nutAdminKeyCookieName);
}

export function hasNutAdminKey(): boolean {
  return !!getNutAdminKey();
}

export function setNutAdminKey(key: string) {
  Cookies.set(nutAdminKeyCookieName, key);
}

const nutProblemsUsernameCookieName = 'nutProblemsUsername';

export function getProblemsUsername(): string | undefined {
  return Cookies.get(nutProblemsUsernameCookieName);
}

export function setProblemsUsername(username: string) {
  Cookies.set(nutProblemsUsernameCookieName, username);
}
