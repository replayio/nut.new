import type { Message } from 'ai';
import Cookies from 'js-cookie';
import { anthropicApiKeyCookieName } from '~/utils/freeUses';

export async function shouldUseSimulation(messages: Message[], messageInput: string) {
  const apiKeyCookie = Cookies.get(anthropicApiKeyCookieName);
  const anthropicApiKey = apiKeyCookie?.length ? apiKeyCookie : undefined;

  const requestBody: any = {
    messages,
    messageInput,
    anthropicApiKey,
  };

  const response = await fetch('/api/use-simulation', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  const result = (await response.json()) as any;

  return 'useSimulation' in result && !!result.useSimulation;
}
