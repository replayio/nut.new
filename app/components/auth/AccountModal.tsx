import {
  getPeanutsHistory,
  getPeanutsRemaining,
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

interface AccountModalProps {
  user: User | undefined;
}

const DEFAULT_SUBSCRIPTION_PEANUTS = 2000;

export const AccountModal = ({ user }: AccountModalProps) => {
  const [peanutsRemaining, setPeanutsRemaining] = useState<number | undefined>(undefined);
  const [subscription, setSubscription] = useState<AccountSubscription | undefined>(undefined);
  const [history, setHistory] = useState<PeanutHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadAccountData = async () => {
    setLoading(true);
    const [history, subscription, peanutsRemaining] = await Promise.all([
      getPeanutsHistory(),
      getPeanutsSubscription(),
      getPeanutsRemaining(),
    ]);
    history.reverse();
    setHistory(history);
    setSubscription(subscription);
    setPeanutsRemaining(peanutsRemaining);
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
      <span className={color}>
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
            className="text-blue-500 hover:text-blue-600 underline cursor-pointer"
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
        className="flex items-center justify-between py-3 px-4 border-b border-bolt-elements-borderColor last:border-b-0 hover:bg-bolt-elements-background-depth-2 transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="text-sm text-bolt-elements-textSecondary min-w-[120px]">{formatTime(item.time)}</div>
            <div className="flex items-center gap-2">
              <span className="text-bolt-elements-textPrimary">{formatPeanutChange(item.peanutsDelta)} peanuts</span>
              <span className="text-bolt-elements-textSecondary">→</span>
              <span className="text-bolt-elements-textPrimary font-medium">{item.peanutsRemaining} total</span>
            </div>
          </div>
          <div className="mt-1 ml-[120px] text-sm text-bolt-elements-textSecondary">{renderHistoryEntry(item)}</div>
        </div>
      </div>
    );
  };

  const handleSubscriptionToggle = async () => {
    setLoading(true);
    if (subscription) {
      // Cancel subscription
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
      className="bg-bolt-elements-background-depth-1 rounded-lg p-8 max-w-3xl w-full z-50 border border-bolt-elements-borderColor overflow-y-auto max-h-[95vh]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary text-center">Account</h2>
        <div className="text-bolt-elements-textPrimary font-medium">{user?.email ?? 'unknown'}</div>
        <div className="text-bolt-elements-textPrimary font-medium">Peanuts: {peanutsRemaining ?? 'unknown'}</div>
        <div className="mt-2 text-bolt-elements-textSecondary text-sm">
          {subscription ? (
            <>
              <div>Subscription: {subscription.peanuts} peanuts</div>
              <div>Next reload: {formatSubscriptionTime(subscription.reloadTime)}</div>
            </>
          ) : (
            <div>No active subscription</div>
          )}
        </div>
        <div className="mt-4 flex justify-center gap-3">
          <DialogButton
            type={subscription ? 'danger' : 'primary'}
            onClick={handleSubscriptionToggle}
            disabled={loading}
          >
            {loading
              ? 'Loading...'
              : subscription
                ? 'Cancel'
                : `Subscribe (${DEFAULT_SUBSCRIPTION_PEANUTS} peanuts per month)`}
          </DialogButton>
          {subscription && (
            <DialogButton type="secondary" onClick={handleAddPeanuts} disabled={loading}>
              {loading ? 'Loading...' : 'Add 2000 Peanuts'}
            </DialogButton>
          )}
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary text-center">Usage</h2>

      {loading ? (
        <div className="text-center py-8 text-bolt-elements-textSecondary">Loading usage history...</div>
      ) : history.length === 0 ? (
        <div className="text-center py-8 text-bolt-elements-textSecondary">No usage history available</div>
      ) : (
        <div className="space-y-1">{history.map(renderHistoryItem)}</div>
      )}
    </div>
  );
};
