import React from 'react';

const EXAMPLE_PROMPTS = [
  {
    text: 'Build a turn by turn directions app',
    full: 'build an app to get turn by turn directions using the OpenStreetMap API. the directions should be in a clean and easy to read format showing a small map of the turn next to each step. do not show any complete map for the entire route. make sure the directions work on real locations, e.g. getting from santa cruz to san francisco should take about an hour and a half',
  },
  { text: 'Build a todo app' },
  {
    text: 'Build a grocery tracker',
    full: 'build an app for helping my family keep track of groceries. users should be able to save their username in the settings and add groceries to a shared list of what needs to be purchased. each grocery shows the name of the user who added it. users should be able to click a button to start a grocery trip, then be able to check off items as they\'re purchased. when the grocery trip is finalized with another button, all the purchased groceries will be removed from the list. store all data in a database.',
  },
];

export function ExamplePrompts(sendMessage?: { (event: React.UIEvent, messageInput: string): void | undefined }) {
  return (
    <div id="examples" className="relative flex flex-col gap-9 w-full max-w-3xl mx-auto flex justify-center mt-4">
      <div
        className="flex flex-wrap justify-center gap-2"
        style={{
          animation: '.25s ease-out 0s 1 _fade-and-move-in_g2ptj_1 forwards',
        }}
      >
        {EXAMPLE_PROMPTS.map((examplePrompt, index: number) => {
          return (
            <button
              key={index}
              onClick={(event) => {
                sendMessage?.(event, examplePrompt.full ?? examplePrompt.text);
              }}
              className="border border-bolt-elements-borderColor rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-900 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary px-3 py-1 text-xs transition-theme"
            >
              {examplePrompt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
