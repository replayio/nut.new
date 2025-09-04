/**
 * Formats malformed checkbox syntax in chat messages.
 *
 * Converts standalone checkboxes that appear at the beginning of lines
 * into proper GitHub Flavored Markdown task list syntax by adding the
 * required "- " prefix.
 *
 * Features:
 * - Preserves existing formatting for properly formatted checkboxes
 * - Handles various spacing and indentation scenarios
 * - Avoids formatting checkboxes inside code blocks
 * - Supports [ ], [x], and [X] checkbox patterns
 * - Maintains original content spacing and structure
 *
 * Example:
 * Input:  "Some text\n[ ] Task item\n[x] Completed task"
 * Output: "Some text\n- [ ] Task item\n- [x] Completed task"
 */
export function formatCheckboxes(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Split by lines for more precise control
  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeBlockDelimiter = '';

  const formattedLines = lines.map((line) => {
    // Track code blocks to avoid formatting checkboxes inside them
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockDelimiter = '```';
      } else if (codeBlockDelimiter === '```') {
        inCodeBlock = false;
        codeBlockDelimiter = '';
      }
      return line;
    }

    // Don't format checkboxes inside code blocks
    if (inCodeBlock) {
      return line;
    }

    // Check for standalone checkbox at start of line
    // Pattern: optional whitespace + checkbox + optional space + content (or end of line)
    const checkboxPattern = /^(\s*)\[(\s|x|X)\](\s*.*)$/;
    const alreadyFormatted = /^(\s*)-\s+\[(\s|x|X)\]/;

    // Skip if already properly formatted
    if (alreadyFormatted.test(line)) {
      return line;
    }

    // Format standalone checkboxes
    const match = line.match(checkboxPattern);
    if (match) {
      const [, leadingWhitespace, checkboxState, content] = match;
      // Ensure there's at least one space after the checkbox
      const formattedContent = content.length === 0 ? ' ' : content.startsWith(' ') ? content : ' ' + content;
      return `${leadingWhitespace}- [${checkboxState}]${formattedContent}`;
    }

    return line;
  });

  return formattedLines.join('\n');
}
