import type { CoreMessage } from "ai";
import Anthropic from "@anthropic-ai/sdk";
import { ChatStreamController } from "~/utils/chatStreamController";
import type { ContentBlockParam, MessageParam } from "@anthropic-ai/sdk/resources/messages/messages.mjs";

const MaxMessageTokens = 8192;

function convertContentToAnthropic(content: any): ContentBlockParam[] {
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }
  if (Array.isArray(content)) {
    return content.flatMap(convertContentToAnthropic);
  }
  if (content.type === "text" && typeof content.text === "string") {
    return [{ type: "text", text: content.text }];
  }
  console.log("AnthropicUnknownContent", JSON.stringify(content, null, 2));
  return [];
}

export async function chatAnthropic(chatController: ChatStreamController, apiKey: string, systemPrompt: string, messages: CoreMessage[]) {
  const anthropic = new Anthropic({ apiKey });

  const messageParams: MessageParam[] = [];

  messageParams.push({
    role: "assistant",
    content: systemPrompt,
  });

  for (const message of messages) {
    const role = message.role == "user" ? "user" : "assistant";
    const content = convertContentToAnthropic(message.content);
    messageParams.push({
      role,
      content,
    });
  }

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    messages: messageParams,
    max_tokens: MaxMessageTokens,
  });

  for (const content of response.content) {
    if (content.type === "text") {
      chatController.writeText(content.text);
    } else {
      console.log("AnthropicUnknownResponse", JSON.stringify(content, null, 2));
    }
  }

  const tokens = response.usage.input_tokens + response.usage.output_tokens;
  console.log("AnthropicTokens", tokens);

  chatController.writeUsage({ completionTokens: response.usage.output_tokens, promptTokens: response.usage.input_tokens });
}
