import { motion } from 'framer-motion';

interface AppLoadingScreenProps {
  appId?: string;
}

export const AppLoadingScreen = ({ appId }: AppLoadingScreenProps) => {
  return (
    <div className="h-full w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-6 max-w-md mx-auto px-6">
        <motion.div
          className="w-16 h-16 bg-muted rounded-md flex items-center justify-center border border-border"
          animate={{
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div className="w-6 h-6 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
        </motion.div>

        <div className="text-center space-y-2">
          <motion.h2
            className="text-xl font-semibold text-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Loading your app
          </motion.h2>
          <motion.p
            className="text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {appId ? `Fetching project ${appId.slice(0, 8)}...` : 'Preparing your workspace...'}
          </motion.p>
        </div>

        <div className="flex space-x-2">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-2 h-2 bg-muted-foreground rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
