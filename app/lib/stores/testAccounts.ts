import { atom } from 'nanostores';

export interface TestAccount {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
}

// Store for all test accounts
export const testAccountsStore = atom<TestAccount[]>([]);

// Store for currently active test account
export const activeTestAccountStore = atom<TestAccount | null>(null);

// Add a new test account to the store
export function addTestAccount(authData: any) {
  const account: TestAccount = {
    id: authData.user.id,
    email: authData.user.email,
    full_name: authData.user.user_metadata.full_name || authData.user.email,
    avatar_url: authData.user.user_metadata.avatar_url || '',
    access_token: authData.access_token,
    refresh_token: authData.refresh_token,
    expires_at: authData.expires_at,
    expires_in: authData.expires_in,
    token_type: authData.token_type,
  };

  const currentAccounts = testAccountsStore.get();
  const existingIndex = currentAccounts.findIndex((a) => a.id === account.id);

  if (existingIndex >= 0) {
    // Update existing account
    currentAccounts[existingIndex] = account;
  } else {
    // Add new account
    currentAccounts.push(account);
  }

  testAccountsStore.set([...currentAccounts]);
  activeTestAccountStore.set(account);

  // Persist to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('nut-test-accounts', JSON.stringify(currentAccounts));
    localStorage.setItem('nut-active-test-account', JSON.stringify(account));
  }
}

// Load test accounts from localStorage on initialization
export function loadTestAccounts() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const savedAccounts = localStorage.getItem('nut-test-accounts');
    const savedActiveAccount = localStorage.getItem('nut-active-test-account');

    if (savedAccounts) {
      const accounts = JSON.parse(savedAccounts);
      testAccountsStore.set(accounts);
    }

    if (savedActiveAccount) {
      const activeAccount = JSON.parse(savedActiveAccount);
      activeTestAccountStore.set(activeAccount);
    }
  } catch (error) {
    console.error('Failed to load test accounts from localStorage:', error);
  }
}

// Set active test account
export function setActiveTestAccount(account: TestAccount | null) {
  activeTestAccountStore.set(account);

  if (typeof window !== 'undefined') {
    localStorage.setItem('nut-active-test-account', JSON.stringify(account));
  }
}

// Remove a test account
export function removeTestAccount(accountId: string) {
  const currentAccounts = testAccountsStore.get();
  const updatedAccounts = currentAccounts.filter((a) => a.id !== accountId);

  testAccountsStore.set(updatedAccounts);

  // If we're removing the active account, set the first remaining account as active
  const activeAccount = activeTestAccountStore.get();
  if (activeAccount?.id === accountId) {
    const newActiveAccount = updatedAccounts.length > 0 ? updatedAccounts[0] : null;
    activeTestAccountStore.set(newActiveAccount);

    if (typeof window !== 'undefined') {
      localStorage.setItem('nut-active-test-account', JSON.stringify(newActiveAccount));
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('nut-test-accounts', JSON.stringify(updatedAccounts));
  }
}