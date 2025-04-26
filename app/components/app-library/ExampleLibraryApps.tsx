'use client';

import { useEffect, useState } from 'react';
import { type BuildAppResult, getRecentApps } from '~/lib/persistence/apps';
import styles from './ExampleLibraryApps.module.scss';
import { type ChatMessage } from '~/lib/persistence/apps';

interface ExampleLibraryAppsProps {
  onAppSelected: (messages: ChatMessage[]) => void;
}

export const ExampleLibraryApps = ({ onAppSelected }: ExampleLibraryAppsProps) => {
  const [apps, setApps] = useState<BuildAppResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecentApps() {
      try {
        setLoading(true);
        const recentApps = await getRecentApps(6); // Get apps from the last 6 hours
        setApps(recentApps);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch recent apps:', err);
        setError('Failed to load recent apps');
      } finally {
        setLoading(false);
      }
    }

    fetchRecentApps();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading recent apps...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (apps.length === 0) {
    return <div className={styles.empty}>No recent apps found</div>;
  }

  // Take up to 6 apps to create a 3x2 grid
  const displayApps = apps.slice(0, 6);

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {displayApps.map((app) => (
          <div 
            key={app.appId}
            className={styles.appItem}
            onClick={() => onAppSelected(app.messages)}
          >
            {app.imageDataURL ? (
              <img 
                src={app.imageDataURL} 
                alt={app.title || 'App preview'} 
                className={styles.previewImage}
              />
            ) : (
              <div className={styles.placeholderImage}>
                {app.title || 'No preview'}
              </div>
            )}
            <div className={styles.appTitle}>
              {app.title || 'Untitled App'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}