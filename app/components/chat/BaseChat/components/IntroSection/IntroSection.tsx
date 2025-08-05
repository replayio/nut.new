import React from 'react';

export const IntroSection: React.FC = () => {
  return (
    <div id="intro" className="mt-[16vh] max-w-4xl mx-auto text-center px-6 lg:px-8">
      <div className="inline-flex items-center gap-2 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-full px-4 py-2 mb-8 animate-fade-in">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-bolt-elements-textSecondary">AI-Powered Development</span>
      </div>

      <h1 className="text-4xl lg:text-7xl font-bold text-bolt-elements-textPrimary mb-6 animate-fade-in animation-delay-100 leading-tight">
        Build apps with 
        <span className="bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text text-transparent">
          just a prompt
        </span>
      </h1>

      <p className="text-lg lg:text-xl mb-10 text-bolt-elements-textSecondary animate-fade-in animation-delay-200 leading-relaxed max-w-2xl mx-auto">
        Write, test, and deploy your applications in minutes. From idea to production with the power of AI - no complex setup required.
      </p>

      <div className="flex flex-wrap justify-center gap-6 mb-8 animate-fade-in animation-delay-300">
        <div className="flex items-center gap-2 text-bolt-elements-textSecondary">
          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <div className="i-ph:code text-blue-500" />
          </div>
          <span className="text-sm font-medium">Code Generation</span>
        </div>
        <div className="flex items-center gap-2 text-bolt-elements-textSecondary">
          <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
            <div className="i-ph:flask text-green-500" />
          </div>
          <span className="text-sm font-medium">Auto Testing</span>
        </div>
        <div className="flex items-center gap-2 text-bolt-elements-textSecondary">
          <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
            <div className="i-ph:rocket-launch text-purple-500" />
          </div>
          <span className="text-sm font-medium">One-Click Deploy</span>
        </div>
      </div>

      <div className="animate-fade-in animation-delay-400 mb-1">
        <div className="flex items-center justify-center gap-2 text-bolt-elements-textTertiary">
          <div className="i-ph:arrow-down text-lg animate-bounce" />
          <span className="text-sm">Start typing your idea below</span>
        </div>
      </div>
    </div>
  );
};
