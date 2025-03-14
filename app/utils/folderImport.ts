import type { Message } from 'ai';
import { generateId, shouldIncludeFile } from './fileUtils';

export interface FileArtifact {
  content: string;
  path: string;
}

export async function getFileArtifacts(files: File[]): Promise<FileArtifact[]> {
  return Promise.all(
    files.map(async (file) => {
      return new Promise<FileArtifact>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const content = reader.result as string;
          const relativePath = file.webkitRelativePath.split('/').slice(1).join('/');
          resolve({
            content,
            path: relativePath,
          });
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }),
  );
}

export function createChatFromFolder(
  folderName: string,
): Message[] {
  let filesContent = `I've imported the contents of the "${folderName}" folder.`;

  const filesMessage: Message = {
    role: 'assistant',
    content: filesContent,
    id: generateId(),
    createdAt: new Date(),
  };

  const userMessage: Message = {
    role: 'user',
    id: generateId(),
    content: `Import the "${folderName}" folder`,
    createdAt: new Date(),
  };

  const messages = [userMessage, filesMessage];

  return messages;
}
