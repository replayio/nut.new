import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MockupCard } from './MockupCard';
import { MockupNavBar } from './MockupNavBar';
import { MockupForm } from './MockupForm';
import { MockupDashboard } from './MockupDashboard';

const messages = [
  "Thinking about your idea...",
  "Jacking into the matrix...", 
  "Exploring UI elements...",
  "Sprinkling a bit of magic...",
  "Putting it all together..."
];

const mockupLayouts = [
  { component: MockupCard, duration: 3000 },
  { component: MockupNavBar, duration: 2800 },
  { component: MockupForm, duration: 3200 },
  { component: MockupDashboard, duration: 3500 },
];

const ProgressStatus = () => {
  const [currentLayoutIndex, setCurrentLayoutIndex] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Cycle through mockup layouts and messages with synchronized timing
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentLayoutIndex((prev) => (prev + 1) % mockupLayouts.length);
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, mockupLayouts[currentLayoutIndex].duration);

    return () => clearInterval(timer);
  }, [currentLayoutIndex]);

  const CurrentMockup = mockupLayouts[currentLayoutIndex].component;
  const currentMessage = messages[currentMessageIndex];

  return (
    <div className="w-full h-full relative">
      {/* Animated gradient border */}
      <div className="absolute inset-0 p-[3px] animate-focus-border opacity-60">
        <div className="w-full h-full bg-bolt-elements-background-depth-2" />
      </div>
      
      {/* Main content container */}
      <div className="relative w-full h-full flex items-center justify-center p-6 overflow-hidden">
        {/* Mockup Layout - centered and constrained */}
        <div 
          className="w-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
          style={{ maxWidth: '400px', minWidth: '300px', marginTop: '-30px' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentLayoutIndex}
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05, y: -30 }}
              transition={{ 
                duration: 0.7, 
                ease: [0.4, 0.0, 0.2, 1]
              }}
            >
              <CurrentMockup />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Text and dots positioned closer to mockup */}
        <div className="absolute left-0 right-0" style={{ top: 'calc(50% + 220px)' }}>
          {/* Animated gradient text */}
          <div className="text-center mb-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentMessageIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ 
                  duration: 0.5,
                  ease: [0.4, 0.0, 0.2, 1]
                }}
              >
                <div 
                  className="animate-focus-text text-2xl font-medium"
                >
                  {currentMessage}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Animated loading dots */}
          <div className="flex justify-center space-x-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <motion.div
                key={index}
                className="w-2 h-2 rounded-full bg-bolt-elements-textSecondary/60"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 1, 0.4]
                }}
                transition={{ 
                  duration: 1.5,
                  delay: index * 0.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressStatus;
