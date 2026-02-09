import { memo, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import type { BundledLanguage } from 'shiki';
import { rehypePlugins, remarkPlugins, allowedHTMLElements } from '~/utils/markdown';
import { CodeBlock } from '~/components/chat/CodeBlock';
import { CheckboxForm, parseCheckboxContent } from '~/components/chat/CheckboxForm';
import type { ChatMessageParams } from '~/components/chat/ChatComponent/components/ChatImplementer/ChatImplementer';
import type { Message } from '~/lib/persistence/message';

import styles from '~/components/chat/Markdown.module.scss';

interface MarkdownWithCheckboxesProps {
  children: string;
  html?: boolean;
  limitedMarkdown?: boolean;
  message?: Message;
  existingSelections?: string[];
  isReadOnly?: boolean;
  onChecklistSubmit?: (params: ChatMessageParams) => void;
}

export const MarkdownWithCheckboxes = memo((props: MarkdownWithCheckboxesProps) => {
  const {
    children,
    html = false,
    limitedMarkdown = false,
    message,
    existingSelections,
    isReadOnly = false,
    onChecklistSubmit,
  } = props;

  // Parse the content to check for checkboxes
  const parsed = useMemo(() => parseCheckboxContent(children), [children]);

  // Components for ReactMarkdown (without checkbox handling - just basic markdown)
  const components = useMemo(
    () => ({
      pre: (props: any) => {
        const { children, node, ...rest } = props;

        const [firstChild] = node?.children ?? [];

        if (
          firstChild &&
          firstChild.type === 'element' &&
          firstChild.tagName === 'code' &&
          firstChild.children[0].type === 'text'
        ) {
          const { className, ...restProps } = firstChild.properties;
          const [, language = 'plaintext'] = /language-(\w+)/.exec(String(className) || '') ?? [];

          return (
            <CodeBlock code={firstChild.children[0].value} language={language as BundledLanguage} {...restProps} />
          );
        }

        return <pre {...rest}>{children}</pre>;
      },
    }),
    [],
  );

  // Handle submission - wrap it to also include the message ID context if needed
  const handleSubmit = useCallback(
    (params: ChatMessageParams) => {
      if (onChecklistSubmit) {
        onChecklistSubmit(params);
      }
    },
    [onChecklistSubmit],
  );

  // If there are checkboxes, render with the CheckboxForm
  if (parsed.hasCheckboxes) {
    return (
      <div className="markdown-with-checkboxes">
        {/* Render content before checkboxes */}
        {parsed.beforeContent && (
          <div className="prose prose-sm max-w-none text-foreground mb-4">
            <ReactMarkdown
              allowedElements={allowedHTMLElements}
              className={styles.MarkdownContent}
              components={components}
              remarkPlugins={remarkPlugins(limitedMarkdown)}
              rehypePlugins={rehypePlugins(html)}
            >
              {parsed.beforeContent}
            </ReactMarkdown>
          </div>
        )}

        {/* Render the checkbox form */}
        <CheckboxForm
          content={children}
          messageId={message?.id ?? 'unknown'}
          existingSelections={existingSelections}
          isReadOnly={isReadOnly}
          onSubmit={handleSubmit}
        />

        {/* Render content after checkboxes */}
        {parsed.afterContent && (
          <div className="prose prose-sm max-w-none text-foreground mt-4">
            <ReactMarkdown
              allowedElements={allowedHTMLElements}
              className={styles.MarkdownContent}
              components={components}
              remarkPlugins={remarkPlugins(limitedMarkdown)}
              rehypePlugins={rehypePlugins(html)}
            >
              {parsed.afterContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  }

  // No checkboxes - render plain markdown
  return (
    <ReactMarkdown
      allowedElements={allowedHTMLElements}
      className={styles.MarkdownContent}
      components={components}
      remarkPlugins={remarkPlugins(limitedMarkdown)}
      rehypePlugins={rehypePlugins(html)}
    >
      {children}
    </ReactMarkdown>
  );
});

MarkdownWithCheckboxes.displayName = 'MarkdownWithCheckboxes';

export default MarkdownWithCheckboxes;
