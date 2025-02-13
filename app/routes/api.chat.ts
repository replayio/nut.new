import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { ChatStreamController } from '~/utils/chatStreamController';
import { assert } from '~/lib/replay/ReplayProtocolClient';
import { getStreamTextArguments, type FileMap, type Messages } from '~/lib/.server/llm/stream-text';
import { chatAnthropic } from '~/lib/.server/llm/chat-anthropic';

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

// Directions given to the LLM when we have an enhanced prompt describing the bug to fix.
const EnhancedPromptPrefix = `
ULTRA IMPORTANT: Below is a detailed description of the bug.
Focus specifically on fixing this bug. Do not guess about other problems.
`;

async function chatAction({ context, request }: ActionFunctionArgs) {
  const { messages, files, promptId, simulationEnhancedPrompt, anthropicApiKey: clientAnthropicApiKey } = await request.json<{
    messages: Messages;
    files: FileMap;
    promptId?: string;
    simulationEnhancedPrompt?: string;
    anthropicApiKey?: string;
  }>();

  let finished: (v?: any) => void;
  context.cloudflare.ctx.waitUntil(new Promise((resolve) => finished = resolve));

  console.log("SimulationEnhancedPrompt", simulationEnhancedPrompt);

  try {
    const { system, messages: coreMessages } = await getStreamTextArguments({
      messages,
      env: context.cloudflare.env,
      apiKeys: {},
      files,
      providerSettings: undefined,
      promptId,
    });

    const anthropicApiKey = clientAnthropicApiKey ?? context.cloudflare.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      throw new Error("Anthropic API key is not set");
    }

    const resultStream = new ReadableStream({
      async start(controller) {
        const chatController = new ChatStreamController(controller);

        if (simulationEnhancedPrompt) {
          const lastMessage = coreMessages[coreMessages.length - 1];
          assert(lastMessage.role == "user", "Last message must be a user message");
          assert(lastMessage.content.length > 0, "Last message must have content");
          const lastContent = lastMessage.content[0];
          assert(typeof lastContent == "object" && lastContent.type == "text", "Last message content must be text");
          lastContent.text += `\n\n${EnhancedPromptPrefix}\n\n${simulationEnhancedPrompt}`;
        }

        try {
          await chatAnthropic(chatController, files, anthropicApiKey, system, coreMessages);
        } catch (e) {
          console.error(e);
          chatController.writeText(`Error chatting with Anthropic: ${e}`);
        }

        controller.close();
        setTimeout(finished, 1000);
      },
    });

    return new Response(resultStream, {
      status: 200,
      headers: {
        contentType: 'text/plain; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error(error);

    if (error.message?.includes('API key')) {
      throw new Response('Invalid or missing API key', {
        status: 401,
        statusText: 'Unauthorized',
      });
    }

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
