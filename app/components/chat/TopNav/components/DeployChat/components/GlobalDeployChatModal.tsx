import { useState, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import useViewport from '~/lib/hooks/useViewport';
import { deployModalStore } from '~/lib/stores/deployModal';
import { chatStore } from '~/lib/stores/chat';
import { database } from '~/lib/persistence/apps';
import { lastDeployResult, deployApp } from '~/lib/replay/Deploy';
import { generateRandomId } from '~/utils/nut';
import { DeployStatus } from '~/lib/stores/deployTypes';
import { motion, AnimatePresence } from 'framer-motion';
import DeploymentSuccessful from './DeploymentSuccessful';
import { userStore } from '~/lib/stores/auth';
import { X, CloudUpload, AlertTriangle, ExternalLink, Copy, Check } from '~/components/ui/Icon';
import { isAppOwnerStore, permissionsStore } from '~/lib/stores/permissions';
import { isAppAccessAllowed, AppAccessKind } from '~/lib/api/permissions';
import { Button } from '~/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import { classNames } from '~/utils/classNames';

const MAX_SITE_NAME_LENGTH = 63;

interface GlobalDeployChatModalProps {
  variant?: 'modal' | 'popover';
}

export function GlobalDeployChatModal({ variant = 'modal' }: GlobalDeployChatModalProps) {
  const isSmallViewport = useViewport(1024);
  const status = useStore(deployModalStore.status);
  const deploySettings = useStore(deployModalStore.deploySettings);
  const error = useStore(deployModalStore.error);
  const loadingData = useStore(deployModalStore.loadingData);
  const user = useStore(userStore);
  const permissions = useStore(permissionsStore);
  const isAppOwner = useStore(isAppOwnerStore);

  const appId = useStore(chatStore.currentAppId);
  const activeTab = useStore(deployModalStore.activeTab);
  const [copied, setCopied] = useState(false);

  const siteURL = lastDeployResult(deploySettings)?.siteURL;
  const hasExistingDeploy = !!siteURL;
  const canDeploy =
    permissions.length === 0 ||
    (permissions.length > 0 &&
      isAppAccessAllowed(permissions, AppAccessKind.SendMessage, user?.email ?? '', isAppOwner));

  const handleCloseModal = () => {
    deployModalStore.close();
  };

  const handleDeploy = async () => {
    deployModalStore.setError(undefined);

    if (!appId) {
      deployModalStore.setError('No app open');
      return;
    }

    const currentSettings = deployModalStore.deploySettings.get();
    const settingsToUse = { ...currentSettings };

    if (!settingsToUse.siteName) {
      const appTitle = chatStore.appTitle.get();
      let siteName = appTitle
        ? appTitle
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '') || 'nut-app'
        : 'nut-app';

      const suffix = `-${generateRandomId()}`;
      siteName = siteName.slice(0, MAX_SITE_NAME_LENGTH - suffix.length);
      settingsToUse.siteName = `${siteName}${suffix}`;
    }

    if (settingsToUse.siteName.length > MAX_SITE_NAME_LENGTH) {
      deployModalStore.setError(`Site name must be shorter than ${MAX_SITE_NAME_LENGTH + 1} characters`);
      return;
    }

    deployModalStore.setStatus(DeployStatus.Started);

    // Write out to the database before we start trying to deploy.
    await database.setAppDeploySettings(appId, settingsToUse);

    const result = await deployApp(appId, settingsToUse);

    if (result.error) {
      deployModalStore.setError(result.error);
    }

    if (window.analytics) {
      window.analytics.track('Deployed App', {
        timestamp: new Date().toISOString(),
        userId: user?.id,
        email: user?.email,
      });
    }

    const updatedSettings = {
      ...settingsToUse,
      results: [...(settingsToUse.results || []), result],
    };

    deployModalStore.setDeploySettings(updatedSettings);
    deployModalStore.setStatus(result.error ? DeployStatus.NotStarted : DeployStatus.Succeeded);
  };

  const handleSetDeploySettings = (settings: typeof deploySettings) => {
    deployModalStore.setDeploySettings(settings);
  };

  const previewURL = useMemo(() => {
    if (siteURL) return siteURL;
    const appTitle = chatStore.appTitle.get();
    const slug = appTitle
      ? appTitle
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || 'nut-app'
      : 'nut-app';
    return `https://${slug}-${generateRandomId()}.netlify.app/`;
  }, [siteURL]);

  const handleCopyURL = async () => {
    try {
      await navigator.clipboard.writeText(previewURL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.7,
      y: 50,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 20,
        stiffness: 300,
        duration: 0.5,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.7,
      y: 50,
      transition: { duration: 0.2 },
    },
  };


  const modalBody = (
    <>
          <div className="absolute top-3 right-3 z-10">
            <Button
              onClick={handleCloseModal}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground hover:text-foreground/80"
            >
              <X size={18} />
            </Button>
          </div>

          <div
            className={classNames(
              'mt-6 overflow-y-auto flex-1 min-h-0',
              isSmallViewport ? 'p-4' : 'p-6',
            )}
          >
            {loadingData ? (
              <div className="text-center">
                <div
                  className={classNames(
                    'bg-muted rounded-2xl flex items-center justify-center mx-auto border border-border/50',
                    isSmallViewport ? 'w-12 h-12 mb-4' : 'w-16 h-16 mb-6',
                  )}
                >
                  <div className="w-8 h-8 border-2 border-border border-opacity-30 border-t-primary rounded-full animate-spin" />
                </div>
                <h3
                  className={classNames(
                    'font-bold text-foreground',
                    isSmallViewport ? 'text-xl mb-2' : 'text-2xl mb-3',
                  )}
                >
                  Loading data...
                </h3>
                <p className="text-sm text-muted-foreground">Please wait while we prepare your deployment settings</p>
              </div>
            ) : status === DeployStatus.Succeeded ? (
              <DeploymentSuccessful result={lastDeployResult(deploySettings)} setIsModalOpen={handleCloseModal} />
            ) : (
              <>
                <div className={classNames('text-center', isSmallViewport ? 'mb-4' : 'mb-6')}>
                  <h2
                    className={classNames(
                      'font-bold text-foreground',
                      isSmallViewport ? 'text-xl' : 'text-2xl',
                    )}
                  >
                    Ready to deploy your application?
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">Get your app live in just a few clicks</p>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => deployModalStore.setActiveTab(v as 'default' | 'custom')} className="w-full">
                  <TabsList
                    className={classNames(
                      'w-full grid grid-cols-2 p-1 bg-muted rounded-lg',
                      isSmallViewport ? 'h-9 mb-4' : 'h-10 mb-6',
                    )}
                  >
                    <TabsTrigger
                      value="default"
                      className="rounded-md text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border truncate"
                    >
                      Default
                    </TabsTrigger>
                    <TabsTrigger
                      value="custom"
                      className="rounded-md text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border truncate"
                    >
                      Custom domain
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="default" className="mt-0">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-semibold text-foreground mb-1">Deploy your app to Netlify domain</h3>
                        <p className="text-sm text-muted-foreground mb-4">Choose your applications name and deploy it for free</p>
                        <label className="block text-sm font-semibold text-foreground mt-4 mb-2">Your application's URL</label>
                        <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
                          <code
                            className={classNames(
                              'flex-1 text-sm text-muted-foreground font-mono min-w-0 truncate',
                            )}
                          >
                            {previewURL}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleCopyURL}
                            className="h-8 w-8 shrink-0 rounded-lg border-border"
                          >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="custom" className="mt-0">
                    <div
                      className={classNames(
                        'bg-card rounded-md border border-border space-y-4',
                        isSmallViewport ? 'p-3' : 'p-4',
                      )}
                    >
                      <div>
                        <h3 className="text-base font-semibold text-foreground mb-1">Deploy your app to a custom domain</h3>
                        <p className="text-sm text-muted-foreground mb-4">Deploy this application to a domain of your choosing</p>
                        <label htmlFor="siteName" className="block mb-2 text-sm font-semibold text-foreground">
                          Site Name (optional)
                        </label>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                          Choose a custom prefix for your site's URL.
                        </p>
                        <div className="relative">
                          <input
                            id="siteName"
                            name="siteName"
                            type="text"
                            className="w-full p-4 pr-32 border rounded-md bg-background text-foreground border-input focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200 placeholder:text-muted-foreground"
                            value={deploySettings.siteName || ''}
                            placeholder="my-chat-app..."
                            disabled={!canDeploy}
                            onChange={(e) => {
                              handleSetDeploySettings({
                                ...deploySettings,
                                siteName: e.target.value,
                              });
                            }}
                          />
                        </div>
                        {deploySettings.siteName && (
                          <div className="mt-2 p-3 bg-muted rounded-md border border-border">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Your site will be available at:</span>
                              <br />
                              <span
                              className={classNames(
                                'font-mono text-primary text-sm block truncate',
                                { 'break-all': isSmallViewport },
                              )}
                              >
                                https://{deploySettings.siteName}.netlify.app
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div
                  className={classNames(
                    'border-t border-border',
                    isSmallViewport ? 'flex flex-col gap-3 mt-6 pt-4' : 'flex items-center justify-between gap-4 mt-8 pt-6',
                  )}
                >
                  <Button
                    variant="ghost"
                    onClick={handleCloseModal}
                    disabled={status === DeployStatus.Started}
                    className={classNames(
                      'text-foreground hover:bg-muted',
                      { 'order-last': isSmallViewport },
                    )}
                  >
                    Cancel
                  </Button>
                  <div className={classNames('flex gap-3', isSmallViewport ? 'flex-col' : 'items-center')}>
                    {hasExistingDeploy && (
                      <a
                        href={siteURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-10 gap-2 px-4 py-2 rounded-full border border-border bg-card hover:bg-muted text-foreground text-sm font-medium transition-colors"
                      >
                        <ExternalLink size={16} />
                        Go to App
                      </a>
                    )}
                    <Button
                      onClick={handleDeploy}
                      disabled={status === DeployStatus.Started || !canDeploy}
                      className={classNames(
                        'gap-2 bg-foreground rounded-full text-background hover:bg-foreground/90 disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground disabled:border disabled:border-dashed',
                        { 'w-full': isSmallViewport },
                      )}
                    >
                      {status === DeployStatus.Started ? (
                        <>
                          <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                          Deploying...
                        </>
                      ) : (
                        <>
                          <CloudUpload size={16} />
                          Deploy App
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-md">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="text-destructive flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="font-semibold mb-1">Deployment Error</p>
                        <p className="text-sm leading-relaxed">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
    </>
  );

  if (variant === 'popover') {
    return (
      <div className="relative flex flex-col max-h-[85vh] overflow-hidden">
        {modalBody}
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[1001] flex items-center justify-center p-2 sm:p-4"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        <motion.div className="absolute inset-0 bg-black/50" onClick={handleCloseModal} />
        <motion.div
          className="relative bg-card border border-border rounded-md max-w-2xl w-full mx-2 sm:mx-4 max-h-[95vh] flex flex-col"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {modalBody}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
