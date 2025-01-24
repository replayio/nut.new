// Core logic for using simulation data from a remote recording to enhance
// the AI developer prompt.

import { type SimulationData, type MouseData } from './Recording';
import { assert, ProtocolClient, sendCommandDedicatedClient } from './ReplayProtocolClient';
import JSZip from 'jszip';

interface RerecordGenerateParams {
  rerecordData: SimulationData;
  repositoryContents: string;
}

export async function getSimulationRecording(
  simulationData: SimulationData,
  repositoryContents: string
): Promise<string> {
  const params: RerecordGenerateParams = {
    rerecordData: simulationData,
    repositoryContents,
  };
  const rv = await sendCommandDedicatedClient({
    method: "Recording.globalExperimentalCommand",
    params: {
      name: "rerecordGenerate",
      params,
    },
  });

  return (rv as { rval: { rerecordedRecordingId: string } }).rval.rerecordedRecordingId;
}

type ProtocolExecutionPoint = string;

export interface URLLocation {
  sourceId: string;
  line: number;
  column: number;
  url: string;
}

// A location within a recording and associated source contents.
export interface URLLocationWithSource extends URLLocation {
  // Text from the application source indicating the location.
  source: string;
}

interface ExecutionDataEntry {
  // Value from the application source which is being described.
  value?: string;

  // Description of the contents of the value. If |value| is omitted
  // this describes a control dependency for the location.
  contents: string;

  // Any associated execution point.
  associatedPoint?: ProtocolExecutionPoint;

  // Location in the recording of the associated execution point.
  associatedLocation?: URLLocationWithSource;

  // Any expression for the value at the associated point which flows to this one.
  associatedValue?: string;

  // Description of how data flows from the associated point to this one.
  associatedDataflow?: string;
}

interface ExecutionDataPoint {
  // Associated point.
  point: ProtocolExecutionPoint;

  // Location in the recording being described.
  location: URLLocationWithSource;

  // Entries describing the point.
  entries: ExecutionDataEntry[];
}

// Initial point for analysis that is an uncaught exception thrown
// from application code called by React, causing the app to unmount.
interface RecordingFailureDataReactException {
  kind: "ReactException";
  errorText: string;
  point: ProtocolExecutionPoint;

  // Whether the exception was thrown by library code called at the point.
  calleeFrame: boolean;
}

// Initial point for analysis that is an exception logged to the console.
interface RecordingFailureDataConsoleError {
  kind: "ConsoleError";
  errorText: string;
  point: ProtocolExecutionPoint;
}

// Fallback failure data shows the React component tree at the end of the recording.
interface ReactComponentTree {
  name: string;
  children: ReactComponentTree[];
}

interface RecordingFailureDataComponentTree {
  kind: "ComponentTree";
  componentTree: ReactComponentTree;
}

export type RecordingFailureData =
  | RecordingFailureDataReactException
  | RecordingFailureDataConsoleError
  | RecordingFailureDataComponentTree;

export interface ExecutionDataAnalysisResult {
  // Points which were described.
  points: ExecutionDataPoint[];

  // If an expression was specified, the dataflow steps for that expression.
  dataflow?: string[];

  // The initial point which was analyzed. If no point was originally specified,
  // another point will be picked based on any comments or other data in the recording.
  point?: ProtocolExecutionPoint;

  // Any comment text associated with the point.
  commentText?: string;

  // If the comment is on a React component, the name of the component.
  reactComponentName?: string;

  // If no point or comment was available, describes the failure associated with the
  // initial point of the analysis.
  failureData?: RecordingFailureData;
}

function trimFileName(url: string): string {
  const lastSlash = url.lastIndexOf('/');
  return url.slice(lastSlash + 1);
}

async function getSourceText(repositoryContents: string, fileName: string): Promise<string> {
  const zip = new JSZip();
  const binaryData = Buffer.from(repositoryContents, 'base64');
  await zip.loadAsync(binaryData as any /* TS complains but JSZip works */);
  for (const [path, file] of Object.entries(zip.files)) {
    if (trimFileName(path) === fileName) {
      return await file.async('string');
    }
  }
  for (const path of Object.keys(zip.files)) {
    console.log("RepositoryPath", path);
  }
  throw new Error(`File ${fileName} not found in repository`);
}

async function annotateSource(repositoryContents: string, fileName: string, source: string, annotation: string): Promise<string> {
  const sourceText = await getSourceText(repositoryContents, fileName);
  const sourceLines = sourceText.split('\n');
  const lineIndex = sourceLines.findIndex(line => line.includes(source));
  if (lineIndex === -1) {
    throw new Error(`Source text ${source} not found in ${fileName}`);
  }

  let rv = "";
  for (let i = lineIndex - 3; i < lineIndex + 3; i++) {
    if (i < 0 || i >= sourceLines.length) {
      continue;
    }
    if (i === lineIndex) {
      const leadingSpaces = sourceLines[i].match(/^\s*/)![0];
      rv += `${leadingSpaces}// ${annotation}\n`;
    }
    rv += `${sourceLines[i]}\n`;
  }
  return rv;
}

function describeComponentTree(componentTree: ReactComponentTree, indent: string): string {
  let rv = "";
  rv += `${indent}${componentTree.name}\n`;
  for (const child of componentTree.children) {
    rv += describeComponentTree(child, indent + "  ");
  }
  return rv;
}

function codeBlock(text: string): string {
  return "```\n" + text + (text.endsWith("\n") ? "" : "\n") + "```";
}

async function enhancePromptFromFailureData(
  points: ExecutionDataPoint[],
  failureData: RecordingFailureData,
  repositoryContents: string
): Promise<string> {
  const failurePoint = "point" in failureData ? points.find(p => p.point === failureData.point) : undefined;

  let prompt = "";
  let annotation;

  switch (failureData.kind) {
    case "ReactException":
      prompt += "An exception was thrown which causes React to unmount the application.\n";
      if (failureData.calleeFrame) {
        annotation = `A function called from here is throwing the exception "${failureData.errorText}"`;
      } else {
        annotation = `This line is throwing the exception "${failureData.errorText}"`;
      }
      break;
    case "ConsoleError":
      prompt += "An exception was thrown and later logged to the console.\n";
      annotation = `This line is throwing the exception "${failureData.errorText}"`;
      break;
    case "ComponentTree":
      prompt += "The React component tree at the end of the recording:\n\n";
      prompt += codeBlock(describeComponentTree(failureData.componentTree, ""));
      break;
    default:
      throw new Error(`Unknown failure kind: ${(failureData as any).kind}`);
  }

  if (failurePoint) {
    assert(annotation);
    const pointText = failurePoint.location.source.trim();
    const fileName = trimFileName(failurePoint.location.url);
    const annotatedSource = await annotateSource(repositoryContents, fileName, pointText, annotation);
    prompt += `Here is the affected code, in ${fileName}:\n\n`;
    prompt += codeBlock(annotatedSource);
  }

  return prompt;
}

export enum SimulationEnhancedPromptMode {
  Error = "Error",
  Styling = "Styling",
}

export async function getSimulationEnhancedPrompt(
  recordingId: string,
  repositoryContents: string,
  mouseData: MouseData | undefined,
  mode: SimulationEnhancedPromptMode
): Promise<string> {
  const client = new ProtocolClient();
  await client.initialize();
  try {
    const createSessionRval = await client.sendCommand({ method: "Recording.createSession", params: { recordingId } });
    const sessionId = (createSessionRval as { sessionId: string }).sessionId;

    const { rval } = await client.sendCommand({
      method: "Session.experimentalCommand",
      params: {
        name: "analyzeExecutionPoint",
        params: { mouseData, mode },
      },
      sessionId,
    }) as { rval: ExecutionDataAnalysisResult };

    const { points, failureData } = rval;
    assert(failureData, "No failure data");

    console.log("FailureData", JSON.stringify(failureData, null, 2));

    const prompt = await enhancePromptFromFailureData(points, failureData, repositoryContents);
    console.log("Enhanced prompt", prompt);
    return prompt;
  } finally {
    client.close();
  }
}
