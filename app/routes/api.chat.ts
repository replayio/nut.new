import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createDataStream } from 'ai';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS } from '~/lib/.server/llm/constants';
import { CONTINUE_PROMPT } from '~/lib/common/prompts/prompts';
import { streamText, type Messages, type StreamingOptions } from '~/lib/.server/llm/stream-text';
import SwitchableStream from '~/lib/.server/llm/switchable-stream';
import type { IProviderSetting } from '~/types/model';
import { type SimulationChatMessage, type SimulationPromptClientData, performSimulationPrompt } from '~/lib/replay/SimulationPrompt';
import { ChatStreamController } from '~/utils/chatStreamController';
import { assert } from '~/lib/replay/ReplayProtocolClient';

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  const items = cookieHeader.split(';').map((cookie) => cookie.trim());

  items.forEach((item) => {
    const [name, ...rest] = item.split('=');

    if (name && rest) {
      const decodedName = decodeURIComponent(name.trim());
      const decodedValue = decodeURIComponent(rest.join('=').trim());
      cookies[decodedName] = decodedValue;
    }
  });

  return cookies;
}

function extractMessageContent(baseContent: any): string {
  let content = baseContent;

  if (content && typeof content == "object" && content.length) {
    assert(content.length == 1, "Expected a single message");
    content = content[0];
  }

  if (content && typeof content == "object") {
    assert(content.type == "text", `Expected "text" for type property, got ${content.type}`);
    content = content.text;
  }

  assert(typeof content == "string", `Expected string type, got ${typeof content}`);

  while (true) {
    const artifactIndex = content.indexOf("<boltArtifact");
    if (artifactIndex == -1) {
      break;
    }
    const closeTag = "</boltArtifact>"
    const artifactEnd = content.indexOf(closeTag, artifactIndex);
    assert(artifactEnd != -1, "Unterminated <boltArtifact> tag");
    content = content.slice(0, artifactIndex) + content.slice(artifactEnd + closeTag.length);
  }

  return content;
}

async function chatAction({ context, request }: ActionFunctionArgs) {
  const { messages, files, promptId, simulationClientData } = await request.json<{
    messages: Messages;
    files: any;
    promptId?: string;
    simulationClientData?: SimulationPromptClientData;
  }>();

  let finished: (v?: any) => void;
  context.cloudflare.ctx.waitUntil(new Promise((resolve) => finished = resolve));

  console.log("SimulationClientData", simulationClientData);

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = JSON.parse(parseCookies(cookieHeader || '').apiKeys || '{}');
  const providerSettings: Record<string, IProviderSetting> = JSON.parse(
    parseCookies(cookieHeader || '').providers || '{}',
  );

  const stream = new SwitchableStream();

  const cumulativeUsage = {
    completionTokens: 0,
    promptTokens: 0,
    totalTokens: 0,
  };

  try {
    if (/*simulationClientData*/true) {
      /*
      const chatHistory: SimulationChatMessage[] = [];
      for (const { role, content } of messages) {
        chatHistory.push({ role, content: extractMessageContent(content) });
      }
      const lastHistoryMessage = chatHistory.pop();
      assert(lastHistoryMessage?.role == "user", "Last message in chat history must be a user message");
      const userPrompt = lastHistoryMessage.content;

      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicApiKey) {
        throw new Error("Anthropic API key is not set");
      }

      const { message, fileChanges } = await performSimulationPrompt(simulationClientData, userPrompt, chatHistory, anthropicApiKey);
      */

      const resultStream = new ReadableStream({
        async start(controller) {
          const chatController = new ChatStreamController(controller);

          /*
          chatController.writeText(message + "\n");
          chatController.writeFileChanges("Update Files", fileChanges);
          */

          chatController.writeText("Hello World\n");
          chatController.writeText("Hello World 2\n");
          chatController.writeText("Hello\n World 3\n");
          chatController.writeFileChanges("Rewrite Files", [{filePath: "src/services/llm.ts", contents: "FILE_CONTENTS_FIXME" }]);
          chatController.writeAnnotation("usage", { completionTokens: 10, promptTokens: 20, totalTokens: 30 });

          controller.close();
          setTimeout(() => { stream.close(); finished(); }, 1000);
        },
      });

      stream.switchSource(resultStream);

      return new Response(stream.readable, {
        status: 200,
        headers: {
          contentType: 'text/plain; charset=utf-8',
        },
      });
    }

    const options: StreamingOptions = {
      toolChoice: 'none',
      onFinish: async ({ text: content, finishReason, usage }) => {
        console.log("QueryModelFinished", usage, content);

        if (usage) {
          cumulativeUsage.completionTokens += usage.completionTokens || 0;
          cumulativeUsage.promptTokens += usage.promptTokens || 0;
          cumulativeUsage.totalTokens += usage.totalTokens || 0;
        }

        if (finishReason !== 'length') {
          return stream
            .switchSource(
              createDataStream({
                async execute(dataStream) {
                  dataStream.writeMessageAnnotation({
                    type: 'usage',
                    value: {
                      completionTokens: cumulativeUsage.completionTokens,
                      promptTokens: cumulativeUsage.promptTokens,
                      totalTokens: cumulativeUsage.totalTokens,
                    },
                  });
                },
                onError: (error: any) => `Custom error: ${error.message}`,
              }),
            )
            .then(() => stream.close());
        }

        if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
          throw Error('Cannot continue message: Maximum segments reached');
        }

        const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;

        console.log(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);

        messages.push({ role: 'assistant', content });
        messages.push({ role: 'user', content: CONTINUE_PROMPT });

        const result = await streamText({
          messages,
          env: context.cloudflare.env,
          options,
          apiKeys,
          files,
          providerSettings,
          promptId,
        });

        return stream.switchSource(result.toDataStream());
      },
    };

    const result = await streamText({
      messages,
      env: context.cloudflare.env,
      options,
      apiKeys,
      files,
      providerSettings,
      promptId,
    });

    stream.switchSource(result.toDataStream());

    return new Response(stream.readable, {
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
