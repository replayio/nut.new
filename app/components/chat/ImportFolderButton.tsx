import React, { useState } from 'react';
import type { Message } from 'ai';
import { toast } from 'react-toastify';
import { MAX_FILES, isBinaryFile, shouldIncludeFile } from '~/utils/fileUtils';
import { logStore } from '~/lib/stores/logs';

interface ImportFolderButtonProps {
  className?: string;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
}

interface FileArtifact {
  path: string;
  content: string;
}

interface ImportFolderResponse {
  files: FileArtifact[];
}

interface CreateChatResponse {
  messages: Message[];
}

export const ImportFolderButton: React.FC<ImportFolderButtonProps> = ({ className, importChat }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const allFiles = Array.from(e.target.files || []);
    const folderName = allFiles[0]?.webkitRelativePath.split('/')[0] || 'Unknown Folder';
    
    const filteredFiles = allFiles.filter((file) => {
      const path = file.webkitRelativePath.split('/').slice(1).join('/');
      return shouldIncludeFile(path);
    });

    if (filteredFiles.length === 0) {
      const error = new Error('No valid files found');
      logStore.logError('File import failed - no valid files', error, { folderName });
      toast.error('No files found in the selected folder');
      return;
    }

    if (filteredFiles.length > MAX_FILES) {
      const error = new Error(`Too many files: ${filteredFiles.length}`);
      logStore.logError('File import failed - too many files', error, {
        fileCount: filteredFiles.length,
        maxFiles: MAX_FILES,
      });
      toast.error(
        `This folder contains ${filteredFiles.length.toLocaleString()} files. This product is not yet optimized for very large projects. Please select a folder with fewer than ${MAX_FILES.toLocaleString()} files.`,
      );
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading(`Importing ${folderName}...`);

    try {
      const fileChecks = await Promise.all(
        filteredFiles.map(async (file) => ({
          file,
          isBinary: await isBinaryFile(file),
        })),
      );

      const textFiles = fileChecks.filter((f) => !f.isBinary).map((f) => f.file);
      const binaryFilePaths = fileChecks
        .filter((f) => f.isBinary)
        .map((f) => f.file.webkitRelativePath.split('/').slice(1).join('/'));

      if (textFiles.length === 0) {
        const error = new Error('No text files found');
        logStore.logError('File import failed - no text files', error, { folderName });
        toast.error('No text files found in the selected folder');
        return;
      }

      if (binaryFilePaths.length > 0) {
        logStore.logWarning(`Skipping binary files during import`, {
          folderName,
          binaryCount: binaryFilePaths.length,
        });
        toast.info(`Skipping ${binaryFilePaths.length} binary files`);
      }

      // First, upload the files
      const formData = new FormData();
      textFiles.forEach((file) => formData.append('files', file));
      
      const uploadResponse = await fetch('/api/import-folder', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload files');
      }

      const { files: fileArtifacts } = await uploadResponse.json() as ImportFolderResponse;

      // Then, create the chat
      const chatResponse = await fetch('/api/create-chat-from-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: fileArtifacts,
          binaryFiles: binaryFilePaths,
          folderName,
        }),
      });

      if (!chatResponse.ok) {
        throw new Error('Failed to create chat');
      }

      const { messages } = await chatResponse.json() as CreateChatResponse;

      if (importChat) {
        await importChat(folderName, messages);
      }

      logStore.logSystem('Folder imported successfully', {
        folderName,
        textFileCount: textFiles.length,
        binaryFileCount: binaryFilePaths.length,
      });
      toast.success('Folder imported successfully');
    } catch (error) {
      logStore.logError('Failed to import folder', error, { folderName });
      console.error('Failed to import folder:', error);
      toast.error('Failed to import folder');
    } finally {
      setIsLoading(false);
      toast.dismiss(loadingToast);
      e.target.value = ''; // Reset file input
    }
  };

  return (
    <>
      <input
        type="file"
        id="folder-import"
        className="hidden"
        webkitdirectory=""
        directory=""
        onChange={handleFileChange}
        {...({} as any)}
      />
      <button
        onClick={() => {
          const input = document.getElementById('folder-import');
          input?.click();
        }}
        className={className}
        disabled={isLoading}
      >
        <div className="i-ph:upload-simple" />
        {isLoading ? 'Importing...' : 'Import Folder'}
      </button>
    </>
  );
};
