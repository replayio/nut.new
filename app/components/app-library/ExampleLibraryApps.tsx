'use client';

import { useEffect, useState } from 'react';
import { type BuildAppResult, getRecentApps } from '~/lib/persistence/apps';
import styles from './ExampleLibraryApps.module.scss';
import { importChat } from '~/lib/persistence/useChatHistory';

interface ExampleLibraryAppsProps {
  numApps: number;
}

export const ExampleLibraryApps = ({ numApps }: ExampleLibraryAppsProps) => {
  const [apps, setApps] = useState<BuildAppResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecentApps() {
      try {
        setLoading(true);
        const recentApps = await getRecentApps(24);
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

  const displayApps = apps.slice(0, numApps);

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {displayApps.map((app) => (
          <div 
            key={app.appId}
            className={styles.appItem}
            onClick={() => {
              importChat(app.title ?? "Untitled App", app.messages.filter(msg => {
                // Workaround an issue where the messages in the database include images
                // (used to generate the screenshots).
                if (msg.role == 'assistant' && msg.type == 'image') {
                  return false;
                }
                return true;
              }));
            }}
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