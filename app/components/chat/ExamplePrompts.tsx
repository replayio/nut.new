import React from 'react';

const EXAMPLE_PROMPTS = [
  { text: 'Build a todo app in React using Tailwind' },
  { text: 'Build a simple blog using Astro' },
  { text: 'Create a cookie consent form using Material UI' },
  { text: 'Make a space invaders game' },
  { text: 'Make a Tic Tac Toe game in html, css and js only' },
];

export function ExamplePrompts({ sendMessage }: { sendMessage: (prompt: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {EXAMPLE_PROMPTS.map((prompt, index) => (
        <button
          key={index}
          className="px-3 py-1 text-sm bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded-md hover:bg-bolt-elements-background-depth-2"
          onClick={() => {
            try {
              sendMessage(prompt.text);
            } catch {
              // Silent error handling
            }
          }}
        >
          {prompt.text}
        </button>
      ))}
    </div>
  );
}
