import { diffLines } from 'diff';
import type { Change } from 'diff';
import JSZip from 'jszip';
import type { BundledLanguage } from 'shiki';

export interface FileDiff {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  oldContent?: string;
  newContent?: string;
  hunks: Hunk[];
}

export interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: HunkLine[];
  hiddenLinesBefore?: number;
}

export interface HunkLine {
  type: 'context' | 'added' | 'removed';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface RepositoryFiles {
  [path: string]: string;
}

const CONTEXT_LINES = 3;

export function getShikiLanguage(filePath: string): BundledLanguage | null {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const langMap: Record<string, BundledLanguage> = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    json: 'json',
    md: 'markdown',
    markdown: 'markdown',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    swift: 'swift',
    kt: 'kotlin',
    php: 'php',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    svg: 'xml',
    vue: 'vue',
    svelte: 'svelte',
  };
  return ext && ext in langMap ? langMap[ext] : null;
}

export function computeHunks(oldContent: string, newContent: string): Hunk[] {
  const diffResult = diffLines(oldContent, newContent, {
    ignoreCase: false,
    ignoreWhitespace: false,
  });

  const lines: HunkLine[] = [];
  let oldLineNum = 1;
  let newLineNum = 1;

  diffResult.forEach((part: Change) => {
    const partLines = part.value.split('\n');
    if (partLines[partLines.length - 1] === '') {
      partLines.pop();
    }

    partLines.forEach((line) => {
      if (part.added) {
        lines.push({
          type: 'added',
          content: line,
          newLineNumber: newLineNum++,
        });
      } else if (part.removed) {
        lines.push({
          type: 'removed',
          content: line,
          oldLineNumber: oldLineNum++,
        });
      } else {
        lines.push({
          type: 'context',
          content: line,
          oldLineNumber: oldLineNum++,
          newLineNumber: newLineNum++,
        });
      }
    });
  });

  const hunks: Hunk[] = [];
  let currentHunk: Hunk | null = null;
  let contextBuffer: HunkLine[] = [];
  let lastChangeIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.type !== 'context') {
      if (currentHunk === null) {
        const contextStart = Math.max(0, contextBuffer.length - CONTEXT_LINES);
        const leadingContext = contextBuffer.slice(contextStart);
        const hiddenBefore = contextBuffer.length - leadingContext.length;

        currentHunk = {
          oldStart: leadingContext[0]?.oldLineNumber || line.oldLineNumber || 1,
          newStart: leadingContext[0]?.newLineNumber || line.newLineNumber || 1,
          oldLines: 0,
          newLines: 0,
          lines: [...leadingContext],
          hiddenLinesBefore: hiddenBefore > 0 ? hiddenBefore : undefined,
        };
      }

      currentHunk.lines.push(line);
      lastChangeIndex = currentHunk.lines.length - 1;
      contextBuffer = [];
    } else {
      if (currentHunk !== null) {
        const contextSinceLastChange = currentHunk.lines.length - 1 - lastChangeIndex;

        if (contextSinceLastChange < CONTEXT_LINES * 2) {
          currentHunk.lines.push(line);
        } else {
          const trimmedLines = currentHunk.lines.slice(0, lastChangeIndex + CONTEXT_LINES + 1);
          currentHunk.lines = trimmedLines;
          currentHunk.oldLines = trimmedLines.filter((l) => l.type !== 'added').length;
          currentHunk.newLines = trimmedLines.filter((l) => l.type !== 'removed').length;

          hunks.push(currentHunk);
          currentHunk = null;
          contextBuffer = [line];
        }
      } else {
        contextBuffer.push(line);
      }
    }
  }

  if (currentHunk !== null) {
    currentHunk.oldLines = currentHunk.lines.filter((l) => l.type !== 'added').length;
    currentHunk.newLines = currentHunk.lines.filter((l) => l.type !== 'removed').length;
    hunks.push(currentHunk);
  }

  return hunks;
}

export function computeAddedFileHunks(content: string): Hunk[] {
  const contentLines = content.split('\n');
  const lines: HunkLine[] = contentLines.map((line, index) => ({
    type: 'added' as const,
    content: line,
    newLineNumber: index + 1,
  }));

  return [
    {
      oldStart: 0,
      oldLines: 0,
      newStart: 1,
      newLines: lines.length,
      lines,
    },
  ];
}

export function computeDeletedFileHunks(content: string): Hunk[] {
  const contentLines = content.split('\n');
  const lines: HunkLine[] = contentLines.map((line, index) => ({
    type: 'removed' as const,
    content: line,
    oldLineNumber: index + 1,
  }));

  return [
    {
      oldStart: 1,
      oldLines: lines.length,
      newStart: 0,
      newLines: 0,
      lines,
    },
  ];
}

export async function extractRepositoryFiles(base64Content: string): Promise<RepositoryFiles> {
  try {
    const zip = new JSZip();
    const zipData = atob(base64Content);
    const zipBuffer = new Uint8Array(zipData.length);
    for (let i = 0; i < zipData.length; i++) {
      zipBuffer[i] = zipData.charCodeAt(i);
    }

    const loadedZip = await zip.loadAsync(zipBuffer);
    const files: RepositoryFiles = {};

    for (const [path, file] of Object.entries(loadedZip.files)) {
      if (!file.dir) {
        const content = await file.async('string');
        files[path] = content;
      }
    }

    return files;
  } catch (error) {
    console.error('Error extracting repository:', error);
    return {};
  }
}

export function compareRepositories(oldFiles: RepositoryFiles, newFiles: RepositoryFiles): FileDiff[] {
  const allPathsSet = new Set([...Object.keys(oldFiles), ...Object.keys(newFiles)]);
  const allPaths = [...allPathsSet].sort();

  const diffs: FileDiff[] = [];

  for (const path of allPaths) {
    const oldContent = oldFiles[path];
    const newContent = newFiles[path];

    if (!oldContent && newContent) {
      diffs.push({
        path,
        type: 'added',
        newContent,
        hunks: computeAddedFileHunks(newContent),
      });
    } else if (oldContent && !newContent) {
      diffs.push({
        path,
        type: 'deleted',
        oldContent,
        hunks: computeDeletedFileHunks(oldContent),
      });
    } else if (oldContent !== newContent) {
      diffs.push({
        path,
        type: 'modified',
        oldContent,
        newContent,
        hunks: computeHunks(oldContent!, newContent!),
      });
    }
  }

  return diffs;
}

export function getFileIcon(type: 'added' | 'modified' | 'deleted') {
  switch (type) {
    case 'added':
      return 'PlusCircle';
    case 'modified':
      return 'PenSquare';
    case 'deleted':
      return 'MinusCircle';
    default:
      return 'File';
  }
}

export function getFileColor(type: 'added' | 'modified' | 'deleted') {
  switch (type) {
    case 'added':
      return 'text-green-500';
    case 'modified':
      return 'text-yellow-500';
    case 'deleted':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
}
