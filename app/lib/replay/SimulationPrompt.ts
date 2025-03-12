// Core logic for using simulation data from a remote recording to enhance
// the AI developer prompt.

import type { Message } from 'ai';
import type { SimulationData, SimulationPacket } from './SimulationData';
import { SimulationDataVersion } from './SimulationData';
import { assert, generateRandomId, ProtocolClient } from './ReplayProtocolClient';
import type { MouseData } from './Recording';
import type { FileMap } from '../stores/files';
import { shouldIncludeFile } from '~/utils/fileUtils';
import { DeveloperSystemPrompt } from '../common/prompts/prompts';
import { ensureDevelopmentServerURL } from './DevelopmentServer';
import { workbenchStore } from '../stores/workbench';

function createRepositoryContentsPacket(contents: string): SimulationPacket {
  return {
    kind: "repositoryContents",
    contents,
    time: new Date().toISOString(),
  };
}

type ProtocolMessageRole = "user" | "assistant" | "system";

type ProtocolMessageText = {
  type: "text";
  role: ProtocolMessageRole;
  content: string;
};

type ProtocolMessageImage = {
  type: "image";
  role: ProtocolMessageRole;
  dataURL: string;
};

export type ProtocolMessage = ProtocolMessageText | ProtocolMessageImage;

export type ProtocolFile = {
  path: string;
  content: string;
  base64?: boolean;
};

type ChatResponsePartCallback = (response: string) => void;

interface ChatMessageOptions {
  chatOnly?: boolean;
  developerFiles?: ProtocolFile[];
  onResponsePart?: ChatResponsePartCallback;
}

class ChatManager {
  // Empty if this chat has been destroyed.
  client: ProtocolClient | undefined;

  // Resolves when the chat has started.
  chatIdPromise: Promise<string>;

  // Resolves when the recording has been created.
  recordingIdPromise: Promise<string> | undefined;

  // Whether all simulation data has been sent.
  simulationFinished?: boolean;

  // Any repository contents we sent up for this chat.
  repositoryContents?: string;

  // Simulation data for the page itself and any user interactions.
  pageData: SimulationData = [];

  constructor() {
    this.client = new ProtocolClient();
    this.chatIdPromise = (async () => {
      assert(this.client, "Chat has been destroyed");

      await this.client.initialize();

      const { chatId } = (await this.client.sendCommand({ method: "Nut.startChat", params: {} })) as { chatId: string };

      console.log("ChatStarted", new Date().toISOString(), chatId);

      return chatId;
    })();
  }

  destroy() {
    this.client?.close();
    this.client = undefined;
  }

  async setRepositoryContents(contents: string) {
    assert(this.client, "Chat has been destroyed");
    this.repositoryContents = contents;

    const packet = createRepositoryContentsPacket(contents);

    const chatId = await this.chatIdPromise;
    await this.client.sendCommand({
      method: "Nut.addSimulation",
      params: {
        chatId,
        version: SimulationDataVersion,
        simulationData: [packet],
        completeData: false,
        saveRecording: true,
      },
    });
  }

  async addPageData(data: SimulationData) {
    assert(this.client, "Chat has been destroyed");
    assert(this.repositoryContents, "Expected repository contents");

    this.pageData.push(...data);

    // If page data comes in while we are waiting for the chat to finish
    // we remember it but don't update the existing chat.
    if (this.simulationFinished) {
      return;
    }

    const chatId = await this.chatIdPromise;
    await this.client.sendCommand({
      method: "Nut.addSimulationData",
      params: { chatId, simulationData: data },
    });
  }

  finishSimulationData(): SimulationData {
    assert(this.client, "Chat has been destroyed");
    assert(!this.simulationFinished, "Simulation has been finished");
    assert(this.repositoryContents, "Expected repository contents");

    this.recordingIdPromise = (async () => {
      assert(this.client, "Chat has been destroyed");
  
      const chatId = await this.chatIdPromise;
      const { recordingId } = await this.client.sendCommand({
        method: "Nut.finishSimulationData",
        params: { chatId },
      }) as { recordingId: string | undefined };

      assert(recordingId, "Recording ID not set");
      return recordingId;
    })();  

    const allData = [createRepositoryContentsPacket(this.repositoryContents), ...this.pageData];
    this.simulationFinished = true;
    return allData;
  }

  async sendChatMessage(messages: ProtocolMessage[], options?: ChatMessageOptions) {
    assert(this.client, "Chat has been destroyed");

    const responseId = `response-${generateRandomId()}`;

    let response: string = "";
    const removeResponseListener = this.client.listenForMessage("Nut.chatResponsePart", ({ responseId: eventResponseId, message }: { responseId: string, message: ProtocolMessage }) => {
      if (responseId == eventResponseId) {
        if (message.type == "text") {
          response += message.content;
          options?.onResponsePart?.(message.content);
        }
      }
    });

    const modifiedFiles: ProtocolFile[] = [];
    const removeFileListener = this.client.listenForMessage("Nut.chatModifiedFile", ({ responseId: eventResponseId, file }: { responseId: string, file: ProtocolFile }) => {
      if (responseId == eventResponseId) {
        console.log("ChatModifiedFile", file);
        modifiedFiles.push(file);

        const content = `
        <boltArtifact id="modified-file-${generateRandomId()}" title="File Changes">
        <boltAction type="file" filePath="${file.path}">${file.content}</boltAction>
        </boltArtifact>
        `;

        response += content;
        options?.onResponsePart?.(content);
      }
    });

    const chatId = await this.chatIdPromise;

    console.log("ChatSendMessage", new Date().toISOString(), chatId, JSON.stringify({ messages, developerFiles: options?.developerFiles }));

    await this.client.sendCommand({
      method: "Nut.sendChatMessage",
      params: { chatId, responseId, messages, chatOnly: options?.chatOnly, developerFiles: options?.developerFiles },
    });

    removeResponseListener();
    removeFileListener();

    return response;
  }
}

// There is only one chat active at a time.
let gChatManager: ChatManager | undefined;

function startChat(repositoryContents: string, pageData: SimulationData) {
  if (gChatManager) {
    gChatManager.destroy();
  }
  gChatManager = new ChatManager();

  gChatManager.setRepositoryContents(repositoryContents);
  if (pageData.length) {
    gChatManager.addPageData(pageData);
  }
}

// Called when the repository contents have changed. We'll start a new chat
// with the same interaction data as any existing chat. The remote development
// server will also be updated.
export async function simulationRepositoryUpdated() {
  const { contentBase64: repositoryContents } = await workbenchStore.generateZipBase64();
  startChat(repositoryContents, gChatManager?.pageData ?? []);

  const { contentBase64: injectedContents } = await workbenchStore.generateZipBase64(/* injectRecordingMessageHandler */ true);
  ensureDevelopmentServerURL(injectedContents);
}

// Called when the page gathering interaction data has been reloaded. We'll
// start a new chat with the same repository contents as any existing chat.
export async function simulationReloaded() {
  assert(gChatManager, "Expected to have an active chat");

  const repositoryContents = gChatManager.repositoryContents;
  assert(repositoryContents, "Expected active chat to have repository contents");

  startChat(repositoryContents, []);
}

export async function simulationAddData(data: SimulationData) {
  assert(gChatManager, "Expected to have an active chat");
  gChatManager.addPageData(data);
}

let gLastUserSimulationData: SimulationData | undefined;

export function getLastUserSimulationData(): SimulationData | undefined {
  return gLastUserSimulationData;
}

export async function getSimulationRecording(): Promise<string> {
  assert(gChatManager, "Expected to have an active chat");

  const simulationData = gChatManager.finishSimulationData();

  // The repository contents are part of the problem and excluded from the simulation data
  // reported for solutions.
  gLastUserSimulationData = simulationData.filter(packet => packet.kind != "repositoryContents");

  console.log("SimulationData", new Date().toISOString(), JSON.stringify(simulationData));

  assert(gChatManager.recordingIdPromise, "Expected recording promise");
  return gChatManager.recordingIdPromise;
}

let gLastSimulationChatMessages: ProtocolMessage[] | undefined;

export function getLastSimulationChatMessages(): ProtocolMessage[] | undefined {
  return gLastSimulationChatMessages;
}

const SimulationSystemPrompt = `
The following user message describes a bug or other problem on the page which needs to be fixed.
You must respond with a useful explanation that will help the user understand the source of the problem.
Do not describe the specific fix needed.
`;

export async function getSimulationEnhancedPrompt(
  chatMessages: Message[],
  userMessage: string,
  mouseData: MouseData | undefined
): Promise<string> {
  assert(gChatManager, "Chat not started");
  assert(gChatManager.simulationFinished, "Simulation not finished");

  let system = SimulationSystemPrompt;
  if (mouseData) {
    system += `The user pointed to an element on the page <element selector=${JSON.stringify(mouseData.selector)} height=${mouseData.height} width=${mouseData.width} x=${mouseData.x} y=${mouseData.y} />`;
  }

  const messages: ProtocolMessage[] = [
    {
      role: "system",
      type: "text",
      content: system,
    },
    {
      role: "user",
      type: "text",
      content: userMessage,
    },
  ];

  gLastSimulationChatMessages = messages;

  return await gChatManager.sendChatMessage(messages);
}

export async function shouldUseSimulation(messageInput: string) {
  if (!gChatManager) {
    gChatManager = new ChatManager();
  }

  const systemPrompt = `
You are a helpful assistant that determines whether a user's message that is asking an AI
to make a change to an application should first perform a detailed analysis of the application's
behavior to generate a better answer.

This is most helpful when the user is asking the AI to fix a problem with the application.
When making straightforward improvements to the application a detailed analysis is not necessary.

The text of the user's message will be wrapped in \`<user_message>\` tags. You must describe your
reasoning and then respond with either \`<analyze>true</analyze>\` or \`<analyze>false</analyze>\`.
  `;

  const userMessage = `
Here is the user message you need to evaluate: <user_message>${messageInput}</user_message>
  `;

  const messages: ProtocolMessage[] = [
    {
      role: "system",
      type: "text",
      content: systemPrompt,
    },
    {
      role: "user",
      type: "text",
      content: userMessage,
    },
  ];

  const response = await gChatManager.sendChatMessage(messages, { chatOnly: true });

  console.log("UseSimulationResponse", response);

  const match = /<analyze>(.*?)<\/analyze>/.exec(response);
  if (match) {
    return match[1] === "true";
  }
  return false;
}

function getProtocolRule(message: Message): "user" | "assistant" | "system" {
  switch (message.role) {
    case "user":
      return "user";
    case "assistant":
    case "data":
      return "assistant";
    case "system":
      return "system";
  }
}

function removeBoltArtifacts(text: string): string {
  const OpenTag = "<boltArtifact";
  const CloseTag = "</boltArtifact>";

  while (true) {
    const openTag = text.indexOf(OpenTag);
    if (openTag === -1) {
      break;
    }

    const prefix = text.substring(0, openTag);

    const closeTag = text.indexOf(CloseTag, openTag + OpenTag.length);
    if (closeTag === -1) {
      text = prefix;
    } else {
      text = prefix + text.substring(closeTag + CloseTag.length);
    }
  }
  return text;
}

function buildProtocolMessages(messages: Message[]): ProtocolMessage[] {
  const rv: ProtocolMessage[] = [];
  for (const msg of messages) {
    const role = getProtocolRule(msg);
    if (Array.isArray(msg.content)) {
      for (const content of msg.content) {
        switch (content.type) {
          case "text":
            rv.push({
              role,
              type: "text",
              content: removeBoltArtifacts(content.text),
            });
            break;
          case "image":
            rv.push({
              role,
              type: "image",
              dataURL: content.image,
            });
            break;
          default:
            console.error("Unknown message content", content);
        }
      }
    } else if (typeof msg.content == "string") {
      rv.push({
        role,
        type: "text",
        content: msg.content,
      });
    }
  }
  return rv;
}

export async function sendDeveloperChatMessage(messages: Message[], files: FileMap, onResponsePart: ChatResponsePartCallback) {
  if (!gChatManager) {
    gChatManager = new ChatManager();
  }

  const developerFiles: ProtocolFile[] = [];
  for (const [path, file] of Object.entries(files)) {
    if (file && shouldIncludeFile(path)) {
      developerFiles.push({
        path,
        content: file.content,
      });
    }
  }

  const protocolMessages = buildProtocolMessages(messages);
  protocolMessages.unshift({
    role: "system",
    type: "text",
    content: DeveloperSystemPrompt,
  });

  return gChatManager.sendChatMessage(protocolMessages, { chatOnly: true, developerFiles, onResponsePart });
}
