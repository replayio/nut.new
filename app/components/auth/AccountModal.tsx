import {
  getPeanutsHistory,
  getPeanutsSubscription,
  setPeanutsSubscription,
  addPeanuts,
  type PeanutHistoryEntry,
  type AccountSubscription,
} from '~/lib/replay/Account';
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { DialogButton } from '~/components/ui/Dialog';
import type { ReactElement } from 'react';
import { peanutsStore, refreshPeanutsStore } from '~/lib/stores/peanuts';
import { useStore } from '@nanostores/react';

interface AccountModalProps {
  user: User | undefined;
  onClose: () => void;
}

const DEFAULT_SUBSCRIPTION_PEANUTS = 2000;

export const AccountModal = ({ user, onClose }: AccountModalProps) => {
  const peanutsRemaining = useStore(peanutsStore.peanutsRemaining);
  const [subscription, setSubscription] = useState<AccountSubscription | undefined>(undefined);
  const [history, setHistory] = useState<PeanutHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadAccountData = async () => {
    setLoading(true);
    const [history, subscription] = await Promise.all([
      getPeanutsHistory(),
      getPeanutsSubscription(),
      refreshPeanutsStore(),
    ]);
    history.reverse();
    setHistory(history);
    setSubscription(subscription);
    setLoading(false);
  };

  useEffect(() => {
    reloadAccountData();
  }, []);

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSubscriptionTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPeanutChange = (delta: number) => {
    const sign = delta >= 0 ? '+' : '';
    const color = delta >= 0 ? 'text-green-500' : 'text-red-500';
    return (
      <span className={`${color} font-medium`}>
        {sign}
        {delta}
      </span>
    );
  };

  const renderFeature = (why: string, appId: string | undefined, featureName: string | undefined): ReactElement => {
    return (
      <span>
        {why}:{' '}
        {appId && featureName ? (
          <a
            href={`/app/${appId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 underline cursor-pointer transition-colors"
          >
            {featureName}
          </a>
        ) : (
          featureName || 'Unknown feature'
        )}
      </span>
    );
  };

  const renderHistoryEntry = (entry: PeanutHistoryEntry): string | ReactElement => {
    switch (entry.reason) {
      case 'SetSubscription':
        if (entry.subscriptionPeanuts) {
          return `Subscription set to ${entry.subscriptionPeanuts} peanuts per month`;
        } else {
          return 'Subscription canceled';
        }
      case 'SubscriptionReload':
        return 'Monthly subscription reload';
      case 'AddPeanuts':
        return 'Manual peanut addition';
      case 'FeatureImplemented':
        return renderFeature('Feature implemented', entry.appId, entry.featureName);
      case 'FeatureValidated':
        return renderFeature('Feature validated', entry.appId, entry.featureName);
      default:
        return entry.reason;
    }
  };

  const renderHistoryItem = (item: PeanutHistoryEntry, index: number) => {
    return (
      <div
        key={`${item.time}-${index}`}
        className="p-4 bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor hover:bg-bolt-elements-background-depth-3 transition-all duration-200"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="text-sm text-bolt-elements-textSecondary">{formatTime(item.time)}</div>
          <div className="flex items-center gap-2">
            <span className="text-bolt-elements-textPrimary">{formatPeanutChange(item.peanutsDelta)} peanuts</span>
            <span className="text-bolt-elements-textSecondary">→</span>
            <span className="text-bolt-elements-textPrimary font-semibold">{item.peanutsRemaining} total</span>
          </div>
        </div>
        <div className="text-sm text-bolt-elements-textSecondary">{renderHistoryEntry(item)}</div>
      </div>
    );
  };

  const handleSubscriptionToggle = async () => {
    setLoading(true);
    if (subscription) {
      await setPeanutsSubscription(undefined);
    } else {
      await setPeanutsSubscription(DEFAULT_SUBSCRIPTION_PEANUTS);
    }
    reloadAccountData();
  };

  const handleAddPeanuts = async () => {
    setLoading(true);
    await addPeanuts(2000);
    reloadAccountData();
  };

  return (
    <div
      className="bg-bolt-elements-background-depth-1 rounded-xl p-8 max-w-4xl w-full z-50 border border-bolt-elements-borderColor overflow-y-auto max-h-[95vh] shadow-2xl relative"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor hover:bg-bolt-elements-background-depth-3 transition-all duration-200 flex items-center justify-center text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary"
        title="Close"
      >
        <div className="i-ph:x text-lg" />
      </button>
      <div className="text-center mb-8">
        <div className="mb-6">
          <div className="w-16 h-16 bg-bolt-elements-background-depth-2 rounded-full flex items-center justify-center mx-auto mb-4 border border-bolt-elements-borderColor">
            <div className="i-ph:user text-2xl text-bolt-elements-textPrimary" />
          </div>
          <h1 className="text-3xl font-bold text-bolt-elements-textPrimary mb-2">Account</h1>
          <p className="text-bolt-elements-textSecondary">{user?.email ?? 'unknown'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-bolt-elements-background-depth-2 rounded-xl p-6 border border-bolt-elements-borderColor">
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🥜</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-bolt-elements-textPrimary mb-1">{peanutsRemaining ?? '---'}</div>
              <div className="text-sm text-bolt-elements-textSecondary">Peanuts Available</div>
            </div>
          </div>

          <div className="bg-bolt-elements-background-depth-2 rounded-xl p-6 border border-bolt-elements-borderColor">
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="i-ph:crown text-xl text-blue-600" />
              </div>
            </div>
            <div className="text-center">
              {subscription ? (
                <>
                  <div className="text-2xl font-bold text-bolt-elements-textPrimary mb-1">{subscription.peanuts}</div>
                  <div className="text-sm text-bolt-elements-textSecondary mb-1">Peanuts per month</div>
                  <div className="text-xs text-bolt-elements-textSecondary">
                    Next reload: {formatSubscriptionTime(subscription.reloadTime)}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-lg font-medium text-bolt-elements-textSecondary mb-1">No Subscription</div>
                  <div className="text-sm text-bolt-elements-textSecondary">Subscribe for monthly peanuts</div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <DialogButton
            type={subscription ? 'danger' : 'primary'}
            onClick={handleSubscriptionToggle}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Loading...
              </div>
            ) : subscription ? (
              'Cancel Subscription'
            ) : (
              `Subscribe - ${DEFAULT_SUBSCRIPTION_PEANUTS} peanuts/month`
            )}
          </DialogButton>

          <DialogButton type="secondary" onClick={handleAddPeanuts} disabled={loading}>
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Loading...
              </div>
            ) : (
              'Add 2000 Peanuts'
            )}
          </DialogButton>
        </div>
      </div>

      <div className="border-t border-bolt-elements-borderColor pt-8">
        <div className="flex items-center gap-3 mb-6">
          <div
            onClick={reloadAccountData}
            className="w-8 h-8 bg-bolt-elements-background-depth-2 rounded-lg flex items-center justify-center cursor-pointer"
          >
            <div className="i-ph:clock-clockwise text-lg text-bolt-elements-textPrimary" />
          </div>
          <h2 className="text-2xl font-bold text-bolt-elements-textPrimary">Usage History</h2>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-bolt-elements-borderColor border-t-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-bolt-elements-textSecondary">Loading usage history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-bolt-elements-background-depth-2 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="i-ph:list text-2xl text-bolt-elements-textSecondary" />
            </div>
            <p className="text-bolt-elements-textSecondary">No usage history available</p>
            <p className="text-sm text-bolt-elements-textSecondary mt-1">Your peanut transactions will appear here</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">{history.map(renderHistoryItem)}</div>
        )}
      </div>
    </div>
  );
};
