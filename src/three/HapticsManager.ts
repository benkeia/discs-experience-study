import { WebHaptics } from 'web-haptics';

/**
 * High-performance mobile haptics manager.
 * - Native navigator.vibrate() on Android devices with physical motor latency compensation (16ms / 35ms).
 * - WebKit switch trick via web-haptics for Apple iOS Safari Taptic Engine.
 * - Silent zero-overhead fallback on Desktop.
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
   * Micro-pulse sec & franc (16ms) quand un nouveau CD franchit le centre du carrousel.
   * Sur Android Chrome, appelle directement navigator.vibrate(16) pour dépasser
   * l'inertie minimale des moteurs physiques sans être bloqué par rAF.
   */
  public tickDiscChange(): void {
    if (!this.isEnabled) return;

    // 1. Android Chrome native Vibration API
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(16);
        return;
      } catch {
        // Fallback to web-haptics below
      }
    }

    // 2. iOS Safari Taptic Engine fallback via web-haptics
    const h = this.getInstance();
    if (!h) return;
    try {
      void h.trigger([{ duration: 16, intensity: 0.7 }]);
    } catch {
      // Silent error catching
    }
  }

  /**
   * Impulsion franche (35ms) lors du flip 180° ou du clic sur un CD.
   */
  public impactFlip(): void {
    if (!this.isEnabled) return;

    // 1. Android Chrome native Vibration API
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(35);
        return;
      } catch {
        // Fallback to web-haptics below
      }
    }

    // 2. iOS Safari Taptic Engine fallback via web-haptics
    const h = this.getInstance();
    if (!h) return;
    try {
      void h.trigger([{ duration: 35, intensity: 1.0 }]);
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
