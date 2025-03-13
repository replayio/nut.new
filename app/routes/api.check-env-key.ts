import type { LoaderFunction } from '~/lib/remix-types';
import { providerBaseUrlEnvKeys } from '~/utils/constants';

export const loader: LoaderFunction = async ({ context: _, request }) => {
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider');

  if (!provider || !providerBaseUrlEnvKeys[provider].apiTokenKey) {
    return Response.json({ isSet: false });
  }

  const envVarName = providerBaseUrlEnvKeys[provider].apiTokenKey;

  // Use only process.env since context.env might be undefined
  const isSet = !!process.env[envVarName];

  return Response.json({ isSet });
};
