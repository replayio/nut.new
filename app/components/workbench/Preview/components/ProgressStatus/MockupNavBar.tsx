import { motion } from 'framer-motion';

export function MockupNavBar() {
  return (
    <motion.div
      className="bg-card border border-border rounded-xl p-3 w-full mx-auto overflow-hidden shadow-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between min-w-0">
        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="h-6 w-6 bg-accent rounded animate-shimmer relative overflow-hidden" />
          <div className="h-5 w-16 bg-accent rounded animate-shimmer relative overflow-hidden" />
        </div>
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <div className="h-5 w-8 bg-accent rounded animate-shimmer relative overflow-hidden" />
          <div className="h-5 w-8 bg-accent rounded animate-shimmer relative overflow-hidden" />
          <div className="h-5 w-8 bg-accent rounded animate-shimmer relative overflow-hidden" />
          <div className="h-6 w-6 rounded-full bg-accent animate-shimmer relative overflow-hidden" />
        </div>
      </div>
    </motion.div>
  );
}
