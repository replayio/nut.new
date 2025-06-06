import { useState, useEffect } from 'react';
import { classNames } from '~/utils/classNames';
import { usePlanCheckerVisibility } from '~/lib/stores/planChecker';

interface PlanSection {
  id: string;
  title: string;
  content: string;
  checked: boolean;
  handleSendMessage?: (event: React.UIEvent, messageInput?: string) => void;
}

const PlanChecker = ({ handleSendMessage }: { handleSendMessage?: (event: React.UIEvent, messageInput?: string) => void }) => {
  const { savePromptMessage } = usePlanCheckerVisibility();
  const [sections, setSections] = useState<PlanSection[]>([
    {
      id: 'graph',
      title: 'Graph Section',
      content: 'The main interface should feature a graph section displaying real-time price charts with technical indicators, candlestick patterns, and customizable timeframes for market analysis.',
      checked: true
    },
    {
      id: 'ticker',
      title: 'Ticker Description',
      content: 'Below that, implement a ticker description section that shows detailed company information, financial metrics, news feeds, and key statistics for the selected stock or asset.',
      checked: true
    },
    {
      id: 'trading',
      title: 'Buy/Sell Section',
      content: 'The buy/sell section should include order placement functionality with market/limit order options, portfolio balance display, position sizing tools, and transaction history.',
      checked: true
    },
    {
      id: 'general',
      title: 'General Features',
      content: 'The application should also integrate with financial data APIs for live market data and include responsive design principles to ensure optimal viewing across desktop and mobile devices.',
      checked: true
    }
  ]);

  const [newFeature, setNewFeature] = useState('');

  const handleCheckboxChange = (id: string) => {
    setSections(prevSections =>
      prevSections.map(section =>
        section.id === id ? { ...section, checked: !section.checked } : section
      )
    );
  };

  const generatePrompt = (): string => {
    const selectedSections = sections.filter(section => section.checked);
    if (selectedSections.length === 0) return '';

    return `Build me a comprehensive trading dashboard web application with the following features: ${selectedSections
      .map(section => section.content)
      .join(' ')}`;
  };

  const handleSubmit = (event: React.UIEvent) => {
    console.log('Submit');
    handleSendMessage?.(event, generatePrompt());
  };

  useEffect(() => {
    savePromptMessage(generatePrompt());
  }, [sections]);

  const handleAddFeature = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newFeature.trim()) {
      const title = newFeature.split(' ').slice(0, 3).join(' ');
      const content = `The application should also include ${newFeature.trim().toLowerCase()} functionality to enhance the trading experience.`;
      
      setSections(prev => [...prev, {
        id: `section-${Date.now()}`,
        title: `${title}`,
        content,
        checked: true
      }]);
      setNewFeature('');
    }
  };

  return (
    <div
      data-testid="message"
      className={classNames(
        'flex gap-4 p-6 w-full rounded-[calc(0.75rem-1px)] mt-4 bg-bolt-elements-messages-background text-bolt-elements-textPrimary'
      )}
    >
      <div className="flex flex-col gap-2 w-full">
        <div className="text-lg font-semibold mb-2">Feature List</div>
        <div className="space-y-4">
          {sections.map(section => (
            <div key={section.id} className="flex items-start space-x-2">
              <input
                type="checkbox"
                id={section.id}
                checked={section.checked}
                onChange={() => handleCheckboxChange(section.id)}
                className="mt-1"
              />
              <label htmlFor={section.id} className="cursor-pointer flex-1">
                <div className="font-medium">{section.title}</div>
                <div className="text-bolt-elements-textSecondary text-sm">{section.content}</div>
              </label>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-bolt-elements-messages-background rounded-lg border border-bolt-elements-textSecondary/20">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-medium">Add Feature</h3>
          </div>
          <input
            type="text"
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            onKeyDown={handleAddFeature}
            placeholder="Type a feature and press Enter"
            className="w-full p-2 text-sm text-bolt-elements-textPrimary bg-transparent border border-bolt-elements-textSecondary/20 rounded-md focus:outline-none focus:border-bolt-elements-textSecondary hover:border-bolt-elements-textSecondary/40 transition-colors"
          />
          <button className="bg-green-500 text-bolt-elements-textPrimary px-4 py-2 rounded-md mt-2">
            <span className="i-ph:send-simple" />
            Add
          </button>
        </div>
        <div className="flex items-center gap-2 mt-4 justify-between">
          <div className="flex items-center gap-2">
            If this looks good, click "Submit" and I will get started.
          </div>
          <button onClick={handleSubmit} className="bg-green-500 text-bolt-elements-textPrimary px-4 py-2 rounded-md">
            <span className="i-ph:send-simple" />
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanChecker;
