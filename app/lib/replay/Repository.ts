import { sendCommandDedicatedClient } from './ReplayProtocolClient';

// Get the contents of a repository as a base64 string of the zip file.
export async function getRepositoryContents(repositoryId: string): Promise<string> {
  const rv = (await sendCommandDedicatedClient({
    method: 'Nut.getRepository',
    params: { repositoryId },
  })) as { repositoryContents: string };
  return rv.repositoryContents;
}
