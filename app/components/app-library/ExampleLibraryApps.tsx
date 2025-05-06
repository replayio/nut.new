'use client';

import { useEffect, useState } from 'react';
import { type BuildAppSummary, getRecentApps } from '~/lib/persistence/apps';
import styles from './ExampleLibraryApps.module.scss';
import { classNames } from '~/utils/classNames';
import type { PlaywrightTestResult } from '~/lib/persistence/message';

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
};

export const ExampleLibraryApps = () => {
  const [numApps, setNumApps] = useState<number>(6);
  const [apps, setApps] = useState<BuildAppSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<BuildAppSummary | null>(null);

  useEffect(() => {
    async function fetchRecentApps() {
      try {
        setLoading(true);
        const recentApps = await getRecentApps(numApps);
        setApps(recentApps);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch recent apps:', err);
        setError('Failed to load recent apps');
      } finally {
        setLoading(false);
      }
    }

    if (apps.length < numApps) {
      fetchRecentApps();
    }
  }, [numApps]);

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (apps.length === 0) {
    if (loading) {
      return <div className={styles.loading}>Loading recent apps...</div>;
    }
    return <div className={styles.empty}>No recent apps found</div>;
  }

  const displayApps = apps.slice(0, numApps);

  const renderApp = (app: BuildAppSummary) => {
    return (
      <div
        key={app.id}
        onClick={() => setSelectedApp(app)}
        className={`${styles.appItem} ${!app.outcome.testsPassed ? styles.appItemError : ''}`}
      >
        {app.imageDataURL ? (
          <img src={app.imageDataURL} alt={app.title || 'App preview'} className={styles.previewImage} />
        ) : (
          <div className={styles.placeholderImage}>{app.title || 'No preview'}</div>
        )}
        <div className={styles.appTitle}>{app.title || 'Untitled App'}</div>
        <div className={styles.hoverOverlay}>
          <div className={styles.hoverContent}>
            <div className={styles.hoverInfo}>
              <div>
                Created at {formatDate(new Date(app.createdAt))} in {Math.round(app.elapsedMinutes)} minutes
              </div>
              <div>
                {app.totalPeanuts} peanuts{app.outcome.hasDatabase ? ' (has database)' : ''}
              </div>
              {!app.outcome.testsPassed && <div className={styles.warningText}>⚠️ Not all tests are passing</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {displayApps.map(renderApp)}
      </div>
      {selectedApp && (
        <div className={styles.detailView}>
          <div className={styles.detailHeader}>
            <h3 className={styles.detailTitle}>App Details</h3>
            <div className={styles.detailActions}>
              <button className={styles.actionButton} onClick={() => onLoadApp(selectedApp.id)}>
                Load App
              </button>
              <button className={styles.actionButton} onClick={() => onStartNewChat(selectedApp.id)}>
                Start Chat
              </button>
            </div>
          </div>
          <div className={styles.appDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Status:</span>
              <div className={classNames(styles.statusIndicator, {
                [styles.passed]: selectedApp.outcome.testsPassed === true,
                [styles.failed]: selectedApp.outcome.testsPassed === false
              })} />
              <span className={styles.detailValue}>
                {selectedApp.outcome.testsPassed === true ? 'Passed' : 
                 selectedApp.outcome.testsPassed === false ? 'Failed' : 'Not Run'}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Database:</span>
              <span className={styles.detailValue}>
                {selectedApp.outcome.hasDatabase ? 'Present' : 'Not Found'}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Created:</span>
              <span className={styles.detailValue}>
                {new Date(selectedApp.createdAt).toLocaleString()}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Time:</span>
              <span className={styles.detailValue}>
                {selectedApp.elapsedMinutes} minutes
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Peanuts:</span>
              <span className={styles.detailValue}>
                {selectedApp.totalPeanuts}
              </span>
            </div>
          </div>
        </div>
      )}
      {loading && <div className={styles.loading}>Loading recent apps...</div>}
      {!loading && (
        <div className={styles.buttonContainer}>
          <button
            className={styles.loadMoreButton}
            onClick={() => {
              setNumApps((prev) => prev + 12);
            }}
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
