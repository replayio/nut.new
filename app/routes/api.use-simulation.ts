import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';

import { callAnthropic, type AnthropicApiKey } from '~/lib/.server/llm/chat-anthropic';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages/messages.mjs';

export async function action(args: ActionFunctionArgs) {
  return useSimulationAction(args);
}

async function useSimulationAction({ context, request }: ActionFunctionArgs) {
  const { messages, messageInput } = await request.json<{
    messages: Message[];
    messageInput: string;
  }>();

  const apiKey = context.cloudflare.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Anthropic API key is not set");
  }

  const anthropicApiKey: AnthropicApiKey = {
    key: apiKey,
    isUser: false,
    userLoginKey: undefined,
  };

  const systemPrompt = `
You are a helpful assistant that determines whether a user's message that is asking an AI
to make a change to an application should first perform a detailed analysis of the application's
behavior to generate a better answer.

This is most helpful when the user is asking the AI to fix a problem with the application.
When making straightforward improvements to the application a detailed analysis is not necessary.

The text of the user's message will be wrapped in \`<user_message>\` tags. You must describe your
reasoning and then respond with either \`<analyze>true</analyze>\` or \`<analyze>false</analyze>\`.
  `;

  const message: MessageParam = {
    role: "user",
    content: `Here is the user message you need to evaluate: <user_message>${messageInput}</user_message>`,
  };

  const { responseText } = await callAnthropic(anthropicApiKey, "UseSimulation", systemPrompt, [message]);

  console.log("UseSimulationResponse", responseText);

  const match = /<analyze>(.*?)<\/analyze>/.exec(responseText);
  if (match) {
    const useSimulation = match[1] === "true";
    return json({ useSimulation });
  } else {
    return json({ useSimulation: false });
  }
}
