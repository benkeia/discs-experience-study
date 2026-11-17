import { WebHaptics } from 'web-haptics';

/**
 * High-performance mobile haptics manager.
 * Integrates Lochie Axon's Web Haptics technique:
 * - Native navigator.vibrate() on Android devices
 * - Taptic Engine switch trigger on iOS Safari
 * - Silent zero-overhead fallback on Desktop
 */
export class HapticsManager {
  private haptics: WebHaptics | null = null;
  private isEnabled = true;

  constructor() {
    // Lazily initialize upon first call
  }

  private getInstance(): WebHaptics | null {
    if (typeof window === 'undefined') return null;
    if (!this.haptics) {
      try {
        this.haptics = new WebHaptics();
      } catch (err) {
        console.warn('[HapticsManager] Could not initialize WebHaptics:', err);
        this.haptics = null;
      }
    }
    return this.haptics;
  }

  /**
   * Micro-pulse ultra sec (8ms) quand un nouveau CD franchit le centre du carrousel.
   */
  public tickDiscChange(): void {
    if (!this.isEnabled) return;
    const h = this.getInstance();
    if (!h) return;
    try {
      void h.trigger([{ duration: 8, intensity: 0.35 }]);
    } catch {
      // Silent error catching to ensure 60fps render loop is never interrupted
    }
  }

  /**
   * Impulsion franche (16ms) lors du flip 180° ou du clic sur un CD.
   */
  public impactFlip(): void {
    if (!this.isEnabled) return;
    const h = this.getInstance();
    if (!h) return;
    try {
      void h.trigger([{ duration: 16, intensity: 0.8 }]);
    } catch {
      // Silent error catching
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public destroy(): void {
    if (this.haptics) {
      try {
        this.haptics.destroy();
      } catch {
        // Silent
      }
      this.haptics = null;
    }
  }
}
