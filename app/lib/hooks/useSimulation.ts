import type { Message } from 'ai';

export async function shouldUseSimulation(messages: Message[], messageInput: string) {
  const requestBody: any = {
    messages,
    messageInput,
  };

  const response = await fetch('/api/use-simulation', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  const result = await response.json() as any;
  return "useSimulation" in result && !!result.useSimulation;
}
