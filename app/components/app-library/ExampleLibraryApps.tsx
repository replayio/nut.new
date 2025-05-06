'use client';

import { useEffect, useState } from 'react';
import { type BuildAppResult, type BuildAppSummary, getAppById, getRecentApps } from '~/lib/persistence/apps';
import styles from './ExampleLibraryApps.module.scss';
import { parseTestResultsMessage, TEST_RESULTS_CATEGORY } from '~/lib/persistence/message';
import { classNames } from '~/utils/classNames';

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
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedAppContents, setSelectedAppContents] = useState<BuildAppResult | null>(null);
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
    (async () => {
      if (selectedAppId) {
        const app = await getAppById(selectedAppId);
        setSelectedAppContents(app);
      }
    })();
  }, [selectedAppId]);

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
  if (selectedAppId) {
    let selectedIndex = displayApps.findIndex((app) => app.id === selectedAppId);
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
        onClick={() => {
          setSelectedAppId(app.id == selectedAppId ? null : app.id);
          setSelectedAppContents(null);
        }}
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

  const getTestResults = (appContents: BuildAppResult) => {
    const message = appContents.messages.findLast((message) => message.category === TEST_RESULTS_CATEGORY);
    return message ? parseTestResultsMessage(message) : [];
  }

  const renderAppDetails = (appId: string, appContents: BuildAppResult | null) => {
    const app = apps.find((app) => app.id === appId);
    if (!app) {
      return null;
    }

    const testResults = appContents ? getTestResults(appContents) : null;

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
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Database:</span>
            <span className={styles.detailValue}>
              {app.outcome.hasDatabase ? 'Present' : 'None'}
            </span>
          </div>
          <div className="text-lg font-semibold mb-2">Test Results</div>
          {testResults && (
            <div className="flex flex-col gap-2">
              {testResults.map((result) => (
                <div key={result.title} className="flex items-center gap-2">
                  <div
                    className={classNames('w-3 h-3 rounded-full border border-black', {
                      'bg-green-500': result.status === 'Pass',
                      'bg-red-500': result.status === 'Fail',
                      'bg-gray-300': result.status === 'NotRun',
                    })}
                  />
                  {result.recordingId ? (
                    <a
                      href={`https://app.replay.io/recording/${result.recordingId}`}
                      className="underline hover:text-blue-600"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {result.title}
                    </a>
                  ) : (
                    <div>{result.title}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          {!testResults && <div>Loading...</div>}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {beforeApps.map(renderApp)}
      </div>
      {selectedAppId && renderAppDetails(selectedAppId, selectedAppContents)}
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
