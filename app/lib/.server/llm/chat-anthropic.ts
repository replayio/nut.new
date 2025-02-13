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

export interface AnthropicCall {
  systemPrompt: string;
  messages: MessageParam[];
  responseText: string;
  completionTokens: number;
  promptTokens: number;
}

async function callAnthropic(apiKey: string, systemPrompt: string, messages: MessageParam[]): Promise<AnthropicCall> {
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
    systemPrompt,
    messages,
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

async function restorePartialFile(
  existingContent: string,
  newContent: string,
  apiKey: string,
  mainResponseText: string
) {
  const systemPrompt = `
You are a helpful assistant that restores the content of a file to reflect partial updates made by another assistant.

You will be given the existing content for a file and the new content that may contain partial updates.
Your task is to return complete restored content which both reflects the changes made in the new content
and includes any code that was removed from the original file.

Describe any places in the new content where code may have been removed.
ULTRA IMPORTANT: The restored content should be returned in the following format:

<restoredContent>
Restored content goes here
</restoredContent>
  `;

  const userPrompt = `
The existing content for the file is:

<existingContent>
${existingContent}
</existingContent>

The new content that may contain partial updates is:

<newContent>
${newContent}
</newContent>
  `;

  const messages: MessageParam[] = [
    {
      role: "user",
      content: userPrompt,
    },
  ];

  const restoreCall = await callAnthropic(apiKey, systemPrompt, messages);

  const OpenTag = "<restoredContent>";
  const CloseTag = "</restoredContent>";
  const openTag = restoreCall.responseText.indexOf(OpenTag);
  const closeTag = restoreCall.responseText.indexOf(CloseTag);

  if (openTag === -1 || closeTag === -1) {
    console.error("Invalid restored content");
    return { restoreCall, newResponseText: mainResponseText };
  }

  const restoredContent = restoreCall.responseText.substring(openTag + OpenTag.length, closeTag);
  const newContentIndex = mainResponseText.indexOf(newContent);

  if (newContentIndex === -1) {
    console.error("New content not found in response");
    return { restoreCall, newResponseText: mainResponseText };
  }

  const newResponseText =
    mainResponseText.substring(0, newContentIndex) +
    restoredContent +
    mainResponseText.substring(newContentIndex + newContent.length);

  return { restoreCall, newResponseText };
}

interface FileContents {
  filePath: string;
  content: string;
}

async function restorePartialFiles(files: FileMap, apiKey: string, responseText: string) {
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

  messageParser.parse("restore-partial-files-message-id", responseText);

  const restoreCalls: AnthropicCall[] = [];
  for (const file of fileContents) {
    const existingContent = getFileContents(files, file.filePath);
    const newContent = file.content;

    if (shouldRestorePartialFile(existingContent, newContent)) {
      const { restoreCall, newResponseText } = await restorePartialFile(existingContent, newContent, apiKey, responseText);
      restoreCalls.push(restoreCall);
      responseText = newResponseText;
    }
  }

  return { responseText, restoreCalls };
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

  const mainCall = await callAnthropic(apiKey, systemPrompt, messageParams);

  const { responseText, restoreCalls } = await restorePartialFiles(files, apiKey, mainCall.responseText);

  chatController.writeText(responseText);

  const callInfos = [mainCall, ...restoreCalls];

  let completionTokens = 0;
  let promptTokens = 0;
  for (const callInfo of callInfos) {
    completionTokens += callInfo.completionTokens;
    promptTokens += callInfo.promptTokens;
  }

  chatController.writeUsage({ callInfos, completionTokens, promptTokens });
}
