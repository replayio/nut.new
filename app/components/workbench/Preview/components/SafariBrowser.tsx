import type { RefObject } from 'react';
import { RotateCw, MonitorSmartphone, Maximize2, Minimize2, ChevronLeft, ChevronRight } from '~/components/ui/Icon';
import { classNames } from '~/utils/classNames';

export interface SafariBrowserProps {
  url: string;
  onUrlChange: (url: string) => void;
  onUrlSubmit: () => void;
  onReload: () => void;
  onBack?: () => void;
  onForward?: () => void;
  onToggleDeviceMode?: () => void;
  onToggleFullscreen?: () => void;
  isDeviceModeOn?: boolean;
  isFullscreen?: boolean;
  inputRef?: RefObject<HTMLInputElement>;
  showAdvancedControls?: boolean;
  isMobile?: boolean;
}

export function SafariBrowser({
  url,
  onUrlChange,
  onUrlSubmit,
  onReload,
  onBack,
  onForward,
  onToggleDeviceMode,
  onToggleFullscreen,
  isDeviceModeOn = false,
  isFullscreen = false,
  inputRef,
  showAdvancedControls = true,
  isMobile = false,
}: SafariBrowserProps) {
  return (
    <div className="bg-bolt-elements-background-depth-1 border-b border-bolt-elements-borderColor border-opacity-50 shadow-sm">
      {/* Browser Chrome Top Bar */}
      <div className="flex items-center justify-between px-4 py-1">
        {/* Left: Navigation Buttons + URL Bar */}
        <div className="flex items-center gap-2 flex-1">
          {/* Back/Forward Buttons */}
          <button
            onClick={onBack}
            disabled={!onBack}
            className={classNames(
              'rounded-lg transition-all duration-200 flex-shrink-0',
              onBack
                ? 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2'
                : 'text-bolt-elements-textTertiary opacity-40 cursor-not-allowed'
            )}
            title="Go back"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={onForward}
            disabled={!onForward}
            className={classNames(
              'rounded-lg transition-all duration-200 flex-shrink-0',
              onForward
                ? 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2'
                : 'text-bolt-elements-textTertiary opacity-40 cursor-not-allowed'
            )}
            title="Go forward"
          >
            <ChevronRight size={20} />
          </button>

          {/* URL Bar */}
          <div className="h-[30px] mr-2 flex items-center gap-2 flex-1 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-md px-2.5 py-1 text-xs hover:bg-bolt-elements-background-depth-3 hover:border-bolt-elements-borderColor focus-within:bg-bolt-elements-background-depth-3 focus-within:border-blue-500/50 transition-all duration-200">
            {/* Reload Button */}
            <button
              onClick={onReload}
              className="p-1 rounded-md text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1 transition-all duration-200"
              title="Reload"
            >
              <RotateCw size={14} />
            </button>

            <input
              ref={inputRef}
              className="flex-1 bg-transparent border-none outline-none text-bolt-elements-textSecondary focus:text-bolt-elements-textPrimary"
              type="text"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onUrlSubmit();
                  if (inputRef?.current) {
                    inputRef.current.blur();
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Right: Additional Controls */}
        <div className="flex items-center gap-2">
          {showAdvancedControls && (
            <>
              <button
                onClick={onToggleDeviceMode}
                className="p-1.5 rounded-lg text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 transition-all duration-200"
                title={isDeviceModeOn ? 'Switch to Responsive Mode' : 'Switch to Device Mode'}
              >
                <MonitorSmartphone size={18} />
              </button>

              <button
                onClick={onToggleFullscreen}
                className="p-1.5 rounded-lg text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 transition-all duration-200"
                title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
