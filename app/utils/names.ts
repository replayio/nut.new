// Routines for formatting names for display.

// A PascalCase name is converted to a more readable "Pascal Case" name for display.
export function formatPascalCaseName(name: string) {
  // Insert spaces before every capital letter, except the first one and when
  // the previous letter is also capital.
  return name.replace(/([A-Z])/g, (match, letter, index) => {
    // Don't add space before the first letter
    if (index === 0) {
      return letter;
    }

    // Don't add space if the previous character is also capital
    const previousChar = name[index - 1];
    if (previousChar && previousChar === previousChar.toUpperCase()) {
      return letter;
    }

    // Add space before the capital letter
    return ` ${letter}`;
  });
}
