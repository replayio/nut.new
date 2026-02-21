import { motion } from 'framer-motion';

export function MockupDashboard() {
  return (
    <motion.div
      className="bg-card border border-border rounded-xl p-4 w-full max-w-lg mx-auto overflow-hidden shadow-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="h-5 w-32 bg-accent rounded animate-shimmer relative overflow-hidden" />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-muted rounded-lg p-2 space-y-1.5">
              <div className="h-3 w-12 bg-accent rounded animate-shimmer relative overflow-hidden" />
              <div className="h-6 w-10 bg-accent rounded animate-shimmer relative overflow-hidden" />
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div className="h-16 w-full bg-accent rounded animate-shimmer relative overflow-hidden" />
      </div>
    </motion.div>
  );
}
