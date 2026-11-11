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
  public topStrip: THREE.RectAreaLight;

  private auraMesh: THREE.Mesh | null = null;
  private auraMaterial: THREE.MeshBasicMaterial | null = null;
  private auraTexture: THREE.CanvasTexture | null = null;

  private scene: THREE.Scene;
  private galleryGroup: THREE.Group;
  private config: DiscEngineConfig;

  private readonly whiteColor = new THREE.Color(0xffffff);
  private readonly baseRimColor = new THREE.Color();
  private readonly targetRimColor = new THREE.Color();
  private readonly targetTopStripColor = new THREE.Color();
  private readonly targetFillColor = new THREE.Color();
  private readonly targetAuraColor = new THREE.Color();

  constructor(
    scene: THREE.Scene,
    galleryGroup: THREE.Group,
    renderer: THREE.WebGLRenderer,
    config: DiscEngineConfig
  ) {
    this.scene = scene;
    this.galleryGroup = galleryGroup;
    this.config = config;

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
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

    this.topStrip = new THREE.RectAreaLight(0xffffff, config.topStripIntensity, 6, 0.4);
    this.topStrip.position.set(0, 3.2, 3);
    this.topStrip.lookAt(0, 0, 0);
    scene.add(this.topStrip);

    this.setupBackdropAura(renderer);
  }

  private setupBackdropAura(renderer: THREE.WebGLRenderer): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.75)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)');
      grad.addColorStop(0.75, 'rgba(255, 255, 255, 0.1)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    }

    this.auraTexture = new THREE.CanvasTexture(canvas);
    this.auraTexture.colorSpace = THREE.SRGBColorSpace;
    this.auraTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const auraGeo = new THREE.PlaneGeometry(10, 7.5);
    this.auraMaterial = new THREE.MeshBasicMaterial({
      map: this.auraTexture,
      color: new THREE.Color(0xffffff),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false
    });

    this.auraMesh = new THREE.Mesh(auraGeo, this.auraMaterial);
    this.auraMesh.position.set(0, 0, -0.6);
    this.auraMesh.renderOrder = -50;
    this.auraMesh.visible = false;
    this.galleryGroup.add(this.auraMesh);
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
    this.targetAuraColor.copy(this.whiteColor);
    let targetAuraOpacity = 0;

    if (w.chameleonEnabled && dominantColor) {
      const intensity = Math.min(1, Math.max(0, w.chameleonIntensity));

      this.targetAuraColor.copy(dominantColor);
      if (w.chameleonAura) {
        targetAuraOpacity = intensity * 0.45;
      }

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

    if (this.auraMaterial && this.auraMesh) {
      this.auraMaterial.color.lerp(this.targetAuraColor, lerpRate);
      this.auraMaterial.opacity += (targetAuraOpacity - this.auraMaterial.opacity) * lerpRate;
      this.auraMesh.visible = this.auraMaterial.opacity > 0.005;
    }
  }

  public dispose(): void {
    this.scene.remove(this.ambientLight, this.keyLight, this.fillLight, this.rimLight, this.topStrip);
    this.ambientLight.dispose();
    this.keyLight.dispose();
    this.fillLight.dispose();
    this.rimLight.dispose();
    this.topStrip.dispose();

    if (this.auraMesh) {
      this.galleryGroup.remove(this.auraMesh);
      this.auraMesh.geometry.dispose();
      this.auraMesh = null;
    }
    this.auraTexture?.dispose();
    this.auraTexture = null;
    this.auraMaterial?.dispose();
    this.auraMaterial = null;
  }
}
