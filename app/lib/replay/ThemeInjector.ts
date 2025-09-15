/**
 * ThemeInjector manages CSS variable synchronization between the parent app and iframe content.
 * Supports both hash-based and postMessage communication methods.
 */

export class ThemeInjector {
  private iframe: HTMLIFrameElement | null = null;
  private baseUrl: string | null = null;

  /**
   * Set the iframe element to inject themes into
   */
  setIframe(iframe: HTMLIFrameElement) {
    this.iframe = iframe;
    if (iframe.src) {
      try {
        const url = new URL(iframe.src);
        this.baseUrl = `${url.protocol}//${url.host}${url.pathname}${url.search}`;
      } catch (e) {
        console.error('Failed to parse iframe URL:', e);
      }
    }
  }

  /**
   * Update CSS variables via URL hash parameters
   * This method updates the iframe src with new hash containing theme variables
   */
  updateVariables(variables: Record<string, string>) {
    if (!this.iframe || !this.baseUrl) {
      return;
    }

    const encoded = encodeURIComponent(JSON.stringify(variables));
    this.iframe.src = `${this.baseUrl}#theme=${encoded}`;
  }

  /**
   * Update CSS variables via postMessage (alternative method)
   * Works without page reload but requires message listener in iframe
   */
  updateVariablesViaMessage(variables: Record<string, string>) {
    if (!this.iframe?.contentWindow) {
      return;
    }

    this.iframe.contentWindow.postMessage(
      {
        type: 'UPDATE_CSS_VARIABLES',
        variables,
      },
      '*',
    );
  }

  /**
   * Update a single CSS variable
   */
  updateVariable(name: string, value: string) {
    this.updateVariables({ [name]: value });
  }

  /**
   * Sync bolt theme variables to demo app variables
   * Maps parent app's CSS variables to iframe's expected format
   */
  syncBoltTheme() {
    const computedStyle = getComputedStyle(document.documentElement);
    const variables: Record<string, string> = {};

    // Map bolt variables to demo app variables
    // Note: Bolt uses RGB/HSL values, demo app expects HSL format
    const mappings: Record<string, string> = {
      '--background': '--bolt-elements-bg-depth-1',
      '--foreground': '--bolt-elements-textPrimary',
      '--card': '--bolt-elements-bg-depth-2',
      '--card-foreground': '--bolt-elements-textPrimary',
      '--popover': '--bolt-elements-bg-depth-1',
      '--popover-foreground': '--bolt-elements-textPrimary',
      '--primary': '--bolt-elements-button-primary-background',
      '--primary-foreground': '--bolt-elements-button-primary-text',
      '--secondary': '--bolt-elements-button-secondary-background',
      '--secondary-foreground': '--bolt-elements-button-secondary-text',
      '--muted': '--bolt-elements-bg-depth-3',
      '--muted-foreground': '--bolt-elements-textTertiary',
      '--accent': '--bolt-elements-button-primary-background',
      '--accent-foreground': '--bolt-elements-button-primary-text',
      '--destructive': '--bolt-elements-button-danger-background',
      '--destructive-foreground': '--bolt-elements-button-danger-text',
      '--border': '--bolt-elements-borderColor',
      '--input': '--bolt-elements-borderColor',
      '--ring': '--bolt-elements-borderColorActive',
    };

    Object.entries(mappings).forEach(([demoVar, boltVar]) => {
      const value = computedStyle.getPropertyValue(boltVar);
      if (value) {
        // Convert RGB/other formats to HSL if needed
        variables[demoVar] = this.convertToHSL(value.trim());
      }
    });

    this.updateVariables(variables);
  }

  /**
   * Convert color values to HSL format expected by demo app
   * Demo app expects format like "221 83% 53%" without hsl() wrapper
   */
  private convertToHSL(value: string): string {
    // If already in correct format (e.g., "221 83% 53%")
    if (/^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/.test(value)) {
      return value;
    }

    // If it's an HSL function (e.g., "hsl(221, 83%, 53%)")
    if (value.startsWith('hsl(') || value.startsWith('hsla(')) {
      const match = value.match(/\d+(\.\d+)?/g);
      if (match && match.length >= 3) {
        return `${match[0]} ${match[1]}% ${match[2]}%`;
      }
    }

    // If it's RGB, convert to HSL (simplified conversion)
    if (value.startsWith('rgb(') || value.startsWith('rgba(')) {
      const match = value.match(/\d+/g);
      if (match && match.length >= 3) {
        const [r, g, b] = match.map(Number);
        const hsl = this.rgbToHsl(r, g, b);
        return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
      }
    }

    // Return original if we can't convert
    return value;
  }

  /**
   * Convert RGB to HSL
   */
  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

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

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  /**
   * Apply light theme variables
   */
  applyLightTheme() {
    this.updateVariables({
      '--background': '0 0% 100%',
      '--foreground': '0 0% 3.9%',
      '--card': '0 0% 100%',
      '--card-foreground': '0 0% 3.9%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '0 0% 3.9%',
      '--primary': '221 83% 53%',
      '--primary-foreground': '0 0% 98%',
      '--secondary': '0 0% 96.1%',
      '--secondary-foreground': '0 0% 9%',
      '--muted': '0 0% 96.1%',
      '--muted-foreground': '0 0% 45.1%',
      '--accent': '0 0% 96.1%',
      '--accent-foreground': '0 0% 9%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '0 0% 89.8%',
      '--input': '0 0% 89.8%',
      '--ring': '0 0% 3.9%',
    });
  }

  /**
   * Apply dark theme variables
   */
  applyDarkTheme() {
    this.updateVariables({
      '--background': '0 0% 3.9%',
      '--foreground': '0 0% 98%',
      '--card': '0 0% 12%',
      '--card-foreground': '0 0% 98%',
      '--popover': '0 0% 3.9%',
      '--popover-foreground': '0 0% 98%',
      '--primary': '217 91% 60%',
      '--primary-foreground': '0 0% 98%',
      '--secondary': '0 0% 14.9%',
      '--secondary-foreground': '0 0% 98%',
      '--muted': '0 0% 14.9%',
      '--muted-foreground': '0 0% 63.9%',
      '--accent': '0 0% 14.9%',
      '--accent-foreground': '0 0% 98%',
      '--destructive': '0 62.8% 30.6%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '0 0% 26.9%',
      '--input': '0 0% 26.9%',
      '--ring': '0 0% 83.1%',
    });
  }

  /**
   * Clear all custom CSS variables
   */
  clearVariables() {
    if (!this.iframe || !this.baseUrl) {
      return;
    }
    this.iframe.src = this.baseUrl;
  }
}

// Export singleton instance
export const themeInjector = new ThemeInjector();
