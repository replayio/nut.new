import type { Message } from '~/lib/persistence/useChatHistory';
import { generateId } from './fileUtils';
import JSZip from 'jszip';

interface FileArtifact {
  content: string;
  path: string;
}

export async function getFileRepositoryContents(files: File[]): Promise<string> {
  const artifacts: FileArtifact[] = await Promise.all(
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

  const zip = new JSZip();
  for (const { path, content } of artifacts) {
    zip.file(path, content);
  }
  return await zip.generateAsync({ type: "base64" });
}

export function createChatFromFolder(
  folderName: string,
  repositoryId: string
): Message[] {
  let filesContent = `I've imported the contents of the "${folderName}" folder.`;

  const userMessage: Message = {
    role: 'user',
    id: generateId(),
    content: `Import the "${folderName}" folder`,
    createdAt: new Date(),
  };

  const filesMessage: Message = {
    role: 'assistant',
    content: filesContent,
    id: generateId(),
    createdAt: new Date(),
    repositoryId,
  };

  const messages = [userMessage, filesMessage];

  return messages;
}
