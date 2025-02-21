import { json } from '@remix-run/node';
import type { ActionFunction } from '@remix-run/node';
import { createChatFromFolder } from '~/utils/folderImport';
import type { FileArtifact } from '~/utils/folderImport';

interface CreateChatRequest {
  files: FileArtifact[];
  binaryFiles: string[];
  folderName: string;
}

export const action: ActionFunction = async ({ request }) => {
  const data = await request.json() as CreateChatRequest;

  if (!Array.isArray(data.files) || !Array.isArray(data.binaryFiles) || typeof data.folderName !== 'string') {
    return json({ error: 'Invalid request format' }, { status: 400 });
  }

  try {
    const messages = await createChatFromFolder(data.files, data.binaryFiles, data.folderName);
    return json({ messages });
  } catch (error) {
    console.error('Failed to create chat from folder:', error);
    return json({ error: 'Failed to create chat from folder' }, { status: 500 });
  }
}; 