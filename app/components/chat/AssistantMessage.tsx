import { memo } from 'react';
import { Markdown } from './Markdown';
import type { JSONValue } from 'ai';
import type { ChatAnthropicInfo, AnthropicCall } from '~/lib/.server/llm/chat-anthropic';
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages/messages.mjs';
import { toast } from 'react-toastify';

interface AssistantMessageProps {
  content: string;
  annotations?: JSONValue[];
}

export function getAnnotationsTokensUsage(annotations: JSONValue[] | undefined) {
  const filteredAnnotations = (annotations?.filter(
    (annotation: JSONValue) => annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
  ) || []) as { type: string; value: any }[];

  const usage: {
    chatInfo: ChatAnthropicInfo;
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
  } = filteredAnnotations.find((annotation) => annotation.type === 'usage')?.value;

  return usage;
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

function describeChatInfo(chatInfo: ChatAnthropicInfo) {
  let text = "";

  function appendCall(call: AnthropicCall) {
    text += "************************************************\n";
    text += "AnthropicMessageSend\n";
    text += "Message system:\n";
    text += call.systemPrompt;
    for (const message of call.messages) {
      text += `Message ${message.role}:\n`;
      text += flatMessageContent(message.content);
    }
    text += "Response:\n";
    text += call.responseText;
    text += "\n";
    text += `Tokens ${call.completionTokens + call.promptTokens}\n`;
    text += "************************************************\n";
  }

  appendCall(chatInfo.mainCall);
  for (const call of chatInfo.restoreCalls) {
    appendCall(call);
  }

  for (const info of chatInfo.infos) {
    text += info;
  }

  return text;
}

export const AssistantMessage = memo(({ content, annotations }: AssistantMessageProps) => {
  const usage = getAnnotationsTokensUsage(annotations);

  const onUsageClicked = () => {
    if (!usage.chatInfo) {
      toast.error("No chat info found");
      return;
    }
    const text = describeChatInfo(usage.chatInfo);
    
    // Create a blob with the text content
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Open the blob URL in a new window
    window.open(url);
    
    // Clean up the blob URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <div className="overflow-hidden w-full">
      {usage && (
        <div 
          className="text-sm text-bolt-elements-textSecondary mb-2 cursor-pointer hover:underline"
          onClick={onUsageClicked}
          title="View call information"
        >
          Tokens: {usage.totalTokens} (prompt: {usage.promptTokens}, completion: {usage.completionTokens})
        </div>
      )}
      <Markdown html>{content}</Markdown>
    </div>
  );
});
