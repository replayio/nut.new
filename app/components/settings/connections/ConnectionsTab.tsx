import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import { logStore } from '~/lib/stores/logs';

interface GitHubUserResponse {
  login: string;
  id: number;
  [key: string]: any; // for other properties we don't explicitly need
}

export default function ConnectionsTab() {
  const [githubUsername, setGithubUsername] = useState(Cookies.get('githubUsername') || '');
  const [githubToken, setGithubToken] = useState(Cookies.get('githubToken') || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Check if credentials exist and verify them
    if (githubUsername && githubToken) {
      verifyGitHubCredentials();
    }
  }, []);

  const verifyGitHubCredentials = async () => {
    setIsVerifying(true);

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${githubToken}`,
        },
      });

      if (response.ok) {
        const data = (await response.json()) as GitHubUserResponse;

        if (data.login === githubUsername) {
          setIsConnected(true);
          return true;
        }
      }

      setIsConnected(false);

      return false;
    } catch (error) {
      console.error('Error verifying GitHub credentials:', error);
      setIsConnected(false);

      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveConnection = async () => {
    if (!githubUsername || !githubToken) {
      toast.error('Please provide both GitHub username and token');
      return;
    }

    setIsVerifying(true);

    const isValid = await verifyGitHubCredentials();

    if (isValid) {
      Cookies.set('githubUsername', githubUsername);
      Cookies.set('githubToken', githubToken);
      logStore.logSystem('GitHub connection settings updated', {
        username: githubUsername,
        hasToken: !!githubToken,
      });
      toast.success('GitHub credentials verified and saved successfully!');
      Cookies.set('git:github.com', JSON.stringify({ username: githubToken, password: 'x-oauth-basic' }));
      setIsConnected(true);
    } else {
      toast.error('Invalid GitHub credentials. Please check your username and token.');
    }
  };

  const handleDisconnect = () => {
    Cookies.remove('githubUsername');
    Cookies.remove('githubToken');
    Cookies.remove('git:github.com');
    setGithubUsername('');
    setGithubToken('');
    setIsConnected(false);
    logStore.logSystem('GitHub connection removed');
    toast.success('GitHub connection removed successfully!');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-900/10 to-gray-700/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-700/20 shadow-lg">
          <div className="i-ph:github-logo text-2xl text-gray-700" />
        </div>
        <h3 className="text-2xl font-bold text-bolt-elements-textHeading mb-2">GitHub Connection</h3>
        <p className="text-bolt-elements-textSecondary text-sm">
          Connect your GitHub account to enable repository operations and version control features.
        </p>
      </div>

      {/* Connection Status */}
      {isConnected && (
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6 text-center shadow-lg">
          <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <div className="i-ph:check-circle text-2xl text-green-500" />
          </div>
          <h4 className="text-lg font-semibold text-green-700 mb-2">Successfully Connected</h4>
          <p className="text-green-600 text-sm">
            Connected to GitHub as <span className="font-semibold">{githubUsername}</span>
          </p>
        </div>
      )}

      {/* Form */}
      <div className="bg-bolt-elements-background-depth-1/50 border border-bolt-elements-borderColor/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-bolt-elements-textPrimary">GitHub Username</label>
              <input
                type="text"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                disabled={isVerifying}
                placeholder="Enter your GitHub username"
                className="w-full bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder-bolt-elements-textSecondary border border-bolt-elements-borderColor/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm focus:shadow-md hover:shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-bolt-elements-textPrimary">
                Personal Access Token
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                disabled={isVerifying}
                placeholder="Enter your GitHub token"
                className="w-full bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder-bolt-elements-textSecondary border border-bolt-elements-borderColor/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm focus:shadow-md hover:shadow-sm"
              />
            </div>
          </div>

          {/* Help Text */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="i-ph:info text-lg text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">How to create a Personal Access Token:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-600">
                  <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
                  <li>Click "Generate new token" and select appropriate scopes</li>
                  <li>Copy the token and paste it above</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!isConnected ? (
              <button
                onClick={handleSaveConnection}
                disabled={isVerifying || !githubUsername || !githubToken}
                className="flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105 border border-white/20 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group"
              >
                {isVerifying ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="transition-transform duration-200 group-hover:scale-105">Verifying...</span>
                  </>
                ) : (
                  <>
                    <div className="i-ph:link text-lg transition-transform duration-200 group-hover:scale-110" />
                    <span className="transition-transform duration-200 group-hover:scale-105">Connect to GitHub</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105 border border-white/20 hover:border-white/30 group"
              >
                <div className="i-ph:link-break text-lg transition-transform duration-200 group-hover:scale-110" />
                <span className="transition-transform duration-200 group-hover:scale-105">Disconnect</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
