import React from 'react';
import { useStore } from '@nanostores/react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Avatar from '~/components/ui/Avatar';
import {
  testAccountsStore,
  activeTestAccountStore,
  setActiveTestAccount,
  removeTestAccount,
  addTestAccount,
  type TestAccount,
} from '~/lib/stores/testAccounts';

interface TestAccountsDropdownProps {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  setIframeUrl: (url: string | undefined) => void;
}

const TestAccountsDropdown: React.FC<TestAccountsDropdownProps> = ({ iframeRef, setIframeUrl }) => {
  const testAccounts = useStore(testAccountsStore);
  const activeAccount = useStore(activeTestAccountStore);

  const handleAccountSwitch = (account: TestAccount) => {
    console.log('Switching to test account:', {
      id: account.id,
      email: account.email,
      full_name: account.full_name,
    });

    setActiveTestAccount(account);

    // Update the iframe-specific auth token in localStorage
    localStorage.setItem('sb-auth-auth-token', JSON.stringify({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at,
      expires_in: account.expires_in,
      token_type: account.token_type,
      user: {
        id: account.id,
        email: account.email,
        user_metadata: {
          full_name: account.full_name,
          avatar_url: account.avatar_url
        }
      }
    }));

    // Construct auth callback URL for the selected account
    if (iframeRef.current) {
      const currentUrl = new URL(iframeRef.current.src);
      const authUrl = `${currentUrl.origin}/auth/callback#access_token=${account.access_token}&expires_at=${account.expires_at}&expires_in=${account.expires_in}&refresh_token=${account.refresh_token}&token_type=${account.token_type}&force_refresh=${Date.now()}`;
      
      console.log('Switching test account - Auth URL constructed:', {
        currentOrigin: currentUrl.origin,
        newAuthUrl: authUrl,
        tokenPreview: account.access_token.substring(0, 50) + '...',
      });

      // Use setIframeUrl to properly update the iframe URL in the store
      setIframeUrl(authUrl);
    } else {
      console.warn('Cannot switch account: iframe ref is not available');
    }
  };


  const handleRemoveAccount = (accountId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeTestAccount(accountId);
  };

  console.log('TestAccountsDropdown render:', {
    accountCount: testAccounts.length,
    activeAccount: activeAccount?.email || 'none',
  });

  // Only show dropdown if there are multiple accounts to choose from
  if (testAccounts.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-bolt-elements-background-depth-2 transition-colors">
          {activeAccount ? (
            <>
              <Avatar 
                src={activeAccount.avatar_url} 
                alt={activeAccount.full_name}
                fallback={activeAccount.full_name}
                size="sm"
              />
              <div className="i-ph:caret-down w-4 h-4 text-bolt-elements-textSecondary" />
            </>
          ) : (
            <>
              <div className="i-ph:user w-6 h-6 text-bolt-elements-textSecondary" />
              <div className="i-ph:caret-down w-4 h-4 text-bolt-elements-textSecondary" />
            </>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[220px] bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor shadow-lg p-1 z-50"
          sideOffset={5}
        >
          <DropdownMenu.Label className="px-3 py-2 text-xs font-medium text-bolt-elements-textSecondary uppercase tracking-wider">
            Test Accounts
          </DropdownMenu.Label>

          <DropdownMenu.Separator className="h-px bg-bolt-elements-borderColor my-1" />
          
          {testAccounts.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <div className="text-sm text-bolt-elements-textSecondary mb-3">
                No test accounts yet. Log in to add one.
              </div>
              <button 
                onClick={() => {
                  // Add a test account for debugging
                  const testData = {
                    access_token: "test-token-" + Date.now(),
                    refresh_token: "test-refresh",
                    expires_at: Date.now() + 3600000,
                    expires_in: 3600,
                    token_type: "bearer",
                    user: {
                      id: "test-" + Date.now(),
                      email: "test@example.com",
                      user_metadata: {
                        full_name: "Test User",
                        avatar_url: ""
                      }
                    }
                  };
                  console.log('Adding test account:', testData);
                  addTestAccount(testData);
                  
                  // Also set it as iframe token for immediate use
                  localStorage.setItem('sb-auth-auth-token', JSON.stringify(testData));
                }}
                className="px-3 py-1 text-xs bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 rounded-md text-bolt-elements-textSecondary"
              >
                Add Test Account (Debug)
              </button>
            </div>
          ) : (
            testAccounts.map((account) => (
            <DropdownMenu.Item
              key={account.id}
              className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-bolt-elements-background-depth-2 focus:bg-bolt-elements-background-depth-2 outline-none group"
              onClick={() => handleAccountSwitch(account)}
            >
              <Avatar src={account.avatar_url} alt={account.full_name} fallback={account.full_name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-bolt-elements-textPrimary truncate">{account.full_name}</div>
                <div className="text-xs text-bolt-elements-textSecondary truncate">{account.email}</div>
              </div>
              {activeAccount?.id === account.id && <div className="w-2 h-2 bg-green-500 rounded-full" />}
              <button
                onClick={(e) => handleRemoveAccount(account.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary hover:text-red-500 transition-all"
                title="Remove account"
              >
                <div className="i-ph:trash w-3 h-3" />
              </button>
            </DropdownMenu.Item>
          ))
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default TestAccountsDropdown;