import { useState, useEffect } from 'react';

const DeploymentSuccessful = ({
  deploySettings,
  setIsModalOpen,
}: {
  deploySettings: any;
  setIsModalOpen: (isOpen: boolean) => void;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(deploySettings?.siteURL);
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  return (
    <div className="text-center py-8">
      <div className="mb-8">
        <div className="mb-4">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-bolt-elements-textPrimary mb-2">Deployment Succeeded!</h2>
        </div>
        <p className="text-lg text-bolt-elements-textSecondary max-w-md mx-auto leading-relaxed whitespace-pre-wrap">
          Your application has been successfully deployed and is now live on the web.
        </p>
      </div>

      <div className="mb-8">
        <div className="bg-bolt-elements-background-depth-2 rounded-xl py-6 px-4 border border-bolt-elements-borderColor">
          <div className="mb-4">
            <span className="text-sm font-medium text-bolt-elements-textPrimary">Your App's URL:</span>
          </div>
          <div className="space-y-3">
            <div className="p-4 bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor">
              <code className="text-sm text-bolt-elements-textPrimary font-mono break-words leading-relaxed block truncate">
                {deploySettings?.siteURL}
              </code>
            </div>
            <div className="flex justify-center">
              <button
                onClick={handleCopy}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
                  copied
                    ? 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                    : 'bg-bolt-elements-background-depth-1 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor'
                }`}
                title={copied ? 'Copied!' : 'Copy URL'}
              >
                {copied ? (
                  <>
                    <div className="i-ph:check text-lg" />
                    Copied!
                  </>
                ) : (
                  <>
                    <div className="i-ph:copy text-lg" />
                    Copy URL
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <a
          href={deploySettings?.siteURL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
        >
          <div className="i-ph:arrow-square-out text-lg" />
          Open App
        </a>
        <button
          onClick={() => setIsModalOpen(false)}
          className="px-6 py-3 bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border border-bolt-elements-borderColor rounded-lg hover:bg-bolt-elements-background-depth-3 transition-all duration-200 font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default DeploymentSuccessful;
