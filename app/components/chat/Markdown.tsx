import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import type { BundledLanguage } from 'shiki';
import { createScopedLogger } from '~/utils/logger';
import { rehypePlugins, remarkPlugins, allowedHTMLElements } from '~/utils/markdown';
import { CodeBlock } from './CodeBlock';

import styles from './Markdown.module.scss';
import type { ChatMessageParams } from './ChatComponent/components/ChatImplementer/ChatImplementer';
import { ChatMode } from '~/lib/replay/SendChatMessage';

const logger = createScopedLogger('MarkdownComponent');

interface MarkdownProps {
  children: string;
  html?: boolean;
  limitedMarkdown?: boolean;
  onCheckboxChange?: (contents: string, checked: boolean) => void;
  onChecklistSubmit?: (params: ChatMessageParams) => void;
}

export const Markdown = memo((props: MarkdownProps) => {
  const { children, html = false, limitedMarkdown = false, onCheckboxChange, onChecklistSubmit } = props;

  logger.trace('Render');

  const [totalCheckboxes, setTotalCheckboxes] = useState(0);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const registerCheckbox = useCallback(() => {
    setTotalCheckboxes((prev) => prev + 1);
    return () => setTotalCheckboxes((prev) => Math.max(0, prev - 1));
  }, []);

  const handleChecklistSubmit = useCallback(() => {
    if (onChecklistSubmit) {
      onChecklistSubmit({
        chatMode: ChatMode.UserMessage,
        messageInput: Array.from(checkedItems).join('\n'),
      });
    }
  }, [onChecklistSubmit, checkedItems]);

  const components = useMemo(() => {
    const CheckboxRenderer: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { checked?: boolean }> = ({
      checked,
      ...props
    }) => {
      useEffect(() => registerCheckbox(), [registerCheckbox]);

      const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (onCheckboxChange) {
          const listItem = event.target.closest('li');
          if (listItem) {
            const text = listItem.textContent?.trim() || '';
            onCheckboxChange(text, event.target.checked);
          }
        }

        const listItem = event.target.closest('li');
        const text = listItem ? listItem.textContent?.trim() || '' : '';
        setCheckedItems((prev) => {
          const next = new Set(prev);
          if (event.target.checked) {
            if (text) {
              next.add(text);
            }
          } else {
            if (text) {
              next.delete(text);
            }
          }
          return next;
        });
      };

      return (
        <div className="relative checkbox-container">
          <input type="checkbox" checked={checked ?? false} onChange={handleChange} className="peer" {...props} />
          <svg
            className="absolute left-0 w-5 h-5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white transition-opacity duration-200"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      );
    };

    return {
      div: ({ className, children, ...props }) => {
        return (
          <div className={className} {...props}>
            {children}
          </div>
        );
      },
      pre: (props) => {
        const { children, node, ...rest } = props;

        const [firstChild] = node?.children ?? [];

        if (
          firstChild &&
          firstChild.type === 'element' &&
          firstChild.tagName === 'code' &&
          firstChild.children[0].type === 'text'
        ) {
          const { className, ...rest } = firstChild.properties;
          const [, language = 'plaintext'] = /language-(\w+)/.exec(String(className) || '') ?? [];

          return <CodeBlock code={firstChild.children[0].value} language={language as BundledLanguage} {...rest} />;
        }

        return <pre {...rest}>{children}</pre>;
      },
      input: ({ type, checked, ...props }) => {
        if (type === 'checkbox') {
          if (onCheckboxChange) {
            props = { ...props, disabled: false };
          }
          return <CheckboxRenderer checked={checked} {...props} />;
        }
        return <input type={type} checked={checked} {...props} />;
      },
      li: ({ children, ...props }) => {
        const handleLiClick = (event: React.MouseEvent<HTMLLIElement>) => {
          // Find checkbox in this list item
          const checkbox = event.currentTarget.querySelector('input[type="checkbox"]') as HTMLInputElement;
          if (checkbox && !checkbox.disabled) {
            // Don't trigger if the checkbox itself or the SVG was clicked
            const target = event.target as HTMLElement;
            if (target !== checkbox && !target.closest('svg')) {
              checkbox.click();
            }
          }
        };

        return (
          <li {...props} onClick={handleLiClick}>
            {children}
          </li>
        );
      },
    } satisfies Components;
  }, [onCheckboxChange, registerCheckbox]);

  const hasCheckboxes = totalCheckboxes > 0;

  return (
    <div>
      <ReactMarkdown
        allowedElements={allowedHTMLElements}
        className={styles.MarkdownContent}
        components={components}
        remarkPlugins={remarkPlugins(limitedMarkdown)}
        rehypePlugins={rehypePlugins(html)}
      >
        {children}
      </ReactMarkdown>
      {hasCheckboxes && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleChecklistSubmit}
            disabled={checkedItems.size === 0 || !onCheckboxChange}
            className="px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500 hover:bg-blue-600 text-white"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
});
