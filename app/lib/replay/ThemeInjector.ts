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
}

// Export singleton instance
export const themeInjector = new ThemeInjector();
