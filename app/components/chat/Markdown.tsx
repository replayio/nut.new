import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import type { BundledLanguage } from 'shiki';
import { createScopedLogger } from '~/utils/logger';
import { rehypePlugins, remarkPlugins, allowedHTMLElements } from '~/utils/markdown';
import { CodeBlock } from './CodeBlock';
import { Button } from '~/components/ui/button';

import styles from './Markdown.module.scss';
import type { ChatMessageParams } from './ChatComponent/components/ChatImplementer/ChatImplementer';
import { ChatMode } from '~/lib/replay/SendChatMessage';
import type { Message } from '~/lib/persistence/message';
import { getCheckedOptions } from '~/utils/chat/checkboxInteraction';

const logger = createScopedLogger('MarkdownComponent');

interface MarkdownProps {
  children: string;
  html?: boolean;
  limitedMarkdown?: boolean;
  message?: Message;
  messages?: Message[];
  onCheckboxChange?: (contents: string, checked: boolean) => void;
  onChecklistSubmit?: (params: ChatMessageParams) => void;
}

export const Markdown = memo((props: MarkdownProps) => {
  const {
    children,
    html = false,
    limitedMarkdown = false,
    message,
    messages = [],
    onCheckboxChange,
    onChecklistSubmit,
  } = props;

  logger.trace('Render');

  // Get previously checked options from future messages (read-only, for display)
  const previouslyCheckedOptions = useMemo(() => {
    if (!message || messages.length === 0) {
      return new Set<string>();
    }
    try {
      const checked = getCheckedOptions(message, messages);
      return new Set(checked);
    } catch (error) {
      logger.error('Error getting checked options:', error);
      return new Set<string>();
    }
  }, [message, messages]);

  const [totalCheckboxes, setTotalCheckboxes] = useState(0);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const registerCheckbox = useCallback(() => {
    setTotalCheckboxes((prev) => prev + 1);
    return () => setTotalCheckboxes((prev) => Math.max(0, prev - 1));
  }, []);

  const handleChecklistSubmit = useCallback(() => {
    if (onChecklistSubmit) {
      // The checkedItems should already contain original text from data-original-text
      // Just use them directly
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
      const checkboxRef = React.useRef<HTMLInputElement>(null);
      const [optionText, setOptionText] = React.useState<string>('');
      const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

      useEffect(() => {
        registerCheckbox();

        // Extract option text from parent list item after mount
        // Use a small delay to ensure DOM manipulation in li component has completed
        const timeoutId = setTimeout(() => {
          if (checkboxRef.current) {
            const listItem = checkboxRef.current.closest('li') as HTMLElement | null;
            if (listItem) {
              // Use original text from data attribute if available (for split text), otherwise use textContent
              const text = listItem.dataset.originalText || listItem.textContent?.trim() || '';
              if (text) {
                setOptionText(text);
                // Force re-render to update checked state
                forceUpdate();
              }
            }
          }
        }, 50); // Slightly longer delay to ensure DOM manipulation completes

        // Also set up a MutationObserver to watch for data-original-text changes
        const observer = new MutationObserver(() => {
          if (checkboxRef.current) {
            const listItem = checkboxRef.current.closest('li') as HTMLElement | null;
            if (listItem && listItem.dataset.originalText && !optionText) {
              setOptionText(listItem.dataset.originalText);
              forceUpdate();
            }
          }
        });

        if (checkboxRef.current) {
          const listItem = checkboxRef.current.closest('li');
          if (listItem) {
            observer.observe(listItem, {
              attributes: true,
              attributeFilter: ['data-original-text'],
            });
          }
        }

        return () => {
          clearTimeout(timeoutId);
          observer.disconnect();
        };
      }, [registerCheckbox, optionText]);

      // Determine if this checkbox should be checked
      // Priority: 1) User's current selections (checkedItems), 2) Previously checked from future messages, 3) default checked prop
      const getOptionText = () => {
        if (optionText) {
          return optionText;
        }
        if (checkboxRef.current) {
          const listItem = checkboxRef.current.closest('li') as HTMLElement | null;
          if (listItem) {
            // Use original text from data attribute if available (for split text), otherwise use textContent
            return listItem.dataset.originalText || listItem.textContent?.trim() || '';
          }
        }
        return '';
      };

      const currentOptionText = getOptionText();
      
      // Normalize the text for comparison (remove extra whitespace, handle variations, strip markdown formatting)
      const normalizeText = (text: string) => {
        // Remove markdown formatting (**, __, etc.) and normalize whitespace
        return text
          .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markdown
          .replace(/\*([^*]+)\*/g, '$1') // Remove italic markdown
          .replace(/__([^_]+)__/g, '$1') // Remove bold markdown (underscores)
          .replace(/_([^_]+)_/g, '$1') // Remove italic markdown (underscores)
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      };
      
      const normalizedCurrentText = normalizeText(currentOptionText);
      const isCheckedFromUser = normalizedCurrentText
        ? Array.from(checkedItems).some((item) => normalizeText(item) === normalizedCurrentText)
        : false;
      const isCheckedFromPrevious = normalizedCurrentText
        ? Array.from(previouslyCheckedOptions).some((item) => normalizeText(item) === normalizedCurrentText)
        : false;
      const isChecked = isCheckedFromUser || isCheckedFromPrevious || (checked ?? false);

      const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const listItem = event.target.closest('li');
        if (!listItem) return;

        // Use original text from data attribute if available (for split text), otherwise use textContent
        const text = (listItem as HTMLElement).dataset.originalText || listItem.textContent?.trim() || '';

        if (onCheckboxChange) {
          onCheckboxChange(text, event.target.checked);
        }

        // Update local state for user selections (this takes precedence over previous selections)
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
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={isChecked}
            onChange={handleChange}
            className="peer"
            {...props}
          />
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
        const liRef = React.useRef<HTMLLIElement>(null);
        const [hasCheckbox, setHasCheckbox] = React.useState(false);

        React.useEffect(() => {
          if (liRef.current) {
            const checkbox = liRef.current.querySelector('input[type="checkbox"]');
            setHasCheckbox(!!checkbox);

            // Process content to split title and description for checkbox items
            if (checkbox) {
              // IMPORTANT: Capture original text BEFORE any DOM manipulation
              // This ensures checkbox matching works correctly
              // We need to get the text content excluding the checkbox itself
              if (!liRef.current.hasAttribute('data-original-text')) {
                // Clone the list item to get text without checkbox
                const clone = liRef.current.cloneNode(true) as HTMLElement;
                const checkboxClone = clone.querySelector('input[type="checkbox"]');
                if (checkboxClone) {
                  checkboxClone.remove();
                }
                // Also remove the checkbox container if it exists
                const containerClone = clone.querySelector('.checkbox-container');
                if (containerClone) {
                  containerClone.remove();
                }
                const originalText = clone.textContent?.trim() || '';
                if (originalText) {
                  liRef.current.setAttribute('data-original-text', originalText);
                }
              }

              // Find all content nodes except the checkbox
              const contentNodes: Node[] = [];
              const walker = document.createTreeWalker(
                liRef.current,
                NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
                {
                  acceptNode: (node) => {
                    // Skip checkbox and its container
                    if (node.nodeType === Node.ELEMENT_NODE) {
                      const el = node as Element;
                      if (el.closest('.checkbox-container') || el.tagName === 'INPUT') {
                        return NodeFilter.FILTER_REJECT;
                      }
                    }
                    return NodeFilter.FILTER_ACCEPT;
                  },
                },
              );

              let node;
              while ((node = walker.nextNode())) {
                contentNodes.push(node);
              }

              // Find the content wrapper or create one
              let contentWrapper = liRef.current.querySelector(`.${styles.checkboxContentWrapper}`);
              if (!contentWrapper) {
                // Create wrapper div
                contentWrapper = document.createElement('div');
                contentWrapper.className = styles.checkboxContentWrapper;

                // Move all content nodes into wrapper
                contentNodes.forEach((node) => {
                  if (node.parentNode) {
                    const parentEl = node.parentNode as Element;
                    if (!parentEl.closest || !parentEl.closest('.checkbox-container')) {
                      contentWrapper!.appendChild(node.cloneNode(true));
                      node.parentNode.removeChild(node);
                    }
                  }
                });

                // Insert wrapper after checkbox
                const checkboxContainer = checkbox.closest('.checkbox-container') || checkbox.parentElement;
                if (checkboxContainer && checkboxContainer.nextSibling) {
                  liRef.current.insertBefore(contentWrapper, checkboxContainer.nextSibling);
                } else {
                  liRef.current.appendChild(contentWrapper);
                }
              }

              // Process the wrapper content to split title and description
              if (contentWrapper) {
                const fullText = contentWrapper.textContent || '';
                const strongTag = contentWrapper.querySelector('strong');

                if (strongTag && fullText.includes(' - ')) {
                  const titleText = strongTag.textContent || '';
                  // Extract description: everything after the dash, removing title text
                  const descriptionMatch = fullText.match(/-\s*(.+)$/);
                  const descriptionText = descriptionMatch ? descriptionMatch[1].trim() : '';

                  if (descriptionText) {
                    // Ensure original text is stored (should already be set above, but double-check)
                    if (!liRef.current.hasAttribute('data-original-text')) {
                      liRef.current.setAttribute('data-original-text', fullText.trim());
                    }

                    // Clear and rebuild with proper structure
                    contentWrapper.innerHTML = '';
                    
                    // Add title in a div
                    const titleDiv = document.createElement('div');
                    const titleEl = document.createElement('strong');
                    titleEl.textContent = titleText;
                    titleDiv.appendChild(titleEl);
                    contentWrapper.appendChild(titleDiv);

                    // Add description in a div
                    const descDiv = document.createElement('div');
                    descDiv.textContent = descriptionText;
                    contentWrapper.appendChild(descDiv);
                  }
                }
              }
            }
          }
        }, [children]);

        const handleLiClick = (event: React.MouseEvent<HTMLLIElement>) => {
          // Only handle clicks if this list item contains a checkbox
          if (!hasCheckbox) {
            return;
          }

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
          <li ref={liRef} {...props} onClick={hasCheckbox ? handleLiClick : undefined}>
            {children}
          </li>
        );
      },
    } satisfies Components;
  }, [onCheckboxChange, registerCheckbox, checkedItems, previouslyCheckedOptions]);

  const hasCheckboxes = totalCheckboxes > 0;

  console.log('message', message);
  console.log('messages', messages);

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
          <Button
            onClick={handleChecklistSubmit}
            disabled={checkedItems.size === 0 || !onCheckboxChange}
            className="px-4 py-2 rounded-full bg-bolt-elements-textPrimary text-background hover:bg-bolt-elements-textPrimary/90 transition-colors"
          >
            Submit
          </Button>
        </div>
      )}
    </div>
  );
});
