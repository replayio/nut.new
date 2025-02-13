import type { CoreMessage } from "ai";
import Anthropic from "@anthropic-ai/sdk";
import { ChatStreamController } from "~/utils/chatStreamController";
import type { ContentBlockParam, MessageParam } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import type { FileMap } from "./stream-text";
import { StreamingMessageParser } from "~/lib/runtime/message-parser";
import { extractRelativePath } from "~/utils/diff";

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
      responseText += content.text;
    } else {
      console.log("AnthropicUnknownResponse", JSON.stringify(content, null, 2));
    }
  }

  const completionTokens = response.usage.output_tokens;
  const promptTokens = response.usage.input_tokens;

  console.log("************************************************");
  console.log("AnthropicMessageResponse:");
  console.log(responseText);
  console.log("AnthropicTokens", completionTokens + promptTokens);
  console.log("************************************************");

  return {
    responseText,
    completionTokens,
    promptTokens,
  };
}

function getFileContents(files: FileMap, path: string): string {
  for (const [filePath, file] of Object.entries(files)) {
    if (extractRelativePath(filePath) === path) {
      if (file?.type === "file" && !file.isBinary) {
        return file.content;
      }
    }
  }
  return "";
}

function shouldRestorePartialFile(existingContent: string, newContent: string): boolean {
  return existingContent.length > newContent.length;
}

async function restorePartialFile(existingContent: string, newContent: string, apiKey: string, originalResponse: AnthropicResponse) {
  const systemPrompt = `
You are a helpful assistant that restores the content of a file to reflect partial updates made by another assistant.

The existing content for the file is:

<existingContent>
${existingContent}
</existingContent>

The new content that may contain partial updates is:

<newContent>
${newContent}
</newContent>

Your task is to return complete restored content which both reflects the changes made in the new content
and includes any code that was removed from the original file.

Describe any places in the new content where code may have been removed.
ULTRA IMPORTANT: The restored content should be returned in the following format:

<restoredContent>
Restored content goes here
</restoredContent>
`;

  const newResponse = await callAnthropic(apiKey, systemPrompt, []);

  originalResponse.completionTokens += newResponse.completionTokens;
  originalResponse.promptTokens += newResponse.promptTokens;

  const OpenTag = "<restoredContent>";
  const CloseTag = "</restoredContent>";
  const openTag = newResponse.responseText.indexOf(OpenTag);
  const closeTag = newResponse.responseText.indexOf(CloseTag);

  if (openTag === -1 || closeTag === -1) {
    console.log("Invalid restored content");
    return;
  }

  const restoredContent = newResponse.responseText.substring(openTag + OpenTag.length, closeTag);
  const newContentIndex = originalResponse.responseText.indexOf(newContent);

  if (newContentIndex === -1) {
    console.log("New content not found in response");
    return;
  }

  originalResponse.responseText =
    originalResponse.responseText.substring(0, newContentIndex) +
    restoredContent +
    originalResponse.responseText.substring(newContentIndex + newContent.length);
}

interface FileContents {
  filePath: string;
  content: string;
}

async function restorePartialFiles(files: FileMap, apiKey: string, response: AnthropicResponse) {
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
    const existingContent = getFileContents(files, file.filePath);
    const newContent = file.content;

    if (shouldRestorePartialFile(existingContent, newContent)) {
      await restorePartialFile(existingContent, newContent, apiKey, response);
    }
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

  await restorePartialFiles(files, apiKey, response);

  const { completionTokens, promptTokens, responseText } = response;

  chatController.writeText(responseText);
  chatController.writeUsage({ completionTokens, promptTokens });
}
