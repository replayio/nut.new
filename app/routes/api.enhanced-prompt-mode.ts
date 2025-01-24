import Anthropic from "@anthropic-ai/sdk";
import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { SimulationEnhancedPromptMode } from '~/lib/replay/SimulationPrompt';

export async function action(args: ActionFunctionArgs) {
  return enhancedPromptModeAction(args);
}

const MaxMessageTokens = 200;

const SystemPrompt = `
You are a helpful assistant that determines the information a user is looking for based on the
prompt they entered. You must respond with one of the following words, and nothing else:

Styling: The user is asking for a styling related fix to a DOM element.
Error: The user is asking for a bug fix or for anything else.
`;

function getResponseContentMode(responseContent: any) {
  if (typeof responseContent !== "string") {
    return SimulationEnhancedPromptMode.Error;
  }
  if (responseContent.includes("Styling")) {
    return SimulationEnhancedPromptMode.Styling;
  }
  return SimulationEnhancedPromptMode.Error;
}

async function enhancedPromptModeAction({ context, request }: ActionFunctionArgs) {
  const anthropicApiKey = context.cloudflare.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    throw new Error("Anthropic API key is not set");
  }

  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  const { input } = await request.json<{
    input: string;
  }>();

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    messages: [
      {
        role: "assistant",
        content: SystemPrompt,
      },
      {
        role: "user",
        content: input,
      },
    ],
    max_tokens: MaxMessageTokens,
  });

  const responseContent = (response.content[0] as any)?.text;
  const mode = getResponseContentMode(responseContent);

  return Response.json({ mode });
}
