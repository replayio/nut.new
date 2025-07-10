import { memo, useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import type { BundledLanguage } from 'shiki';
import { createScopedLogger } from '~/utils/logger';
import { rehypePlugins, remarkPlugins, allowedHTMLElements } from '~/utils/markdown';
import { CodeBlock } from './CodeBlock';

import styles from './Markdown.module.scss';

const logger = createScopedLogger('MarkdownComponent');

interface MarkdownProps {
  children: string;
  html?: boolean;
  limitedMarkdown?: boolean;
  onCheckboxChange?: (contents: string, checked: boolean) => void;
}

export const Markdown = memo((props: MarkdownProps) => {
  const { children, html = false, limitedMarkdown = false, onCheckboxChange } = props;

  logger.trace('Render');

  const components = useMemo(() => {
    return {
      div: ({ className, children, node, ...props }) => {
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
      input: ({ checked, ...props }) => {
        if (onCheckboxChange) {
          // remove `disabled` so it becomes interactive
          props = { ...props, disabled: false };
        }

        const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          if (onCheckboxChange) {
            const text = event.target.parentElement!.innerText.trim();
            onCheckboxChange(text, event.target.checked);
          }
        };

        return <input type="checkbox" checked={checked ?? false} onChange={handleChange} {...props} />;
      },
    } satisfies Components;
  }, []);

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
