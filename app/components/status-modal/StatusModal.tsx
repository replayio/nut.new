import React from 'react';
import { useStore } from '@nanostores/react';
import { motion, AnimatePresence } from 'framer-motion';
import { statusModalStore } from '~/lib/stores/statusModal';
import { IconButton } from '~/components/ui/IconButton';
import { classNames } from '~/utils/classNames';
import type { AppSummary } from '~/lib/persistence/messageAppSummary';

interface StatusModalProps {
  appSummary: AppSummary;
  onContinueBuilding: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({ appSummary, onContinueBuilding }) => {
  const isOpen = useStore(statusModalStore.isOpen);

  const features = appSummary.features || [];
  const completedFeatures = features.filter(
    (feature) =>
      feature.status === 'Implemented' || feature.status === 'Validated' || feature.status === 'ValidationFailed',
  ).length;
  const totalFeatures = features.length;
  const isFullyComplete = completedFeatures === totalFeatures && totalFeatures > 0;

  const handleClose = () => {
    statusModalStore.close();
  };

  const handleContinueBuilding = () => {
    statusModalStore.close();
    onContinueBuilding();
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

  const celebrationVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: [0, 1.2, 1],
      rotate: [0, 360, 0],
      transition: {
        duration: 0.8,
        times: [0, 0.6, 1],
        ease: 'easeInOut',
        delay: 0.3,
      },
    },
  };

  const progressBarVariants = {
    hidden: { width: 0 },
    visible: {
      width: `${(completedFeatures / totalFeatures) * 100}%`,
      transition: {
        duration: 1,
        ease: 'easeInOut',
        delay: 0.5,
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

          <motion.div
            className="relative bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-xl shadow-2xl max-w-md w-full mx-4"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="absolute top-4 right-4 z-10">
              <IconButton icon="i-ph:x" onClick={handleClose} className="hover:bg-bolt-elements-background-depth-2" />
            </div>

            <div className="p-8 text-center">
              <motion.div
                className="mx-auto mb-6 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
                variants={celebrationVariants}
                initial="hidden"
                animate="visible"
              >
                <div className="text-3xl text-white">{isFullyComplete ? '🎉' : '🚀'}</div>
              </motion.div>

              <motion.h2
                className="text-2xl font-bold text-bolt-elements-textPrimary mb-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                {isFullyComplete ? 'Build Complete!' : 'Build Status'}
              </motion.h2>

              <motion.p
                className="text-bolt-elements-textSecondary mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                {isFullyComplete
                  ? 'Congratulations! All features have been successfully implemented.'
                  : 'Great progress! Your app is taking shape.'}
              </motion.p>

              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-bolt-elements-textPrimary">Features Complete</span>
                  <span className="text-sm font-bold text-bolt-elements-textPrimary">
                    {completedFeatures}/{totalFeatures}
                  </span>
                </div>

                <div className="w-full bg-bolt-elements-background-depth-3 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className={classNames(
                      'h-full rounded-full',
                      isFullyComplete
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500',
                    )}
                    variants={progressBarVariants}
                    initial="hidden"
                    animate="visible"
                  />
                </div>

                {totalFeatures > 0 && (
                  <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-bolt-elements-textSecondary truncate">{feature.name}</span>
                        <div
                          className={classNames(
                            'flex items-center gap-1',
                            feature.status === 'Implemented' || feature.status === 'Validated'
                              ? 'text-green-500'
                              : feature.status === 'ValidationFailed'
                                ? 'text-yellow-500'
                                : 'text-bolt-elements-textTertiary',
                          )}
                        >
                          {(feature.status === 'Implemented' || feature.status === 'Validated') && (
                            <div className="i-ph:check-circle-fill text-xs" />
                          )}
                          {feature.status === 'ValidationFailed' && (
                            <div className="i-ph:warning-circle-fill text-xs" />
                          )}
                          {(feature.status === 'NotStarted' || feature.status === 'ImplementationInProgress') && (
                            <div className="i-ph:circle text-xs" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              <motion.div
                className="flex flex-col gap-3 justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.5 }}
              >
                {!isFullyComplete && (
                  <div className="flex justify-center items-center w-full">
                    <button
                      onClick={handleContinueBuilding}
                      className="px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2"
                    >
                      <div className="i-ph:rocket-launch text-xl"></div>
                      Continue Building
                    </button>
                  </div>
                )}

                <button
                  onClick={handleClose}
                  className={classNames(
                    'px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3',
                    isFullyComplete
                      ? 'bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3'
                      : 'bg-transparent text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary',
                  )}
                >
                  {isFullyComplete ? 'Close' : 'Cancel'}
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
