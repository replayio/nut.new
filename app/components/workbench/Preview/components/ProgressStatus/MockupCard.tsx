import { motion } from 'framer-motion';

export function MockupCard() {
  return (
    <motion.div
      className="bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-xl p-6 w-full max-w-sm mx-auto overflow-hidden shadow-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-4 mb-4">
        <div className="h-12 w-12 rounded-full bg-bolt-elements-background-depth-3 animate-shimmer relative overflow-hidden" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-3/4 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
          <div className="h-3 w-1/2 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
        <div className="h-4 w-4/5 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
        <div className="h-4 w-3/5 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
      </div>
      <div className="flex justify-between items-center mt-6">
        <div className="h-8 w-16 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
        <div className="h-8 w-20 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
      </div>
    </motion.div>
  );
}
