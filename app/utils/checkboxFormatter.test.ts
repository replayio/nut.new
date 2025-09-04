import { describe, it, expect } from 'vitest';
import { formatCheckboxes } from './checkboxFormatter';

describe('formatCheckboxes', () => {
  describe('normal messages that should not be changed', () => {
    it('should not modify messages without checkboxes', () => {
      const input = 'This is a normal message without any checkboxes.';
      expect(formatCheckboxes(input)).toBe(input);
    });

    it('should not modify already properly formatted checkboxes', () => {
      const input = `Here are some properly formatted checkboxes:
- [ ] First task
- [x] Completed task
- [X] Another completed task`;
      expect(formatCheckboxes(input)).toBe(input);
    });

    it('should not modify checkboxes in the middle of lines', () => {
      const input = 'Use checkboxes like [ ] or [x] in your documentation.';
      expect(formatCheckboxes(input)).toBe(input);
    });

    it('should not modify checkboxes within sentences', () => {
      const input = `Lorem ipsum dolor sit amet [ ] consectetur adipiscing elit.
Sed do eiusmod [x] tempor incididunt ut labore.`;
      expect(formatCheckboxes(input)).toBe(input);
    });

    it('should preserve indented properly formatted checkboxes', () => {
      const input = `  - [ ] Indented task
    - [x] More indented task`;
      expect(formatCheckboxes(input)).toBe(input);
    });
  });

  describe('messages that should be changed', () => {
    it('should format standalone checkboxes at start of lines', () => {
      const input = `Text before checkboxes:
[ ] First malformed checkbox
[x] Second malformed checkbox
[X] Third malformed checkbox`;
      
      const expected = `Text before checkboxes:
- [ ] First malformed checkbox
- [x] Second malformed checkbox
- [X] Third malformed checkbox`;
      
      expect(formatCheckboxes(input)).toBe(expected);
    });

    it('should format checkboxes with leading whitespace', () => {
      const input = `Tasks:
  [ ] Indented malformed checkbox
    [x] More indented malformed checkbox`;
      
      const expected = `Tasks:
  - [ ] Indented malformed checkbox
    - [x] More indented malformed checkbox`;
      
      expect(formatCheckboxes(input)).toBe(expected);
    });

    it('should handle mixed formatted and unformatted checkboxes', () => {
      const input = `Mixed checkboxes:
- [ ] Already formatted
[ ] Needs formatting
- [x] Already formatted
[X] Needs formatting`;
      
      const expected = `Mixed checkboxes:
- [ ] Already formatted
- [ ] Needs formatting
- [x] Already formatted
- [X] Needs formatting`;
      
      expect(formatCheckboxes(input)).toBe(expected);
    });

    it('should format checkboxes after lorem ipsum text', () => {
      const input = `Lorem ipsum dolor sit amet, consectetur adipiscing elit.
[ ] Vestibulum ante ipsum primis
[x] Fusce dapibus tellus ac cursus
[ ] Sed posuere consectetur est`;
      
      const expected = `Lorem ipsum dolor sit amet, consectetur adipiscing elit.
- [ ] Vestibulum ante ipsum primis
- [x] Fusce dapibus tellus ac cursus
- [ ] Sed posuere consectetur est`;
      
      expect(formatCheckboxes(input)).toBe(expected);
    });
  });

  describe('edge cases with brackets in middle of text', () => {
    it('should not modify brackets in the middle of sentences', () => {
      const input = `This text has [brackets] in the middle.
And also has [x] markers that are not checkboxes.
[ ] But this should be formatted as a checkbox`;
      
      const expected = `This text has [brackets] in the middle.
And also has [x] markers that are not checkboxes.
- [ ] But this should be formatted as a checkbox`;
      
      expect(formatCheckboxes(input)).toBe(expected);
    });

    it('should handle complex mixed content', () => {
      const input = `Array access like arr[0] should not be modified.
Function calls like fn([param]) should stay the same.
[ ] But this checkbox should be formatted
Regular text with [random] brackets continues.
[x] And this checkbox should also be formatted`;
      
      const expected = `Array access like arr[0] should not be modified.
Function calls like fn([param]) should stay the same.
- [ ] But this checkbox should be formatted
Regular text with [random] brackets continues.
- [x] And this checkbox should also be formatted`;
      
      expect(formatCheckboxes(input)).toBe(expected);
    });
  });

  describe('additional edge cases', () => {
    it('should handle empty input', () => {
      expect(formatCheckboxes('')).toBe('');
    });

    it('should handle null/undefined input gracefully', () => {
      expect(formatCheckboxes(null as any)).toBe(null);
      expect(formatCheckboxes(undefined as any)).toBe(undefined);
    });

    it('should handle single checkbox', () => {
      const input = '[ ] Single task';
      const expected = '- [ ] Single task';
      expect(formatCheckboxes(input)).toBe(expected);
    });

    it('should preserve empty lines', () => {
      const input = `First line
[ ] Task one

[ ] Task two after empty line`;
      
      const expected = `First line
- [ ] Task one

- [ ] Task two after empty line`;
      
      expect(formatCheckboxes(input)).toBe(expected);
    });

    it('should handle checkboxes with no content after them', () => {
      const input = `Tasks:
[ ]
[x]
[X]`;
      
      const expected = `Tasks:
- [ ] 
- [x] 
- [X] `;
      
      expect(formatCheckboxes(input)).toBe(expected);
    });

    it('should handle checkboxes with various spacing', () => {
      const input = `Tasks:
[ ]   Multiple spaces after
[x]	Tab after checkbox
[X]No space after`;
      
      const expected = `Tasks:
- [ ]   Multiple spaces after
- [x] 	Tab after checkbox
- [X] No space after`;
      
      expect(formatCheckboxes(input)).toBe(expected);
    });

    it('should handle malformed checkboxes with extra spaces inside', () => {
      const input = `Tasks:
[  ] Extra space inside
[ x] Extra space before x
[X ] Extra space after X`;
      
      // Note: These are not valid checkbox patterns, so they shouldn't be formatted
      // Only [ ], [x], [X] are valid
      expect(formatCheckboxes(input)).toBe(input);
    });

    it('should handle text immediately after newline with checkbox', () => {
      const input = 'Line of text\n[ ] Immediate checkbox after newline';
      const expected = 'Line of text\n- [ ] Immediate checkbox after newline';
      expect(formatCheckboxes(input)).toBe(expected);
    });
  });

  describe('code block handling', () => {
    it('should not format checkboxes inside code blocks', () => {
      const input = `Regular text
[ ] This should be formatted
\`\`\`
[ ] This should NOT be formatted (in code block)
[x] Neither should this
\`\`\`
[ ] This should be formatted again`;
      
      const expected = `Regular text
- [ ] This should be formatted
\`\`\`
[ ] This should NOT be formatted (in code block)
[x] Neither should this
\`\`\`
- [ ] This should be formatted again`;
      
      expect(formatCheckboxes(input)).toBe(expected);
    });

    it('should handle nested or complex code scenarios', () => {
      const input = `Normal text
[ ] Format this
\`\`\`javascript
const arr = [ ];  // Don't format this
if (condition) [x] // Don't format this
\`\`\`
[ ] Format this too`;
      
      const expected = `Normal text
- [ ] Format this
\`\`\`javascript
const arr = [ ];  // Don't format this
if (condition) [x] // Don't format this
\`\`\`
- [ ] Format this too`;
      
      expect(formatCheckboxes(input)).toBe(expected);
    });
  });
});