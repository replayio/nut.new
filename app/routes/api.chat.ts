import { type ActionFunctionArgs } from '@remix-run/node';
import { ChatStreamController } from '~/utils/chatStreamController';
import { assert } from '~/lib/replay/ReplayProtocolClient';
import { getStreamTextArguments, type FileMap, type Messages } from '~/lib/.server/llm/stream-text';
import { chatAnthropic, type AnthropicApiKey } from '~/lib/.server/llm/chat-anthropic';
import { ensureOpenTelemetryInitialized } from '~/lib/.server/otel';

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

// Directions given to the LLM when we have an enhanced prompt describing the bug to fix.
const ENHANCED_PROMPT_PREFIX = `
ULTRA IMPORTANT: Below is a detailed description of the bug.
Focus specifically on fixing this bug. Do not guess about other problems.
`;

async function chatAction({ context, request }: ActionFunctionArgs) {
  // Only initialize OpenTelemetry if the context is available
  ensureOpenTelemetryInitialized(context);

  const { 
    messages, 
    files, 
    promptId, 
    simulationEnhancedPrompt, 
    anthropicApiKey: clientAnthropicApiKey,
    loginKey, 
  } = await request.json<{
    messages: Messages;
    files: FileMap;
    promptId?: string;
    simulationEnhancedPrompt?: string;
    anthropicApiKey?: string;
    loginKey?: string;
  }>();

  console.log('SimulationEnhancedPrompt', simulationEnhancedPrompt);

  try {
    // Create a compatible env object that satisfies the expected Env interface
    const compatibleEnv = {
      ...process.env,
      DEFAULT_NUM_CTX: process.env.DEFAULT_NUM_CTX || '',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      GROQ_API_KEY: process.env.GROQ_API_KEY || '',
      // Add other required keys with empty string defaults
    };

    const { system, messages: coreMessages } = await getStreamTextArguments({
      messages,
      env: compatibleEnv,
      apiKeys: {},
      files,
      providerSettings: undefined,
      promptId,
    });

    // Use either client-provided API key or environment variable
    const apiKey = clientAnthropicApiKey || process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new Error('Anthropic API key is not set');
    }

    const anthropicApiKey: AnthropicApiKey = {
      key: apiKey,
      isUser: !!clientAnthropicApiKey,
      userLoginKey: loginKey,
    };

    const resultStream = new ReadableStream({
      async start(controller) {
        const chatController = new ChatStreamController(controller);

        if (simulationEnhancedPrompt) {
          const lastMessage = coreMessages[coreMessages.length - 1];
          assert(lastMessage.role === 'user', 'Last message must be a user message');
          assert(lastMessage.content.length > 0, 'Last message must have content');
          
          const lastContent = lastMessage.content[0];
          assert(
            typeof lastContent === 'object' && lastContent.type === 'text', 
            'Last message content must be text'
          );
          lastContent.text += `\n\n${ENHANCED_PROMPT_PREFIX}\n\n${simulationEnhancedPrompt}`;
        }

        try {
          await chatAnthropic(chatController, files, anthropicApiKey, system, coreMessages);
        } catch (e) {
          console.error(e);
          chatController.writeText(`Error chatting with Anthropic: ${e}`);
        }

        controller.close();
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
