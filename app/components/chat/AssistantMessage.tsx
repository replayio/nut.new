import { memo } from 'react';
import { Markdown } from './Markdown';
import type { JSONValue } from 'ai';
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

export const AssistantMessage = memo(({ content, annotations }: AssistantMessageProps) => {
  const usage = getAnnotationsTokensUsage(annotations);

  return (
    <div className="overflow-hidden w-full">
      {usage && (
        <div 
          className="text-sm text-bolt-elements-textSecondary mb-2"
        >
          Tokens: {usage.totalTokens} (prompt: {usage.promptTokens}, completion: {usage.completionTokens})
        </div>
      )}
      <Markdown html>{content}</Markdown>
    </div>
  );
});
