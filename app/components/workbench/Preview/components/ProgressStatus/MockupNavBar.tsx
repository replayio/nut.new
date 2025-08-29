import { motion } from 'framer-motion';

export function MockupNavBar() {
  return (
    <motion.div 
      className="bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-xl p-4 w-full mx-auto overflow-hidden shadow-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between min-w-0">
        <div className="flex items-center space-x-3 flex-shrink-0">
          <div className="h-8 w-8 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
          <div className="h-6 w-20 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="h-6 w-12 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
          <div className="h-6 w-12 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
          <div className="h-6 w-12 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
          <div className="h-8 w-8 rounded-full bg-bolt-elements-background-depth-3 animate-shimmer relative overflow-hidden" />
        </div>
      </div>
    </motion.div>
  );
}
