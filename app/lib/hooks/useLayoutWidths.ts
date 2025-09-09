import { useState, useEffect } from 'react';

interface LayoutWidths {
  chatWidth: number;
  workbenchWidth: number;
  workbenchLeft: number;
}

const CHAT_MIN_WIDTH = 500;
const CHAT_MAX_WIDTH = 600;
const CHAT_TARGET_PERCENTAGE = 0.4;

export function useLayoutWidths(hasSidebar: boolean = false): LayoutWidths {
  const [widths, setWidths] = useState<LayoutWidths>({
    chatWidth: CHAT_MIN_WIDTH,
    workbenchWidth: 0,
    workbenchLeft: CHAT_MIN_WIDTH,
  });

  useEffect(() => {
    const calculateWidths = () => {
      const windowWidth = window.innerWidth;
      const availableWidth = windowWidth;

      const targetChatWidth = availableWidth * CHAT_TARGET_PERCENTAGE;

      const chatWidth = Math.min(Math.max(targetChatWidth, CHAT_MIN_WIDTH), CHAT_MAX_WIDTH);

      const workbenchWidth = Math.max(0, availableWidth - chatWidth);

      const workbenchLeft = chatWidth;

      setWidths({
        chatWidth,
        workbenchWidth,
        workbenchLeft,
      });
    };

    calculateWidths();

    window.addEventListener('resize', calculateWidths);

    return () => {
      window.removeEventListener('resize', calculateWidths);
    };
  }, [hasSidebar]);

  return widths;
}
