import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import type { ChatMessageParams } from '~/components/chat/ChatComponent/components/ChatImplementer/ChatImplementer';
import { ChatMode } from '~/lib/replay/SendChatMessage';

// Regex patterns for checkbox detection
const CHECKBOX_CHECKED_PATTERN = /^-\s*\[x\]/i;
const CHECKBOX_PATTERN = /^-\s*\[[\sx]\]/i;

export interface CheckboxItem {
  id: string;
  text: string;
  displayText: string;
  description?: string;
  isAllOfTheAbove: boolean;
  defaultChecked: boolean;
}

export interface CheckboxGroup {
  id: string;
  title?: string;
  items: CheckboxItem[];
}

export interface ParsedCheckboxContent {
  groups: CheckboxGroup[];
  beforeContent: string;
  afterContent: string;
  hasCheckboxes: boolean;
}

/**
 * Parse markdown content to extract checkbox groups
 */
export function parseCheckboxContent(content: string): ParsedCheckboxContent {
  const lines = content.split('\n');
  const groups: CheckboxGroup[] = [];
  let currentGroup: CheckboxGroup | null = null;
  let beforeContent = '';
  let afterContent = '';
  let foundFirstCheckbox = false;
  let lastCheckboxLineIndex = -1;

  // Find the last checkbox line
  for (let i = lines.length - 1; i >= 0; i--) {
    if (CHECKBOX_PATTERN.test(lines[i].trim())) {
      lastCheckboxLineIndex = i;
      break;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check if this is a checkbox line
    if (CHECKBOX_PATTERN.test(trimmedLine)) {
      foundFirstCheckbox = true;

      // Create a new group if we don't have one
      if (!currentGroup) {
        currentGroup = {
          id: `group-${groups.length}`,
          items: [],
        };
      }

      // Parse the checkbox item
      const isChecked = CHECKBOX_CHECKED_PATTERN.test(trimmedLine);
      const textContent = trimmedLine.replace(CHECKBOX_PATTERN, '').trim();

      // Extract display text and description
      // Handle formats like: **Title** - Description or **Title** (Description)
      let displayText = textContent;
      let description: string | undefined;

      // Check for bold title with description
      const boldMatch = textContent.match(/^\*\*(.+?)\*\*\s*[-–—]?\s*(.*)$/);
      if (boldMatch) {
        displayText = boldMatch[1];
        description = boldMatch[2] || undefined;
      } else {
        // Check for parenthetical description
        const parenMatch = textContent.match(/^(.+?)\s*\((.+)\)$/);
        if (parenMatch) {
          displayText = parenMatch[1];
          description = parenMatch[2];
        }
      }

      // Detect "All of the above" pattern
      const isAllOfTheAbove = /all\s+of\s+the\s+above/i.test(textContent);

      const item: CheckboxItem = {
        id: `${currentGroup.id}-item-${currentGroup.items.length}`,
        text: textContent,
        displayText: displayText.replace(/^\*\*|\*\*$/g, ''), // Remove any remaining bold markers
        description,
        isAllOfTheAbove,
        defaultChecked: isChecked,
      };

      currentGroup.items.push(item);
    } else {
      // Non-checkbox line
      if (!foundFirstCheckbox) {
        // Before any checkbox, accumulate as beforeContent
        beforeContent += (beforeContent ? '\n' : '') + line;
      } else if (i > lastCheckboxLineIndex) {
        // After all checkboxes, accumulate as afterContent
        afterContent += (afterContent ? '\n' : '') + line;
      } else if (trimmedLine) {
        // Between checkboxes - this separates groups
        // Save current group if it has items
        if (currentGroup && currentGroup.items.length > 0) {
          // Check if previous line was a potential title for next group
          groups.push(currentGroup);
        }
        currentGroup = {
          id: `group-${groups.length}`,
          title: trimmedLine,
          items: [],
        };
      }
    }
  }

  // Don't forget the last group
  if (currentGroup && currentGroup.items.length > 0) {
    groups.push(currentGroup);
  }

  return {
    groups,
    beforeContent: beforeContent.trim(),
    afterContent: afterContent.trim(),
    hasCheckboxes: groups.length > 0 && groups.some((g) => g.items.length > 0),
  };
}

interface CheckboxFormProps {
  content: string;
  messageId: string;
  existingSelections?: string[];
  isReadOnly?: boolean;
  onSubmit?: (params: ChatMessageParams) => void;
  className?: string;
}

export function CheckboxForm({
  content,
  existingSelections,
  isReadOnly = false,
  onSubmit,
  className,
}: CheckboxFormProps) {
  const parsed = useMemo(() => parseCheckboxContent(content), [content]);

  // Helper to get the submission string format for an item
  const getSubmissionString = useCallback((item: CheckboxItem): string => {
    return item.description ? `${item.displayText} - ${item.description}` : item.displayText;
  }, []);

  // Check if an item matches any of the existing selections
  const isItemSelected = useCallback(
    (item: CheckboxItem, selections: string[] | undefined): boolean => {
      if (!selections || selections.length === 0) {
        return false;
      }

      const submissionStr = getSubmissionString(item).toLowerCase().trim();

      const result = selections.some((sel) => {
        const selLower = sel.toLowerCase().trim();
        // Match against the submission format, displayText, or original text
        const matches =
          selLower === submissionStr ||
          selLower === item.displayText.toLowerCase().trim() ||
          selLower === item.text.toLowerCase().trim();

        return matches;
      });

      return result;
    },
    [getSubmissionString],
  );

  // Initialize checked state from existing selections or default checked items
  const [checkedItems, setCheckedItems] = useState<Map<string, boolean>>(() => {
    const initial = new Map<string, boolean>();

    parsed.groups.forEach((group) => {
      group.items.forEach((item) => {
        // Check if this item was previously selected
        const wasSelected = isItemSelected(item, existingSelections);
        // Use existing selection, then default checked state
        initial.set(item.id, wasSelected || item.defaultChecked);
      });
    });

    return initial;
  });

  // Update checked items when existingSelections changes
  useEffect(() => {
    if (existingSelections && existingSelections.length > 0) {
      const newChecked = new Map<string, boolean>();

      parsed.groups.forEach((group) => {
        group.items.forEach((item) => {
          const wasSelected = isItemSelected(item, existingSelections);
          newChecked.set(item.id, wasSelected);
        });
      });

      setCheckedItems(newChecked);
    }
  }, [existingSelections, parsed.groups, isItemSelected]);

  // Handle "All of the above" logic
  const handleCheckboxChange = useCallback(
    (groupId: string, itemId: string, checked: boolean) => {
      setCheckedItems((prev) => {
        const next = new Map(prev);
        const group = parsed.groups.find((g) => g.id === groupId);

        if (!group) {
          return prev;
        }

        const item = group.items.find((i) => i.id === itemId);

        if (!item) {
          return prev;
        }

        if (item.isAllOfTheAbove) {
          // If "All of the above" is toggled, set all items in the group
          group.items.forEach((groupItem) => {
            next.set(groupItem.id, checked);
          });
        } else {
          // Regular item toggled
          next.set(itemId, checked);

          // Check if all non-"All of the above" items are now checked
          const nonAllItems = group.items.filter((i) => !i.isAllOfTheAbove);
          const allOtherItems = group.items.find((i) => i.isAllOfTheAbove);

          if (allOtherItems) {
            const allNonAllChecked = nonAllItems.every((i) => {
              if (i.id === itemId) {
                return checked;
              }

              return next.get(i.id);
            });

            // Auto-check/uncheck "All of the above" based on other items
            next.set(allOtherItems.id, allNonAllChecked);
          }
        }

        return next;
      });
    },
    [parsed.groups],
  );

  // Get selected items for submission (plain text only, no markdown)
  const getSelectedItems = useCallback((): string[] => {
    const selected: string[] = [];

    parsed.groups.forEach((group) => {
      group.items.forEach((item) => {
        if (checkedItems.get(item.id) && !item.isAllOfTheAbove) {
          selected.push(getSubmissionString(item));
        }
      });
    });

    return selected;
  }, [parsed.groups, checkedItems, getSubmissionString]);

  const handleSubmit = useCallback(() => {
    if (onSubmit) {
      const selected = getSelectedItems();
      onSubmit({
        chatMode: ChatMode.UserMessage,
        messageInput: selected.join('\n'),
      });
    }
  }, [onSubmit, getSelectedItems]);

  const hasSelections = useMemo(() => {
    return Array.from(checkedItems.values()).some((v) => v);
  }, [checkedItems]);

  if (!parsed.hasCheckboxes) {
    return null;
  }

  return (
    <div className={cn('checkbox-form', className)}>
      {parsed.groups.map((group) => (
        <div key={group.id} className="checkbox-group mb-4">
          {group.title && (
            <div
              className="checkbox-group-title text-foreground font-medium mb-3"
              dangerouslySetInnerHTML={{
                __html: group.title
                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.+?)\*/g, '<em>$1</em>'),
              }}
            />
          )}
          <div className="checkbox-items space-y-2">
            {group.items.map((item) => (
              <CheckboxItem
                key={item.id}
                item={item}
                checked={checkedItems.get(item.id) ?? false}
                disabled={isReadOnly}
                onChange={(checked) => handleCheckboxChange(group.id, item.id, checked)}
              />
            ))}
          </div>
        </div>
      ))}

      {!isReadOnly && onSubmit && (
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!hasSelections}
            className="px-4 py-2 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
          >
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}

interface CheckboxItemProps {
  item: CheckboxItem;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}

function CheckboxItem({ item, checked, disabled, onChange }: CheckboxItemProps) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 p-4 rounded-md border border-border bg-card cursor-pointer transition-colors',
        !disabled && 'hover:bg-accent/50',
        checked && 'border-primary bg-accent/30',
        disabled && 'cursor-not-allowed opacity-70',
      )}
    >
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div
          className={cn(
            'w-5 h-5 rounded border-2 transition-colors flex items-center justify-center',
            checked ? 'bg-foreground border-foreground' : 'bg-background border-border',
            !disabled && !checked && 'hover:border-muted-foreground',
          )}
        >
          {checked && (
            <svg
              className="w-3 h-3 text-background"
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
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-foreground font-medium">{item.displayText}</div>
        {item.description && <div className="text-muted-foreground text-sm mt-0.5">{item.description}</div>}
      </div>
    </label>
  );
}

export default CheckboxForm;
