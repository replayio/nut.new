import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { type SimulationPromptClientData, getSimulationPromptRecording } from '~/lib/replay/SimulationPrompt';
import { ChatStreamController } from '~/utils/chatStreamController';
import { assert } from '~/lib/replay/ReplayProtocolClient';
import { getStreamTextArguments, type Messages } from '~/lib/.server/llm/stream-text';
import { chatAnthropic } from '~/lib/.server/llm/chat-anthropic';

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
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

  try {
    const { system, messages: coreMessages } = await getStreamTextArguments({
      messages,
      env: context.cloudflare.env,
      apiKeys: {},
      files,
      providerSettings: undefined,
      promptId,
    });

    const anthropicApiKey = context.cloudflare.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      throw new Error("Anthropic API key is not set");
    }

    const resultStream = new ReadableStream({
      async start(controller) {
        const chatController = new ChatStreamController(controller);

        /*
        chatController.writeText("Hello World\n");
        chatController.writeText("Hello World 2\n");
        chatController.writeText("Hello\n World 3\n");
        chatController.writeFileChanges("Rewrite Files", [{filePath: "src/services/llm.ts", contents: "FILE_CONTENTS_FIXME" }]);
        chatController.writeAnnotation("usage", { completionTokens: 10, promptTokens: 20, totalTokens: 30 });
        */

        let recordingId: string | undefined;
        if (simulationClientData) {
          try {
            const { simulationData, repositoryContents } = simulationClientData;
            recordingId = await getSimulationPromptRecording(simulationData, repositoryContents);
            chatController.writeText(`[Recording of the bug](https://app.replay.io/recording/${recordingId})\n\n`);
          } catch (e) {
            console.error(e);
            chatController.writeText("Error creating recording.");
          }
        }

        try {
          await chatAnthropic(chatController, anthropicApiKey, system, coreMessages);
        } catch (e) {
          console.error(e);
          chatController.writeText("Error chatting with Anthropic.");
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
