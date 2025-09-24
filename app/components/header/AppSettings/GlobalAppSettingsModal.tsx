import { useStore } from '@nanostores/react';
import { appSettingsModalStore } from '~/lib/stores/appSettingsModal';
import { chatStore } from '~/lib/stores/chat';
import { database } from '~/lib/persistence/apps';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'react-toastify';

export function GlobalAppSettingsModal() {
  const isOpen = useStore(appSettingsModalStore.isOpen);
  const settings = useStore(appSettingsModalStore.settings);
  const loadingData = useStore(appSettingsModalStore.loadingData);
  const error = useStore(appSettingsModalStore.error);
  const appId = useStore(chatStore.currentAppId);

  const [newDomain, setNewDomain] = useState('');

  const handleCloseModal = () => {
    appSettingsModalStore.close();
  };

  const handleSaveSettings = async () => {
    if (!appId) {
      toast.error('No app ID found');
      return;
    }

    try {
      // Update app title if changed
      if (settings.name) {
        await database.updateAppTitle(appId, settings.name);
        chatStore.appTitle.set(settings.name);
        toast.success('App settings updated successfully');
      }

      handleCloseModal();
    } catch (error) {
      console.error('Error saving app settings:', error);
      toast.error('Failed to save app settings');
    }
  };

  const handleNameChange = (name: string) => {
    appSettingsModalStore.updateSetting('name', name);
  };

  const handleAuthToggle = (enabled: boolean) => {
    appSettingsModalStore.updateSetting('authenticationRequired', enabled);
  };

  const handleAddDomain = () => {
    if (newDomain.trim()) {
      const currentDomains = settings.domainWhitelist || [];
      appSettingsModalStore.updateSetting('domainWhitelist', [...currentDomains, newDomain.trim()]);
      setNewDomain('');
    }
  };

  const handleRemoveDomain = (domain: string) => {
    const currentDomains = settings.domainWhitelist || [];
    appSettingsModalStore.updateSetting('domainWhitelist', currentDomains.filter(d => d !== domain));
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

  if (!isOpen) {
    return null;
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
        <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseModal} />

        <motion.div
          className="relative bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor/50 rounded-2xl shadow-2xl hover:shadow-3xl transition-shadow duration-300 max-w-2xl w-full mx-2 sm:mx-4 max-h-[95vh] flex flex-col backdrop-blur-sm"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={handleCloseModal}
              className="w-10 h-10 rounded-2xl bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor hover:bg-bolt-elements-background-depth-3 transition-all duration-200 flex items-center justify-center text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary shadow-sm hover:shadow-md hover:scale-105 group"
            >
              <div className="i-ph:x text-lg transition-transform duration-200 group-hover:scale-110" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 min-h-0">
            {loadingData ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-bolt-elements-background-depth-2 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-bolt-elements-borderColor">
                  <div className="w-8 h-8 border-2 border-bolt-elements-borderColor border-t-blue-500 rounded-full animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-bolt-elements-textHeading mb-2">Loading settings...</h3>
                <p className="text-bolt-elements-textSecondary">
                  Please wait while we load your app settings
                </p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-bolt-elements-background-depth-2 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-bolt-elements-borderColor">
                    <div className="i-ph:gear text-2xl text-bolt-elements-textSecondary" />
                  </div>
                  <h2 className="text-2xl font-bold text-bolt-elements-textHeading">App Settings</h2>
                  <p className="text-bolt-elements-textSecondary mt-2">
                    Configure your application settings and preferences
                  </p>
                </div>

                <div className="space-y-6">
                  {/* App Name Section */}
                  <div className="p-6 bg-bolt-elements-background-depth-2 rounded-2xl border border-bolt-elements-borderColor">
                    <h3 className="text-lg font-semibold text-bolt-elements-textHeading mb-4 flex items-center gap-2">
                      <div className="i-ph:textbox text-lg" />
                      App Name
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">
                          Name should be editable
                        </label>
                        <input
                          type="text"
                          className="w-full p-3 border rounded-2xl bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                          value={settings.name || ''}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="Enter app name..."
                        />
                      </div>
                      <p className="text-sm text-bolt-elements-textSecondary">
                        Once edited, it should also update the name in the header of the generated app UI
                      </p>
                    </div>
                  </div>

                  {/* App Icon Section */}
                  <div className="p-6 bg-bolt-elements-background-depth-2 rounded-2xl border border-bolt-elements-borderColor">
                    <h3 className="text-lg font-semibold text-bolt-elements-textHeading mb-4 flex items-center gap-2">
                      <div className="i-ph:image text-lg" />
                      App Icon
                    </h3>
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <button className="px-4 py-2.5 bg-bolt-elements-button-secondary-background border border-bolt-elements-borderColor rounded-2xl hover:bg-bolt-elements-button-secondary-backgroundHover text-bolt-elements-button-secondary-text transition-colors text-sm font-medium">
                          Browse for an icon
                        </button>
                        <button className="px-4 py-2.5 bg-bolt-elements-button-secondary-background border border-bolt-elements-borderColor rounded-2xl hover:bg-bolt-elements-button-secondary-backgroundHover text-bolt-elements-button-secondary-text transition-colors text-sm font-medium">
                          Replace existing icon
                        </button>
                        <button className="px-4 py-2.5 bg-bolt-elements-button-danger-background border border-red-500/30 text-bolt-elements-button-danger-text rounded-2xl hover:bg-bolt-elements-button-danger-backgroundHover transition-colors text-sm font-medium">
                          Delete icon†
                        </button>
                      </div>
                      <div className="text-sm text-bolt-elements-textSecondary space-y-1">
                        <p><strong>BONUS:</strong> <em>Choose from a library of icons that can be used as the app logo</em></p>
                        <p><strong>BONUS BONUS:</strong> <em>generate an icon with AI</em></p>
                      </div>
                    </div>
                  </div>

                  {/* Authentication Settings */}
                  <div className="p-6 bg-bolt-elements-background-depth-2 rounded-2xl border border-bolt-elements-borderColor">
                    <h3 className="text-lg font-semibold text-bolt-elements-textHeading mb-4 flex items-center gap-2">
                      <div className="i-ph:shield-check text-lg" />
                      Authentication Settings
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="authToggle"
                          checked={settings.authenticationRequired || false}
                          onChange={(e) => handleAuthToggle(e.target.checked)}
                          className="w-4 h-4 rounded border-2 border-bolt-elements-borderColor text-blue-500 focus:ring-2 focus:ring-blue-500/50"
                        />
                        <label htmlFor="authToggle" className="text-bolt-elements-textPrimary font-medium">
                          Toggle for requiring authentication
                        </label>
                      </div>

                      {settings.authenticationRequired && (
                        <div className="mt-6 p-4 bg-bolt-elements-background-depth-3 rounded-lg border border-bolt-elements-borderColor">
                          <h4 className="font-medium text-bolt-elements-textPrimary mb-3">Domain whitelist:</h4>
                          <p className="text-sm text-bolt-elements-textSecondary mb-4">
                            (ex: add replay.io so the app only allows log ins from that domain) — only show this when
                            authentication is turned <strong>ON</strong> (there's also an argument to keep it visible, so users can fine tune it before
                            turning Auth on). That is the most hospitable way to do it.
                          </p>
                          
                          <div className="space-y-3">
                            {/* Domain List */}
                            {settings.domainWhitelist && settings.domainWhitelist.length > 0 && (
                              <div className="space-y-2">
                                {settings.domainWhitelist.map((domain, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor">
                                    <span className="text-sm text-bolt-elements-textPrimary font-mono">{domain}</span>
                                    <button
                                      onClick={() => handleRemoveDomain(domain)}
                                      className="text-bolt-elements-button-danger-text hover:bg-bolt-elements-button-danger-background p-1 rounded transition-colors"
                                    >
                                      <div className="i-ph:x text-sm" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Add Domain */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                placeholder="example.com"
                                className="flex-1 p-2 border rounded-lg bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-sm"
                                onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
                              />
                              <button
                                onClick={handleAddDomain}
                                className="px-4 py-2.5 bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text rounded-2xl hover:bg-bolt-elements-button-primary-backgroundHover transition-colors text-sm font-medium"
                              >
                                Add
                              </button>
                            </div>
                            
                            <div className="text-xs text-bolt-elements-textSecondary space-y-1">
                              <p>i. unlimited number of domains can be added</p>
                              <p>ii. must be able to delete a whitelisted domain</p>
                              <p>iii. Domain whitelist must be saved to the project, even when the auth is toggled to OFF (so it's there when
                                user toggles it back ON)</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* API Integrations */}
                  <div className="p-6 bg-bolt-elements-background-depth-2 rounded-2xl border border-bolt-elements-borderColor">
                    <h3 className="text-lg font-semibold text-bolt-elements-textHeading mb-4 flex items-center gap-2">
                      <div className="i-ph:plug text-lg" />
                      API Integrations
                    </h3>
                    <div className="space-y-4">
                      <p className="text-sm text-bolt-elements-textSecondary mb-4">
                        Show a card for each third-party API the app uses
                      </p>
                      
                      {settings.apiIntegrations?.map((integration, index) => (
                        <div key={index} className="p-4 bg-bolt-elements-background-depth-3 rounded-lg border border-bolt-elements-borderColor">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-bolt-elements-textPrimary">{integration.name}</h4>
                            <div className="flex items-center gap-2">
                              {integration.configured && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full border border-green-200 font-medium">
                                  Configured
                                </span>
                              )}
                              {integration.credentialsSet && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full border border-blue-200 font-medium">
                                  Credentials Set
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button className="text-sm px-4 py-2.5 bg-bolt-elements-button-secondary-background border border-bolt-elements-borderColor rounded-2xl hover:bg-bolt-elements-button-secondary-backgroundHover text-bolt-elements-button-secondary-text transition-colors font-medium">
                              Manage API credentials
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="text-sm text-bolt-elements-textSecondary space-y-2 mt-4 p-4 bg-bolt-elements-background-depth-3 rounded-lg border border-bolt-elements-borderColor">
                        <p><strong>Include the built-in API connections Nut sets up (openAI, Anthropic, etc.)</strong></p>
                        <p><strong>Include them whether or not the secret key/appId/etc. are entered (this is another way a user can plug in
                          the API credentials).</strong></p>
                        <p><strong>Users must be able to manage their API credentials</strong></p>
                        <p><strong>OUT OF SCOPE:</strong></p>
                        <p>i. adding a new API integration</p>
                        <p>ii. Deleting an API integration</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-bolt-elements-borderColor">
                  <button
                    onClick={handleCloseModal}
                    className="px-6 py-3 bg-bolt-elements-button-secondary-background text-bolt-elements-button-secondary-text hover:bg-bolt-elements-button-secondary-backgroundHover border border-bolt-elements-borderColor rounded-2xl transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-bolt-elements-textHeading hover:bg-bolt-elements-button-primary-backgroundHover rounded-2xl transition-all duration-200 font-medium"
                  >
                    Save Settings
                  </button>
                </div>

                {error && (
                  <div className="mt-6 p-4 bg-bolt-elements-button-danger-background border border-red-500/30 text-bolt-elements-button-danger-text rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="i-ph:warning-circle text-lg text-bolt-elements-button-danger-text flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">Settings Error</p>
                        <p className="text-sm leading-relaxed">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
