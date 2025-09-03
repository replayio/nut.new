import { motion } from 'framer-motion';

export function MockupForm() {
  return (
    <motion.div
      className="bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-xl p-4 w-full max-w-sm mx-auto overflow-hidden shadow-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-3">
        <div className="h-5 w-28 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
        <div className="space-y-2.5">
          <div className="h-9 w-full bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
          <div className="h-9 w-full bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
          <div className="h-16 w-full bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
        </div>
        <div className="flex justify-end space-x-2 pt-1">
          <div className="h-8 w-16 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
          <div className="h-8 w-20 bg-bolt-elements-focus/30 rounded animate-shimmer relative overflow-hidden" />
        </div>
      </div>
    </motion.div>
  );
}
