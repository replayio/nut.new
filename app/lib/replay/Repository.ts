import { callNutAPI } from './NutAPI';

// Get the contents of a repository as a base64 string of the zip file.
export async function getRepositoryContents(repositoryId: string): Promise<string> {
  const { repositoryContents } = await callNutAPI('get-repository-contents', { repositoryId });
  return repositoryContents;
}
