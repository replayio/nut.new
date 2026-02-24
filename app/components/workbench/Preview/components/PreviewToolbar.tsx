import { memo, type RefObject } from 'react';
import { Monitor, ExternalLink, Eye, Paintbrush, Shrink, RefreshCcw, Fullscreen } from 'lucide-react';
import { classNames } from '~/utils/classNames';
import { Button } from '~/components/ui/button';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import WithTooltip from '~/components/ui/Tooltip';

type PreviewMode = 'preview' | 'editor';

interface PreviewToolbarProps {
  url: string;
  activeMode: PreviewMode;
  isDeviceModeOn: boolean;
  isFullscreen: boolean;
  isElementPickerReady: boolean;
  isSmallViewport: boolean;
  inputRef: RefObject<HTMLInputElement>;
  iframeUrl: string | undefined;
  onUrlChange: (url: string) => void;
  onUrlSubmit: () => void;
  onModeChange: (mode: PreviewMode) => void;
  onToggleDeviceMode: () => void;
  onToggleFullscreen: () => void;
  onReload: () => void;
  onOpenInNewTab: () => void;
  onElementPickerToggle: () => void;
}

export const PreviewToolbar = memo(
  ({
    url,
    activeMode,
    isDeviceModeOn,
    isFullscreen,
    isElementPickerReady,
    isSmallViewport,
    inputRef,
    onUrlChange,
    onUrlSubmit,
    onModeChange,
    onToggleDeviceMode,
    onToggleFullscreen,
    onReload,
    onOpenInNewTab,
    onElementPickerToggle,
  }: PreviewToolbarProps) => {
    return (
      <TooltipProvider>
        <div className="bg-card border-b border-border p-2 flex items-center justify-between gap-2">
          {/* Left: Preview/Editor Toggle */}
          {!isSmallViewport && (
            <div className="flex items-center h-9 bg-muted rounded-lg p-1">
              <button
                onClick={() => {
                  onModeChange('preview');
                  onElementPickerToggle();
                }}
                className={classNames(
                  'flex items-center justify-center gap-2 px-2 py-1 text-sm font-medium rounded-md transition-all',
                  activeMode === 'preview'
                    ? 'bg-background text-foreground border border-input shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Eye size={16} />
                Preview
              </button>
              <button
                onClick={() => {
                  onModeChange('editor');
                  onElementPickerToggle();
                }}
                className={classNames(
                  'flex items-center justify-center gap-2 px-2 py-1 text-sm font-medium rounded-md transition-all',
                  activeMode === 'editor'
                    ? 'bg-background text-foreground border border-input shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                disabled={!isElementPickerReady || isSmallViewport}
              >
                <Paintbrush size={16} />
                Editor
              </button>
            </div>
          )}

          {/* Center: Device Selector + URL */}
          <div className="flex h-9 w-fit items-center justify-center gap-1 border border-border border-solid rounded-full px-1">
            <Button
              variant="outline"
              onClick={onToggleDeviceMode}
              className="flex items-center gap-1.5 h-7 px-3 text-sm text-muted-foreground hover:text-foreground rounded-full"
            >
              <Monitor size={16} />
              {isDeviceModeOn ? 'Multi-Device' : 'Desktop'}
            </Button>

            <div className="flex items-center px-2 w-fit">
              <input
                title="URL"
                ref={inputRef}
                className="w-[100px] sm:w-[200px] md:w-[200px] lg:w-[200px] xl:w-[200px] bg-transparent text-sm text-muted-foreground border-none outline-none focus:ring-0 p-0 truncate"
                type="text"
                value={url}
                placeholder="https://"
                onChange={(event) => onUrlChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    onUrlSubmit();
                    inputRef.current?.blur();
                  }
                }}
              />
            </div>

            <WithTooltip tooltip="Open in new tab">
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenInNewTab}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <ExternalLink size={16} />
              </Button>
            </WithTooltip>

            <WithTooltip tooltip="Reload">
              <Button
                variant="ghost"
                size="icon"
                onClick={onReload}
                className="h-7 w-7 min-w-7 text-muted-foreground hover:text-foreground border border-border rounded-full p-0"
              >
                <RefreshCcw size={16} />
              </Button>
            </WithTooltip>
          </div>

          <WithTooltip tooltip="Toggle full screen">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFullscreen}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              {isFullscreen ? <Shrink size={16} /> : <Fullscreen size={16} />}
            </Button>
          </WithTooltip>
        </div>
      </TooltipProvider>
    );
  },
);

PreviewToolbar.displayName = 'PreviewToolbar';
