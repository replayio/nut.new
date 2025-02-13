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

function flatMessageContent(content: string | ContentBlockParam[]): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    let result = "";
    for (const elem of content) {
      if (elem.type === "text") {
        result += elem.text;
      }
    }
    return result;
  }
  console.log("AnthropicUnknownContent", JSON.stringify(content, null, 2));
  return "AnthropicUnknownContent";
}

export async function chatAnthropic(chatController: ChatStreamController, apiKey: string, systemPrompt: string, messages: CoreMessage[]) {
  const anthropic = new Anthropic({ apiKey });

  const messageParams: MessageParam[] = [];

  for (const message of messages) {
    const role = message.role == "user" ? "user" : "assistant";
    const content = convertContentToAnthropic(message.content);
    messageParams.push({
      role,
      content,
    });
  }

  console.log("************************************************");
  console.log("AnthropicMessageSend");
  console.log("Message system:");
  console.log(systemPrompt);
  for (const message of messageParams) {
    console.log(`Message ${message.role}:`);
    console.log(flatMessageContent(message.content));
  }
  console.log("************************************************");

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    messages: messageParams,
    max_tokens: MaxMessageTokens,
    system: systemPrompt,
  });

  for (const content of response.content) {
    if (content.type === "text") {
      console.log("************************************************");
      console.log("AnthropicMessageResponse:");
      console.log(content.text);
      console.log("************************************************");
      chatController.writeText(content.text);
    } else {
      console.log("AnthropicUnknownResponse", JSON.stringify(content, null, 2));
    }
  }

  const tokens = response.usage.input_tokens + response.usage.output_tokens;
  console.log("AnthropicTokens", tokens);

  chatController.writeUsage({ completionTokens: response.usage.output_tokens, promptTokens: response.usage.input_tokens });
}
