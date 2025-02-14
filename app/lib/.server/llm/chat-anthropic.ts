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
  responseDescription: string
) {
  const systemPrompt = `
You are a helpful assistant that restores code skipped over by partial updates made by another assistant.

You will be given the existing content for a file and the new content that may contain partial updates.
Your task is to return complete restored content which both reflects the changes made in the new content
and includes any code that was removed from the original file.

Describe any places in the new content where code may have been removed.
ULTRA IMPORTANT: Only remove content that has been skipped due to comments similar to the following:

// rest of the code remains the same.
// this function is unchanged.

ULTRA IMPORTANT: Do not restore content that was intentionally removed by the other assistant.
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

The other assistant's description of its changes is:
<description>
${responseDescription}
</description>
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
    return { restoreCall, restoredContent: newContent };
  }

  const restoredContent = restoreCall.responseText.substring(openTag + OpenTag.length, closeTag);
  return { restoreCall, restoredContent };
}

// Return the english description in a model response, skipping over any artifacts.
function getMessageDescription(responseText: string): string {
  const OpenTag = "<boltArtifact";
  const CloseTag = "</boltArtifact>";

  while (true) {
    const openTag = responseText.indexOf(OpenTag);
    if (openTag === -1) {
      break;
    }

    const prefix = responseText.substring(0, openTag);

    const closeTag = responseText.indexOf(CloseTag, openTag + OpenTag.length);
    if (closeTag === -1) {
      responseText = prefix;
    } else {
      responseText = prefix + responseText.substring(closeTag + CloseTag.length);
    }
  }
  return responseText;
}

async function getLatestPackageVersion(packageName: string) {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
    const data = await response.json() as any;
    if (typeof data.version == "string") {
      return data.version;
    }
  } catch (e) {
    console.error("Error getting latest package version", packageName, e);
  }
  return undefined;
}

function ignorePackageUpgrade(packageName: string) {
  // Don't upgrade react, our support for react 19 isn't complete yet.
  return packageName.startsWith("react");
}

// Upgrade dependencies in package.json to the latest version, instead of the random
// and sometimes ancient versions that the AI picks.
async function upgradePackageJSON(content: string) {
  try {
    const packageJSON = JSON.parse(content);
    for (const key of Object.keys(packageJSON.dependencies)) {
      if (!ignorePackageUpgrade(key)) {
        const version = await getLatestPackageVersion(key);
        if (version) {
          packageJSON.dependencies[key] = version;
        }
      }
    }
    return JSON.stringify(packageJSON, null, 2);
  } catch (e) {
    console.error("Error upgrading package.json", e);
    return content;
  }
}

function replaceFileContents(responseText: string, oldContent: string, newContent: string) {
  const contentIndex = responseText.indexOf(oldContent);

  if (contentIndex === -1) {
    console.error("Old content not found in response", JSON.stringify({ responseText, oldContent }));
    return responseText;
  }

  return responseText.substring(0, contentIndex) +
    newContent +
    responseText.substring(contentIndex + oldContent.length);
}

interface FileContents {
  filePath: string;
  content: string;
}

async function fixupResponseFiles(files: FileMap, apiKey: string, responseText: string) {
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
  const responseDescription = getMessageDescription(responseText);

  const restoreCalls: AnthropicCall[] = [];
  for (const { filePath, content: newContent } of fileContents) {
    const existingContent = getFileContents(files, filePath);

    if (shouldRestorePartialFile(existingContent, newContent)) {
      const { restoreCall, restoredContent } = await restorePartialFile(
        existingContent,
        newContent,
        apiKey,
        responseDescription
      );
      restoreCalls.push(restoreCall);
      responseText = replaceFileContents(responseText, newContent, restoredContent);
    }

    if (filePath.includes("package.json")) {
      const newPackageJSON = await upgradePackageJSON(newContent);
      responseText = replaceFileContents(responseText, newContent, newPackageJSON);
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

  const { responseText, restoreCalls } = await fixupResponseFiles(files, apiKey, mainCall.responseText);

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
