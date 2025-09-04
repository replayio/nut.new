/**
 * Formats malformed checkbox syntax in chat messages.
 * 
 * Converts standalone checkboxes that appear at the beginning of lines
 * (after newlines) into proper GitHub Flavored Markdown task list syntax
 * by adding the required "- " prefix.
 * 
 * Example:
 * Input:  "Some text\n[ ] Task item\n[x] Completed task"
 * Output: "Some text\n- [ ] Task item\n- [x] Completed task"
 */

export function formatCheckboxes(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Split into lines to process each one
  const lines = text.split('\n');
  
  const formattedLines = lines.map(line => {
    // Check if line starts with a checkbox pattern (allowing leading whitespace)
    // Matches: [ ], [x], [X] with optional leading whitespace but NOT if already prefixed with -
    const checkboxPattern = /^(\s*)\[(\s|x|X)\](\s*.*)$/;
    const alreadyFormatted = /^(\s*)-\s*\[(\s|x|X)\]/;
    
    // If it's already properly formatted with a dash, don't modify it
    if (alreadyFormatted.test(line)) {
      return line;
    }
    
    // If it matches the standalone checkbox pattern, add the dash prefix
    const match = line.match(checkboxPattern);
    if (match) {
      const [, leadingWhitespace, checkboxState, content] = match;
      // Preserve leading whitespace but add dash and space before checkbox
      // Ensure there's at least one space after the checkbox if there's content
      const formattedContent = content.length === 0 ? ' ' : content.startsWith(' ') ? content : ' ' + content;
      return `${leadingWhitespace}- [${checkboxState}]${formattedContent}`;
    }
    
    // Return line unchanged if no checkbox pattern found
    return line;
  });
  
  return formattedLines.join('\n');
}

/**
 * Alternative implementation using regex replacement for the entire text.
 * This handles the "text followed by newline followed immediately by checkbox" requirement.
 */
export function formatCheckboxesRegex(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  // Split into lines and process each one, then rejoin
  // This avoids complex regex lookbehind issues
  const lines = text.split('\n');
  
  const formattedLines = lines.map(line => {
    // Check for standalone checkbox at start of line
    const checkboxPattern = /^(\s*)\[(\s|x|X)\](\s*.*)$/;
    const alreadyFormatted = /^(\s*)-\s*\[(\s|x|X)\]/;
    
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

/**
 * More comprehensive formatter that handles edge cases and preserves formatting
 */
export function formatCheckboxesComprehensive(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  // Split by lines for more precise control
  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeBlockDelimiter = '';
  
  const formattedLines = lines.map(line => {
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