import React from 'react';

const EXAMPLE_PROMPTS = [
  { text: 'Build a support CRM' },
  { text: 'Build a todo app' },
  { text: 'Build a team issue tracker' },
];

export function ExamplePrompts(sendMessage?: { (event: React.UIEvent, messageInput: string): void | undefined }) {
  return (
    <div id="examples" className="relative flex flex-col w-full max-w-4xl mx-auto mt-4">
      <div className="flex flex-wrap justify-center gap-3 animate-fade-in animation-delay-500">
        {EXAMPLE_PROMPTS.map((examplePrompt, index: number) => {
          return (
            <button
              key={index}
              onClick={(event) => {
                sendMessage?.(event, examplePrompt.text);
              }}
              className="group relative bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor hover:border-bolt-elements-focus/50 rounded-full p-2.5 px-4 text-sm font-medium text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-all duration-200 hover:scale-105 hover:shadow-lg"
            >
              <div className="flex items-center gap-2">
                <span>{examplePrompt.text}</span>
              </div>

              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
            </button>
          );
        })}
      </div>
      <div className="mt-8 w-24 h-px bg-gradient-to-r from-transparent via-bolt-elements-borderColor to-transparent mx-auto opacity-50" />
    </div>
  );
}
