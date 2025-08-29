import { motion } from 'framer-motion';

export function MockupDashboard() {
  return (
    <motion.div 
      className="bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-xl p-6 w-full max-w-lg mx-auto overflow-hidden shadow-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="h-6 w-40 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-bolt-elements-background-depth-2 rounded-lg p-3 space-y-2">
              <div className="h-4 w-16 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
              <div className="h-8 w-12 bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
            </div>
          ))}
        </div>
        
        {/* Chart Area */}
        <div className="h-32 w-full bg-bolt-elements-background-depth-3 rounded animate-shimmer relative overflow-hidden" />
      </div>
    </motion.div>
  );
}
