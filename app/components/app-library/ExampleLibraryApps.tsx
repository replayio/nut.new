'use client';

import { useEffect, useState, useRef } from 'react';
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
  const [gridColumns, setGridColumns] = useState(1);

  const computeGridColumns = () => {
    const width = window.innerWidth;
    if (width <= 480) return 1;
    if (width <= 768) return 2;
    return 3;
  }

  useEffect(() => {
    setGridColumns(computeGridColumns());

    const handleResize = () => setGridColumns(computeGridColumns());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  let beforeApps = displayApps;
  let afterApps: BuildAppSummary[] = [];
  if (selectedApp) {
    let selectedIndex = displayApps.findIndex((app) => app.id === selectedApp.id);
    if (selectedIndex >= 0) {
      while ((selectedIndex + 1) % gridColumns != 0) {
        selectedIndex++;
      }
      beforeApps = displayApps.slice(0, selectedIndex + 1);
      afterApps = displayApps.slice(selectedIndex + 1);
    }
  }

  const renderApp = (app: BuildAppSummary) => {
    return (
      <div
        key={app.id}
        onClick={() => setSelectedApp(app.id == selectedApp?.id ? null : app)}
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

  const renderAppDetails = (app: BuildAppSummary) => {
    return (
      <div className={styles.detailView}>
        <div className={styles.detailHeader}>
          <h3 className={styles.detailTitle}>{app.title}</h3>
          <div className={styles.detailActions}>
            <button className={styles.actionButton} onClick={() => onLoadApp(app.id)}>
              Load App
            </button>
            <button className={styles.actionButton} onClick={() => onStartNewChat(app.id)}>
              Start Chat
            </button>
          </div>
        </div>
        <div className={styles.appDetails}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Status:</span>
            <div className={classNames(styles.statusIndicator, {
              [styles.passed]: app.outcome.testsPassed === true,
              [styles.failed]: app.outcome.testsPassed === false
            })} />
            <span className={styles.detailValue}>
              {app.outcome.testsPassed === true ? 'Passed' : 
               app.outcome.testsPassed === false ? 'Failed' : 'Not Run'}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Database:</span>
            <span className={styles.detailValue}>
              {app.outcome.hasDatabase ? 'Present' : 'Not Found'}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Created:</span>
            <span className={styles.detailValue}>
              {new Date(app.createdAt).toLocaleString()}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Time:</span>
            <span className={styles.detailValue}>
              {app.elapsedMinutes} minutes
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Peanuts:</span>
            <span className={styles.detailValue}>
              {app.totalPeanuts}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {beforeApps.map(renderApp)}
      </div>
      {selectedApp && renderAppDetails(selectedApp)}
      <div className={styles.grid}>
        {afterApps.map(renderApp)}
      </div>
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
