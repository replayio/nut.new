import { useState, useRef, useEffect } from 'react';
import { classNames } from '~/utils/classNames';

interface ColorPickerProps {
  value: string; // HSL format like "221 83% 53%"
  onChange: (value: string) => void;
}

export const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Convert HSL string to hex for color input and display
  const hslToHex = (hslString: string): string => {
    const parts = hslString.split(' ');
    if (parts.length !== 3) {
      return '#000000';
    }

    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r = 0,
      g = 0,
      b = 0;

    if (h >= 0 && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h >= 60 && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h >= 180 && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h >= 240 && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (h >= 300 && h < 360) {
      r = c;
      g = 0;
      b = x;
    }

    const toHex = (n: number) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Convert hex to HSL string
  const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  // Sync localValue with prop changes (e.g., when preset theme is applied)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    const hsl = hexToHsl(hex);
    setLocalValue(hsl);
    onChange(hsl);
  };

  const handleSwatchSelect = (color: string) => {
    const hsl = hexToHsl(color);
    setLocalValue(hsl);
    onChange(hsl);
    setIsOpen(false);
  };

  const hexValue = hslToHex(localValue);

  // Color swatches based on theme colors - picking the best primary color to represent each theme
  const colorSwatches = [
    '#000000',
    '#FFFFFF', // Base colors
    '#8b5cf6', // Purple
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f97316', // Orange
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#dc2626', // Red
    '#f59e0b', // Gold
    '#6366f1', // Indigo
    '#f43f5e', // Coral
    '#059669', // Emerald
    '#7c3aed', // Violet
    '#06b6d4', // Cyan
    '#65a30d', // Lime
    '#d97706', // Amber
    '#e11d48', // Rose
    '#475569', // Slate
    '#c026d3', // Fuchsia
    '#0ea5e9', // Sky
    '#eab308', // Yellow
    '#6b7280', // Gray
    '#71717a', // Zinc
    '#737373', // Neutral
  ];

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded hover:border-bolt-elements-borderColorActive transition-colors"
      >
        <div
          className="w-6 h-6 rounded border border-bolt-elements-borderColor"
          style={{ backgroundColor: `hsl(${localValue})` }}
        />
        <input
          type="text"
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value);
            onChange(e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-32 text-xs bg-transparent outline-none text-bolt-elements-textPrimary placeholder:text-bolt-elements-textSecondary"
          placeholder="0 0% 0%"
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg shadow-xl z-[9999] min-w-[280px]">
          <div className="space-y-4">
            {/* Native Color Picker */}
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={hexValue}
                onChange={handleColorChange}
                className="w-12 h-12 border border-bolt-elements-borderColor rounded cursor-pointer"
              />
              <div className="space-y-1">
                <div className="text-xs text-bolt-elements-textSecondary">Hex</div>
                <input
                  type="text"
                  value={hexValue}
                  onChange={(e) => {
                    if (e.target.value.match(/^#[0-9A-Fa-f]{6}$/)) {
                      const hsl = hexToHsl(e.target.value);
                      setLocalValue(hsl);
                      onChange(hsl);
                    }
                  }}
                  className="px-2 py-1 text-xs bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded w-24 text-bolt-elements-textPrimary focus:border-bolt-elements-borderColorActive focus:outline-none"
                />
              </div>
            </div>

            {/* HSL Values */}
            <div className="space-y-2">
              <div className="text-xs text-bolt-elements-textSecondary">HSL Values</div>
              <div className="grid grid-cols-3 gap-2">
                {localValue.split(' ').map((part, index) => (
                  <input
                    key={index}
                    type="text"
                    value={part}
                    onChange={(e) => {
                      const parts = localValue.split(' ');
                      parts[index] = e.target.value;
                      const newValue = parts.join(' ');
                      setLocalValue(newValue);
                      onChange(newValue);
                    }}
                    className="px-2 py-1 text-xs bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded text-bolt-elements-textPrimary focus:border-bolt-elements-borderColorActive focus:outline-none"
                    placeholder={index === 0 ? 'H' : index === 1 ? 'S' : 'L'}
                  />
                ))}
              </div>
            </div>

            {/* Color Swatches */}
            <div className="space-y-2">
              <div className="text-xs text-bolt-elements-textSecondary">Presets</div>
              <div className="p-2 bg-bolt-elements-background-depth-2 rounded">
                <div className="flex flex-wrap gap-2">
                  {colorSwatches.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleSwatchSelect(color)}
                      className={classNames(
                        'w-8 h-8 rounded-sm border-2 cursor-pointer hover:scale-110 transition-transform',
                        hexValue.toLowerCase() === color.toLowerCase()
                          ? 'border-bolt-elements-borderColorActive'
                          : 'border-transparent hover:border-bolt-elements-borderColorActive',
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
