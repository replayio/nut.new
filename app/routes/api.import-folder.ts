import { json } from '@remix-run/node';
import type { ActionFunction } from '@remix-run/node';
import { MAX_FILES, shouldIncludeFile } from '~/utils/fileUtils';

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const files = formData.getAll('files') as File[];
  
  if (files.length === 0) {
    return json({ error: 'No files found' }, { status: 400 });
  }

  const filteredFiles = files.filter((file) => {
    const path = file.name.split('/').slice(1).join('/');
    return shouldIncludeFile(path);
  });

  if (filteredFiles.length === 0) {
    return json({ error: 'No valid files found' }, { status: 400 });
  }

  if (filteredFiles.length > MAX_FILES) {
    return json(
      { 
        error: 'Too many files',
        fileCount: filteredFiles.length,
        maxFiles: MAX_FILES 
      }, 
      { status: 400 }
    );
  }

  const fileContents = await Promise.all(
    filteredFiles.map(async (file) => {
      const content = await file.text();
      const relativePath = file.name.split('/').slice(1).join('/');
      return {
        content,
        path: relativePath,
      };
    })
  );

  return json({ files: fileContents });
}; 