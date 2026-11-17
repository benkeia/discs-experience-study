import * as THREE from 'three';
import { DiscEngineConfig } from '../types';

/**
 * Encapsulated studio lighting controller for the 3D disc carousel.
 * Manages Three.js physical studio lights (key, fill, rim, overhead strip)
 * and optional adaptive chameleon ambient tinting.
 */
export class StudioLightingManager {
  public ambientLight: THREE.AmbientLight;
  public keyLight: THREE.DirectionalLight;
  public fillLight: THREE.DirectionalLight;
  public rimLight: THREE.DirectionalLight;
  public topStrip: THREE.DirectionalLight;

  private scene: THREE.Scene;
  private config: DiscEngineConfig;

  private readonly whiteColor = new THREE.Color(0xffffff);
  private readonly baseRimColor = new THREE.Color();
  private readonly targetRimColor = new THREE.Color();
  private readonly targetTopStripColor = new THREE.Color();
  private readonly targetFillColor = new THREE.Color();

  constructor(
    scene: THREE.Scene,
    _galleryGroup: THREE.Group,
    _renderer: THREE.WebGLRenderer,
    config: DiscEngineConfig
  ) {
    this.scene = scene;
    this.config = config;

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.22);
    scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(config.keyColor, config.keyIntensity);
    this.keyLight.position.set(config.keyX, config.keyY, 6);
    scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0xffffff, config.fillIntensity);
    this.fillLight.position.set(-5, -2, 4);
    scene.add(this.fillLight);

    this.rimLight = new THREE.DirectionalLight(config.rimColor, config.rimIntensity);
    this.rimLight.position.set(-3.5, 3.5, -2);
    scene.add(this.rimLight);

    // Directional top-strip light avoiding mobile GPU float LTC shader glitches
    this.topStrip = new THREE.DirectionalLight(0xffffff, config.topStripIntensity * 0.45);
    this.topStrip.position.set(0, 3.2, 3);
    scene.add(this.topStrip);
  }

  /**
   * Smoothly updates studio lights and optional adaptive chameleon ambient tinting.
   */
  public update(dt: number, dominantColor?: THREE.Color): void {
    const w = this.config;

    this.baseRimColor.set(w.rimColor);
    this.targetRimColor.copy(this.baseRimColor);
    this.targetTopStripColor.copy(this.whiteColor);
    this.targetFillColor.copy(this.whiteColor);

    if (w.chameleonEnabled && dominantColor) {
      const intensity = Math.min(1, Math.max(0, w.chameleonIntensity));

      if (w.chameleonRim) {
        this.targetRimColor.lerp(dominantColor, intensity);
      }

      if (w.chameleonReflections) {
        this.targetTopStripColor.lerp(dominantColor, intensity * 0.85);
        this.targetFillColor.lerp(dominantColor, intensity * 0.55);
      }
    }

    const lerpRate = Math.min(1, dt * 5.0);
    this.rimLight.color.lerp(this.targetRimColor, lerpRate);
    this.topStrip.color.lerp(this.targetTopStripColor, lerpRate);
    this.fillLight.color.lerp(this.targetFillColor, lerpRate);
  }

  public dispose(): void {
    this.scene.remove(this.ambientLight, this.keyLight, this.fillLight, this.rimLight, this.topStrip);
    this.ambientLight.dispose();
    this.keyLight.dispose();
    this.fillLight.dispose();
    this.rimLight.dispose();
    this.topStrip.dispose();
  }
}
