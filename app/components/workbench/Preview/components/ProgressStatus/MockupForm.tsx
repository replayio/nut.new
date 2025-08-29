import { motion } from 'framer-motion';

export function MockupForm() {
  return (
    <motion.div 
      className="bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-xl p-6 w-full max-w-sm mx-auto overflow-hidden shadow-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-4">
        <div className="h-6 w-32 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
        <div className="space-y-3">
          <div className="h-10 w-full bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
          <div className="h-10 w-full bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
          <div className="h-24 w-full bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
        </div>
        <div className="flex justify-end space-x-2 pt-2">
          <div className="h-10 w-20 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
          <div className="h-10 w-24 bg-bolt-elements-focus/30 rounded animate-shimmer relative overflow-hidden" />
        </div>
      </div>
    </motion.div>
  );
}
