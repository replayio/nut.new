import type { CoreMessage } from "ai";
import Anthropic from "@anthropic-ai/sdk";
import { ChatStreamController } from "~/utils/chatStreamController";
import type { ContentBlockParam, MessageParam } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import type { FileMap } from "./stream-text";
import { StreamingMessageParser } from "~/lib/runtime/message-parser";

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

interface AnthropicResponse {
  responseText: string;
  completionTokens: number;
  promptTokens: number;
}

async function callAnthropic(apiKey: string, systemPrompt: string, messages: MessageParam[]): Promise<AnthropicResponse> {
  const anthropic = new Anthropic({ apiKey });

  console.log("************************************************");
  console.log("AnthropicMessageSend");
  console.log("Message system:");
  console.log(systemPrompt);
  for (const message of messages) {
    console.log(`Message ${message.role}:`);
    console.log(flatMessageContent(message.content));
  }
  console.log("************************************************");

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    messages,
    max_tokens: MaxMessageTokens,
    system: systemPrompt,
  });

  let responseText = "";
  for (const content of response.content) {
    if (content.type === "text") {
      console.log("************************************************");
      console.log("AnthropicMessageResponse:");
      console.log(content.text);
      console.log("************************************************");
      responseText += content.text;
    } else {
      console.log("AnthropicUnknownResponse", JSON.stringify(content, null, 2));
    }
  }

  const completionTokens = response.usage.output_tokens;
  const promptTokens = response.usage.input_tokens;

  console.log("AnthropicTokens", completionTokens + promptTokens);

  return {
    responseText,
    completionTokens,
    promptTokens,
  };
}

interface FileContents {
  filePath: string;
  content: string;
}

async function restorePartialFiles(files: FileMap, response: AnthropicResponse) {
  const fileContents: FileContents[] = [];

  const messageParser = new StreamingMessageParser({
    callbacks: {
      onActionClose: (data) => {
        if (data.action.type === "file") {
          const { filePath, content } = data.action;
          fileContents.push({
            filePath,
            content,
          });
        }
      },
    }
  });

  messageParser.parse("restore-partial-files-message-id", response.responseText);

  for (const file of fileContents) {
    console.log("FoundFile", file.filePath);
    console.log(file.content);
    console.log("EndContent");
  }
}

export async function chatAnthropic(chatController: ChatStreamController, files: FileMap, apiKey: string, systemPrompt: string, messages: CoreMessage[]) {
  const messageParams: MessageParam[] = [];

  for (const message of messages) {
    const role = message.role == "user" ? "user" : "assistant";
    const content = convertContentToAnthropic(message.content);
    messageParams.push({
      role,
      content,
    });
  }

  const response = await callAnthropic(apiKey, systemPrompt, messageParams);

  await restorePartialFiles(files, response);

  const { completionTokens, promptTokens, responseText } = response;

  chatController.writeText(responseText);
  chatController.writeUsage({ completionTokens, promptTokens });
}
