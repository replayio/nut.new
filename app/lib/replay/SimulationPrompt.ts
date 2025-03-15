/*
 * Core logic for using simulation data from a remote recording to enhance
 * the AI developer prompt.
 */

import type { Message } from 'ai';
import type { SimulationData, SimulationPacket } from './SimulationData';
import { simulationDataVersion } from './SimulationData';
import { assert, generateRandomId, ProtocolClient } from './ReplayProtocolClient';
import type { MouseData } from './Recording';
import { developerSystemPrompt } from '~/lib/common/prompts/prompts';
import { updateDevelopmentServer } from './DevelopmentServer';
import { isEnhancedPromptMessage } from '~/components/chat/Chat.client';

function createRepositoryIdPacket(repositoryId: string): SimulationPacket {
  return {
    kind: 'repositoryId',
    repositoryId,
    time: new Date().toISOString(),
  };
}

type ProtocolMessageRole = 'user' | 'assistant' | 'system';

type ProtocolMessageText = {
  type: 'text';
  role: ProtocolMessageRole;
  content: string;
};

type ProtocolMessageImage = {
  type: 'image';
  role: ProtocolMessageRole;
  dataURL: string;
};

export type ProtocolMessage = ProtocolMessageText | ProtocolMessageImage;

type ChatResponsePartCallback = (response: string) => void;

type ChatMessageMode = 'recording' | 'static' | 'developer';

interface ChatMessageOptions {
  baseRepositoryId?: string;
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

  // Any repository ID we specified for this chat.
  repositoryId?: string;

  // Simulation data for the page itself and any user interactions.
  pageData: SimulationData = [];

  constructor() {
    this.client = new ProtocolClient();
    this.chatIdPromise = (async () => {
      assert(this.client, 'Chat has been destroyed');

      await this.client.initialize();

      const { chatId } = (await this.client.sendCommand({ method: 'Nut.startChat', params: {} })) as { chatId: string };

      console.log('ChatStarted', new Date().toISOString(), chatId);

      return chatId;
    })();
  }

  isValid() {
    return !!this.client;
  }

  destroy() {
    this.client?.close();
    this.client = undefined;
  }

  async setRepositoryId(repositoryId: string) {
    assert(this.client, 'Chat has been destroyed');
    this.repositoryId = repositoryId;

    const packet = createRepositoryIdPacket(repositoryId);

    const chatId = await this.chatIdPromise;
    await this.client.sendCommand({
      method: 'Nut.addSimulation',
      params: {
        chatId,
        version: simulationDataVersion,
        simulationData: [packet],
        completeData: false,
        saveRecording: true,
      },
    });
  }

  async addPageData(data: SimulationData) {
    assert(this.client, 'Chat has been destroyed');
    assert(this.repositoryId, 'Expected repository ID');

    this.pageData.push(...data);

    /*
     * If page data comes in while we are waiting for the chat to finish
     * we remember it but don't update the existing chat.
     */
    if (this.simulationFinished) {
      return;
    }

    const chatId = await this.chatIdPromise;
    await this.client.sendCommand({
      method: 'Nut.addSimulationData',
      params: { chatId, simulationData: data },
    });
  }

  finishSimulationData(): SimulationData {
    assert(this.client, 'Chat has been destroyed');
    assert(!this.simulationFinished, 'Simulation has been finished');
    assert(this.repositoryId, 'Expected repository ID');

    this.recordingIdPromise = (async () => {
      assert(this.client, 'Chat has been destroyed');

      const chatId = await this.chatIdPromise;
      const { recordingId } = (await this.client.sendCommand({
        method: 'Nut.finishSimulationData',
        params: { chatId },
      })) as { recordingId: string | undefined };

      assert(recordingId, 'Recording ID not set');

      return recordingId;
    })();

    const allData = [createRepositoryIdPacket(this.repositoryId), ...this.pageData];
    this.simulationFinished = true;

    return allData;
  }

  async sendChatMessage(mode: ChatMessageMode, messages: ProtocolMessage[], options?: ChatMessageOptions) {
    assert(this.client, 'Chat has been destroyed');

    const responseId = `response-${generateRandomId()}`;

    let response: string = '';
    const removeResponseListener = this.client.listenForMessage(
      'Nut.chatResponsePart',
      ({ responseId: eventResponseId, message }: { responseId: string; message: ProtocolMessage }) => {
        if (responseId == eventResponseId) {
          if (message.type == 'text') {
            response += message.content;
            options?.onResponsePart?.(message.content);
          }
        }
      },
    );

    const chatId = await this.chatIdPromise;

    console.log(
      'ChatSendMessage',
      new Date().toISOString(),
      chatId,
      JSON.stringify({ mode, messages, baseRepositoryId: options?.baseRepositoryId }),
    );

    const { repositoryId } = (await this.client.sendCommand({
      method: 'Nut.sendChatMessage',
      params: { chatId, responseId, mode, messages, baseRepositoryId: options?.baseRepositoryId },
    })) as { repositoryId?: string };

    console.log('ChatResponse', chatId, repositoryId, response);

    removeResponseListener();

    return { response, repositoryId };
  }
}

// There is only one chat active at a time.
let gChatManager: ChatManager | undefined;

function startChat(repositoryId: string, pageData: SimulationData) {
  if (gChatManager) {
    gChatManager.destroy();
  }

  gChatManager = new ChatManager();

  gChatManager.setRepositoryId(repositoryId);

  if (pageData.length) {
    gChatManager.addPageData(pageData);
  }
}

/*
 * Called when the repository has changed. We'll start a new chat
 * and update the remote development server.
 */
export function simulationRepositoryUpdated(repositoryId: string) {
  startChat(repositoryId, []);
  updateDevelopmentServer(repositoryId);
}

/*
 * Called when the page gathering interaction data has been reloaded. We'll
 * start a new chat with the same repository contents as any existing chat.
 */
export async function simulationReloaded() {
  assert(gChatManager, 'Expected to have an active chat');

  const repositoryId = gChatManager.repositoryId;
  assert(repositoryId, 'Expected active chat to have repository ID');

  startChat(repositoryId, []);
}

export async function simulationAddData(data: SimulationData) {
  assert(gChatManager, 'Expected to have an active chat');
  gChatManager.addPageData(data);
}

let gLastUserSimulationData: SimulationData | undefined;

export function getLastUserSimulationData(): SimulationData | undefined {
  return gLastUserSimulationData;
}

export async function getSimulationRecording(): Promise<string> {
  assert(gChatManager, 'Expected to have an active chat');

  const simulationData = gChatManager.finishSimulationData();

  /*
   * The repository contents are part of the problem and excluded from the simulation data
   * reported for solutions.
   */
  gLastUserSimulationData = simulationData.filter((packet) => packet.kind != 'repositoryId');

  console.log('SimulationData', new Date().toISOString(), JSON.stringify(simulationData));

  assert(gChatManager.recordingIdPromise, 'Expected recording promise');

  return gChatManager.recordingIdPromise;
}

export function isSimulatingOrHasFinished(): boolean {
  return gChatManager?.isValid() ?? false;
}

export async function getSimulationRecordingId(): Promise<string> {
  assert(gChatManager, 'Chat not started');
  assert(gChatManager.recordingIdPromise, 'Expected recording promise');

  return gChatManager.recordingIdPromise;
}

let gLastSimulationChatMessages: ProtocolMessage[] | undefined;

export function getLastSimulationChatMessages(): ProtocolMessage[] | undefined {
  return gLastSimulationChatMessages;
}

const simulationSystemPrompt = `
The following user message describes a bug or other problem on the page which needs to be fixed.
You must respond with a useful explanation that will help the user understand the source of the problem.
Do not describe the specific fix needed.
`;

export async function getSimulationEnhancedPrompt(
  chatMessages: Message[],
  userMessage: string,
  mouseData: MouseData | undefined,
): Promise<string> {
  assert(gChatManager, 'Chat not started');
  assert(gChatManager.simulationFinished, 'Simulation not finished');

  let system = simulationSystemPrompt;

  if (mouseData) {
    system += `The user pointed to an element on the page <element selector=${JSON.stringify(mouseData.selector)} height=${mouseData.height} width=${mouseData.width} x=${mouseData.x} y=${mouseData.y} />`;
  }

  const messages: ProtocolMessage[] = [
    {
      role: 'system',
      type: 'text',
      content: system,
    },
    {
      role: 'user',
      type: 'text',
      content: userMessage,
    },
  ];

  gLastSimulationChatMessages = messages;

  const { response } = await gChatManager.sendChatMessage('recording', messages);

  return response;
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
      role: 'system',
      type: 'text',
      content: systemPrompt,
    },
    {
      role: 'user',
      type: 'text',
      content: userMessage,
    },
  ];

  const { response } = await gChatManager.sendChatMessage('static', messages);

  console.log('UseSimulationResponse', response);

  const match = /<analyze>(.*?)<\/analyze>/.exec(response);

  if (match) {
    return match[1] === 'true';
  }

  return false;
}

function getProtocolRole(message: Message): 'user' | 'assistant' | 'system' {
  switch (message.role) {
    case 'user':
      return 'user';
    case 'assistant':
    case 'data':
      return 'assistant';
    case 'system':
      return 'system';
    default:
      throw new Error(`Unknown message role: ${message.role}`);
  }
}

function removeBoltArtifacts(text: string): string {
  const openTag = '<boltArtifact';
  const closeTag = '</boltArtifact>';

  while (true) {
    const openTagIndex = text.indexOf(openTag);

    if (openTagIndex === -1) {
      break;
    }

    const prefix = text.substring(0, openTagIndex);

    const closeTagIndex = text.indexOf(closeTag, openTagIndex + openTag.length);

    if (closeTagIndex === -1) {
      text = prefix;
    } else {
      text = prefix + text.substring(closeTagIndex + closeTag.length);
    }
  }

  return text;
}

function buildProtocolMessages(messages: Message[]): ProtocolMessage[] {
  const rv: ProtocolMessage[] = [];

  for (const msg of messages) {
    const role = getProtocolRole(msg);

    if (Array.isArray(msg.content)) {
      for (const content of msg.content) {
        switch (content.type) {
          case 'text':
            rv.push({
              role,
              type: 'text',
              content: removeBoltArtifacts(content.text),
            });
            break;
          case 'image':
            rv.push({
              role,
              type: 'image',
              dataURL: content.image,
            });
            break;
          default:
            console.error('Unknown message content', content);
        }
      }
    } else if (typeof msg.content == 'string') {
      rv.push({
        role,
        type: 'text',
        content: msg.content,
      });
    }
  }

  return rv;
}

function messagesHaveEnhancedPrompt(messages: Message[]): boolean {
  const lastEnhancedPromptMessage = messages.findLastIndex((msg) => isEnhancedPromptMessage(msg));

  if (lastEnhancedPromptMessage == -1) {
    return false;
  }

  const lastUserMessage = messages.findLastIndex((msg) => msg.role == 'user');

  if (lastUserMessage == -1) {
    return false;
  }

  return lastUserMessage < lastEnhancedPromptMessage;
}

export async function sendDeveloperChatMessage(
  messages: Message[],
  baseRepositoryId: string | undefined,
  onResponsePart: ChatResponsePartCallback,
) {
  if (!gChatManager) {
    gChatManager = new ChatManager();
  }

  let systemPrompt = developerSystemPrompt;

  if (messagesHaveEnhancedPrompt(messages)) {
    // Add directions to the LLM when we have an enhanced prompt describing the bug to fix.
    const systemEnhancedPrompt = `
ULTRA IMPORTANT: You have been given a detailed description of a bug you need to fix.
Focus specifically on fixing this bug. Do not guess about other problems.
    `;
    systemPrompt += systemEnhancedPrompt;
  }

  const protocolMessages = buildProtocolMessages(messages);
  protocolMessages.unshift({
    role: 'system',
    type: 'text',
    content: systemPrompt,
  });

  const { repositoryId } = await gChatManager.sendChatMessage('developer', protocolMessages, {
    baseRepositoryId,
    onResponsePart,
  });

  return repositoryId;
}
