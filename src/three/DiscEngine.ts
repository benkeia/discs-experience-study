import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import gsap from 'gsap';
import type GUI from 'lil-gui';
import {
  DiscItem,
  DiscInstance,
  HolographicUniforms,
  NavigationSource
} from '../types';
import { CONFIG } from './config';
import {
  buildProceduralCanvas,
  createEnvironmentCanvas,
  createMatrixCanvas,
  toCanvasTexture,
  createPlaceholderTexture
} from './textures';
import { createDiscGeometries, DiscGeometrySet } from './geometries';
import {
  createCDBackMaterial,
  createSharedHubMaterials,
  SharedHubMaterials
} from './materials';
import { StudioLightingManager } from './Lighting';
import { createDiscInstance } from './DiscMesh';
import { ScribbleEffect } from './ScribbleEffect';
import { SoundDesignManager } from './SoundDesign';
import {
  RaycastManager,
  WheelController,
  PointerLocation,
  clamp,
  applySpinDelta
} from './interaction';
import { setupDebugGUI } from './DebugGUI';

/**
 * High-performance 3D carousel engine for interactive CD/DVD discs.
 * Coordinates Three.js scene graph, physical shaders, GSAP tweens, and input events.
 */
/* -------------------------------------------------------------------------- */
/*  Carousel 3D Layout Geometry Calculations                                  */
/* -------------------------------------------------------------------------- */

/**
 * Global layout metrics computed once per frame and shared across all discs.
 */
export interface CarouselLayoutContext {
  hGapSpan: number;          // Horizontal span across the circular arc
  depthSpan: number;         // Depth span across the circular arc
  dip: number;               // Vertical dip downwards when scrolling fast
  lean: number;              // Lateral tilt banking angle when scrolling fast
  flowBank: number;          // Roll banking multiplier
  activeDiscY: number;       // Elevation offset for the centered active disc
  inactiveScale: number;     // Minimum scale for distant peripheral discs
  inactiveDelta: number;     // Progressive scale falloff per distance unit
  hoverTiltStrength: number; // Amplitude of mouse hover tilt
  pointerNDCX: number;       // Normalized mouse pointer X [-1, 1]
  pointerNDCY: number;       // Normalized mouse pointer Y [-1, 1]
  baseFollow: number;        // Base interpolation follow speed
  followFalloff: number;     // Reduction in follow speed per distance unit
  followMin: number;         // Minimum follow speed floor
  followTight: number;       // Maximum follow speed ceiling (during drag)
}

/**
 * Target spatial position, rotation and scale for a disc on the 3D carousel.
 */
export interface DiscTargetTransform {
  isVisible: boolean;
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scale: number;
  followRate: number;
  isIntro: boolean;
  introSpinY?: number;
}

/**
 * Computes the target 3D transform (position, rotation, scale) for a disc in the carousel.
 * Pure mathematical projection: positions each disc along a circular 3D arc, applies dynamic
 * velocity leaning/dipping, interactive mouse tilt, and handles the intro spin/cascade entrance.
 *
 * @param inst - The target disc instance state
 * @param relativeIndex - Distance from center in disc slots (0 = center, +1 = right, -1 = left)
 * @param isActive - True if this disc is the currently active centered disc
 * @param layout - Precomputed frame layout parameters
 */
export function calculateDiscTransform(
  inst: DiscInstance,
  relativeIndex: number,
  isActive: boolean,
  layout: CarouselLayoutContext
): DiscTargetTransform {
  const distanceFromCenter = Math.abs(relativeIndex);

  // 1. Cull discs that are too far behind or outside the visible front arc (> 3.2 slots away)
  if (distanceFromCenter > 3.2) {
    return {
      isVisible: false,
      posX: 0,
      posY: 0,
      posZ: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      scale: 0,
      followRate: 0,
      isIntro: false
    };
  }

  // 2. Parametric circle projection: arrange discs along a curved horizontal arc
  // 0.35 rad (~20°) separation between each adjacent disc slot
  const arcAngle = relativeIndex * 0.35;
  let posX = Math.sin(arcAngle) * layout.hGapSpan;
  let posY = (isActive ? layout.activeDiscY : 0) - layout.dip * (isActive ? 0.7 : 1);
  let posZ = -Math.cos(arcAngle) * layout.depthSpan + layout.depthSpan;

  // 3. Rotations: align with the arc curvature + dynamic banking when scrolling at speed
  let rotX = 0;
  let rotY = -arcAngle + layout.lean * (isActive ? 1 : 1.12);
  const rotZ = -layout.lean * layout.flowBank * (isActive ? 0.7 : 1);

  // 4. Smooth scale falloff towards the carousel edges (fade out smoothly between 2.4 and 3.2)
  const edgeFade = clamp((3.2 - distanceFromCenter) / 0.8, 0, 1);
  const targetScale =
    (isActive ? 1 : Math.max(layout.inactiveScale, 1 - distanceFromCenter * layout.inactiveDelta)) * edgeFade;

  // 5. Interactive hover tilt: incline the disc towards the mouse pointer position
  if (inst.hover > 0.001) {
    const tiltY = inst.hoverUVY * 0.75 + layout.pointerNDCY * 0.35;
    const tiltX = inst.hoverUVX * 0.75 + layout.pointerNDCX * 0.35;
    rotX += inst.hover * layout.hoverTiltStrength * tiltY;
    rotY += inst.hover * layout.hoverTiltStrength * tiltX;
  }

  // 6. Tactile press / wipe momentum offsets
  posX += inst.pushX;
  posY += inst.pushY;
  posZ += inst.pushZ;

  // 7. Intro entrance sequence (A24 Spin & Cascade)
  if (inst.introProgress < 0.999) {
    const progress = inst.introProgress;

    // Disc has not started appearing yet
    if (progress < 0.0001) {
      return {
        isVisible: false,
        posX: 0,
        posY: 0,
        posZ: 0,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        scale: 0,
        followRate: 0,
        isIntro: true
      };
    }

    // Active center disc: zooms in from depth with a full 360° spin
    if (isActive) {
      return {
        isVisible: true,
        posX,
        posY,
        posZ: posZ - (1 - progress) * 1.4,
        rotX,
        rotY,
        rotZ,
        scale: targetScale * progress,
        followRate: 0,
        isIntro: true,
        introSpinY: inst.baseFlipY - (1 - progress) * Math.PI * 2
      };
    }

    // Peripheral discs: slide in from left/right sides in cascade
    const directionSign = Math.sign(relativeIndex) || 1;
    return {
      isVisible: true,
      posX: posX + directionSign * (1 - progress) * (2.2 + distanceFromCenter * 0.4),
      posY,
      posZ: posZ + (1 - progress) * 0.9,
      rotX,
      rotY: rotY + directionSign * (1 - progress) * 0.45,
      rotZ,
      scale: targetScale * Math.max(0, progress),
      followRate: 0,
      isIntro: true
    };
  }

  // 8. Dynamic follow rate: center disc tracks tighter, peripheral discs have slight lag
  const followRate = clamp(
    layout.baseFollow - distanceFromCenter * layout.followFalloff,
    layout.followMin,
    layout.followTight
  );

  return {
    isVisible: true,
    posX,
    posY,
    posZ,
    rotX,
    rotY,
    rotZ,
    scale: targetScale,
    followRate,
    isIntro: false
  };
}

export class DiscEngine {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private galleryGroup!: THREE.Group;
  private pmremTarget: THREE.WebGLRenderTarget | null = null;
  private gui?: GUI;

  // Studio lighting, sound design & effects
  private lighting!: StudioLightingManager;
  private scribbleEffect!: ScribbleEffect;
  public sound!: SoundDesignManager;
  private prevActiveIdx = 0;

  // Materials, Geometries & Shared Textures
  private backMaterial?: THREE.MeshPhysicalMaterial;
  private hubMaterials?: SharedHubMaterials;
  private geometries?: DiscGeometrySet;
  private sharedTextures: THREE.Texture[] = [];
  private placeholderTexture?: THREE.CanvasTexture;

  // Realistic CD Holographic Diffraction Shader Uniforms
  private holoUniforms: HolographicUniforms = {
    uTrackPitch: { value: CONFIG.trackPitch },
    uRainbowIntensity: { value: CONFIG.rainbowIntensity },
    uRainbowSaturation: { value: CONFIG.rainbowSaturation },
    uAnisoSpread: { value: CONFIG.anisoSpread },
    uOrder2Intensity: { value: CONFIG.order2Intensity },
    uSpecularCore: { value: CONFIG.specularCore },
    uRadialRings: { value: CONFIG.radialRings },
    uBackScratches: { value: CONFIG.backScratches },
    uScratchMap: { value: null }
  };

  private discs: DiscItem[] = [];
  private instances: DiscInstance[] = [];
  private pickMeshes: THREE.Mesh[] = [];

  // GSAP animation states
  private scrollPos = 0;
  private targetIndex = 0;
  private flowVel = 0;
  private dragVelocity = 0;
  private scrollTween: gsap.core.Tween | null = null;
  private flowTween: gsap.core.Tween | null = null;
  private cascadeDelayedCall: gsap.core.Tween | null = null;

  private destroyed = false;
  private initAbortController = new AbortController();

  // Interaction controllers & state
  private raycastManager!: RaycastManager;
  private wheelController!: WheelController;

  private pointerDown = false;
  private activePointerId = -1;
  private isTouch = false;
  private isHoldingActiveDisc = false;
  private isDragging = false;
  private spinningDiscIdx = -1;
  private pressedDiscIdx = -1;
  private hoveredDiscIdx = -1;
  private started = false;
  public isLoaded = false;
  public onProgress?: (ratio: number) => void;
  public onReady?: () => void;
  private needsRaycast = false;
  private suppressClickUntil = 0;

  private startX = 0;
  private startY = 0;
  private lastDragX = 0;
  private lastDragY = 0;
  private lastDragTime = 0;

  private lastMoveX = 0;
  private lastMoveY = 0;
  private lastMoveTime = 0;
  private wipeVX = 0;
  private wipeVY = 0;

  private cleanups: Array<() => void> = [];

  constructor(container: HTMLElement, discs: DiscItem[]) {
    this.container = container;
    this.discs = discs;
    void this.init();
  }

  /**
   * Modulo wrap calculation for seamless infinite loop positioning.
   */
  private wrapDiff(p: number, scrollPos: number): number {
    const N = this.discs.length;
    if (!CONFIG.loopInfini || N <= 1) return p - scrollPos;
    let m = (((p - scrollPos) % N) + N) % N;
    if (m > N / 2) m -= N;
    return m;
  }

  /**
   * Returns index of the currently centered front disc.
   */
  public activeIndex(): number {
    const N = this.discs.length;
    if (!N) return 0;
    if (!CONFIG.loopInfini || N <= 1) {
      return Math.round(clamp(this.scrollPos, 0, N - 1));
    }
    return ((Math.round(this.scrollPos) % N) + N) % N;
  }

  private targetLogicalIndex(): number {
    if (this.scrollTween && this.scrollTween.isActive()) {
      return this.targetIndex;
    }
    return Math.round(this.scrollPos);
  }

  private cancelIntroAnimation(): void {
    this.cascadeDelayedCall?.kill();
    this.cascadeDelayedCall = null;
    this.instances.forEach((inst) => {
      if (inst.introProgress < 1) {
        gsap.killTweensOf(inst, 'introProgress');
        inst.introProgress = 1;
        inst.spinY = inst.baseFlipY;
      }
    });
  }

  /**
   * Animates carousel smoothly towards a designated target disc index.
   */
  public navigateTo(index: number, source: NavigationSource = 'snap'): void {
    const w = CONFIG;
    const N = this.discs.length;

    this.cancelIntroAnimation();

    let target = index;
    if (!w.loopInfini) {
      target = clamp(index, 0, N - 1);
    }

    const dist = Math.abs(target - this.scrollPos);
    this.targetIndex = target;
    this.scrollTween?.kill();
    this.flowTween?.kill();

    let duration = w.snapDuration;
    let kick = 0;
    if (source === 'wheel') {
      duration = w.snapDuration + 0.05;
      kick = 2.5;
    } else if (source === 'key') {
      duration = Math.min(0.6, w.snapDuration - 0.04 + dist * 0.05);
      kick = 4;
    } else if (source === 'click') {
      duration = clamp(0.45 + dist * 0.11, w.snapDuration, 1.05);
      kick = Math.min(5, dist * 1.4);
    } else if (source === 'flick') {
      duration = w.snapDuration + 0.12;
      kick = Math.min(6, dist * 1.8);
    }

    if (kick) {
      const dir = Math.sign(target - this.scrollPos);
      if (dir) {
        this.flowVel = clamp(this.flowVel + dir * kick, -12, 12);
        this.flowTween = gsap.to(this, {
          flowVel: 0,
          duration: 0.85,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }
    }

    this.scrollTween = gsap.to(this, {
      scrollPos: target,
      duration,
      ease: 'power3.out',
      overwrite: 'auto'
    });
  }

  /**
   * Flips active disc 180 degrees to inspect the holographic CD back.
   */
  public flipDisc(idx: number): void {
    const inst = this.instances[idx];
    if (!inst) return;
    this.sound.playById(CONFIG.soundDiscFlip);
    inst.resetTween?.kill();

    // Always advances in the same forward direction towards the right (+Math.PI)
    inst.baseFlipY += Math.PI;
    const isBackFacing = Math.round(inst.baseFlipY / Math.PI) % 2 !== 0;
    CONFIG.voirDosCD = isBackFacing;

    this.gui?.controllersRecursive().forEach((c) => {
      if (c.property === 'voirDosCD') c.updateDisplay();
    });

    const easeStr = `elastic.out(${CONFIG.flipElasticAmp}, ${CONFIG.flipElasticPeriod})`;
    inst.resetTween = gsap.to(inst, {
      spinY: inst.baseFlipY,
      spinX: 0,
      duration: CONFIG.flipDuration,
      ease: easeStr,
      overwrite: true,
      onComplete: () => {
        inst.resetTween = null;
      }
    });
  }

  private resetDiscSpin(idx: number): void {
    const inst = this.instances[idx];
    if (!inst) return;
    if (Math.abs(inst.spinX) < 0.001 && Math.abs(inst.spinY - inst.baseFlipY) < 0.001) return;

    inst.resetTween?.kill();
    inst.resetTween = gsap.to(inst, {
      spinX: 0,
      spinY: inst.baseFlipY,
      duration: CONFIG.resetDuration,
      ease: 'power3.out',
      overwrite: true,
      onComplete: () => {
        inst.resetTween = null;
      }
    });
  }

  private applyHoverWipe(idx: number): void {
    const w = CONFIG;
    const inst = this.instances[idx];
    if (!inst || Math.hypot(this.wipeVX, this.wipeVY) < w.wipeMinSpeed) return;

    inst.pushTween?.kill();
    inst.pushTween = gsap.fromTo(
      inst,
      {
        pushX: clamp(this.wipeVX * w.wipePush, -w.wipePushMax, w.wipePushMax),
        pushY: -clamp(this.wipeVY * w.wipePush, -w.wipePushMax, w.wipePushMax),
        pushRotVY: clamp(this.wipeVX * w.wipeSpin, -w.wipeSpinMax, w.wipeSpinMax),
        pushRotVX: clamp(this.wipeVY * w.wipeSpin, -w.wipeSpinMax, w.wipeSpinMax)
      },
      {
        pushX: 0,
        pushY: 0,
        pushRotVY: 0,
        pushRotVX: 0,
        duration: 0.85,
        ease: 'elastic.out(1, 0.45)',
        overwrite: 'auto',
        onComplete: () => {
          inst.pushTween = null;
        }
      }
    );
  }

  private applyPressImpulse(idx: number): void {
    const w = CONFIG;
    const inst = this.instances[idx];
    if (!inst) return;
    this.sound.playById(w.soundDiscTap);

    inst.pushTween?.kill();
    inst.pushTween = gsap.fromTo(
      inst,
      {
        pushZ: -w.pressDepth,
        pushRotVY: this.raycastManager.hitUV.x * w.pressTilt,
        pushRotVX: -this.raycastManager.hitUV.y * w.pressTilt
      },
      {
        pushZ: 0,
        pushRotVY: 0,
        pushRotVX: 0,
        duration: 0.7,
        ease: 'back.out(2.2)',
        overwrite: 'auto',
        onComplete: () => {
          inst.pushTween = null;
        }
      }
    );
  }

  private setupSceneAndRenderer(): void {
    const w = CONFIG;
    RectAreaLightUniformsLib.init();

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = w.exposure;
    this.renderer.setClearColor(0x000000, 0);

    if ('transmissionResolutionScale' in this.renderer) {
      this.renderer.transmissionResolutionScale = 0.5;
    }

    Object.assign(this.renderer.domElement.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      display: 'block',
      background: 'transparent',
      pointerEvents: 'none'
    });
    this.container.replaceChildren(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(w.fogColor, 7, 14);

    this.camera = new THREE.PerspectiveCamera(w.cameraFOV, 1, 0.1, 100);
    this.camera.position.set(0, 0, w.cameraDistance);
    this.camera.lookAt(0, 0, 0);

    this.galleryGroup = new THREE.Group();
    this.galleryGroup.rotation.x = THREE.MathUtils.degToRad(w.galleryRotX);
    this.galleryGroup.rotation.y = THREE.MathUtils.degToRad(w.galleryRotY);
    this.galleryGroup.scale.setScalar(w.galleryScale);
    this.scene.add(this.galleryGroup);

    this.lighting = new StudioLightingManager(this.scene, this.galleryGroup, this.renderer, w);
    this.sound = new SoundDesignManager(w);
    this.scribbleEffect = new ScribbleEffect(w);
    this.galleryGroup.add(this.scribbleEffect.group);

    // Equirectangular Studio Environment via PMREMGenerator
    const envCanvas = createEnvironmentCanvas();
    const envTex = new THREE.CanvasTexture(envCanvas);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.pmremTarget = pmrem.fromEquirectangular(envTex);
    envTex.dispose();
    pmrem.dispose();
    this.scene.environment = this.pmremTarget.texture;
    this.scene.environmentIntensity = w.environmentIntensity;

    this.raycastManager = new RaycastManager(this.renderer.domElement, this.camera);
    this.wheelController = new WheelController((dir) => {
      const cur = this.targetLogicalIndex();
      this.navigateTo(cur + dir, 'wheel');
    });

    this.handleResize();
  }

  private async init(): Promise<void> {
    const w = CONFIG;
    this.setupSceneAndRenderer();

    const procSettings = {
      texPrint: w.texPrint,
      texScratches: w.texScratches,
      texGrain: w.texGrain,
      texGloss: w.texGloss,
      frontRough: w.frontRough
    };

    const signal = this.initAbortController.signal;
    const [frontNormalCanvas, frontRoughCanvas, backScratchCanvas] = await Promise.all([
      buildProceduralCanvas('frontNormal', 1024, procSettings, signal),
      buildProceduralCanvas('frontRough', 512, procSettings, signal),
      buildProceduralCanvas('backScratch', 1024, procSettings, signal)
    ]);

    if (this.destroyed) return;

    const frontNormalMap = toCanvasTexture(frontNormalCanvas, this.renderer);
    const frontRoughnessMap = toCanvasTexture(frontRoughCanvas, this.renderer);
    const backScratchMap = toCanvasTexture(backScratchCanvas, this.renderer);
    const matrixTexture = toCanvasTexture(createMatrixCanvas(), this.renderer, THREE.SRGBColorSpace);
    const placeholderTexture = createPlaceholderTexture(this.renderer);

    this.placeholderTexture = placeholderTexture;
    this.sharedTextures.push(
      frontNormalMap,
      frontRoughnessMap,
      backScratchMap,
      matrixTexture,
      placeholderTexture
    );
    this.holoUniforms.uScratchMap.value = backScratchMap;

    this.geometries = createDiscGeometries(w);
    this.backMaterial = createCDBackMaterial(w, this.holoUniforms);
    this.hubMaterials = createSharedHubMaterials(w, matrixTexture);

    this.createDiscInstances(frontNormalMap, frontRoughnessMap, placeholderTexture);

    this.gui = setupDebugGUI(w, this.holoUniforms, {
      onFlipActiveDisc: (flipped) => {
        const active = this.activeIndex();
        const inst = this.instances[active];
        if (!inst) return;
        const currentFlipped = Math.round(inst.baseFlipY / Math.PI) % 2 !== 0;
        if (flipped !== currentFlipped) {
          this.flipDisc(active);
        }
      },
      onReplayIntro: () => this.playIntroAnimation(),
      renderer: this.renderer,
      scene: this.scene,
      topStrip: this.lighting.topStrip,
      backMaterial: this.backMaterial,
      scribbleMaterial: this.scribbleEffect.material,
      sound: this.sound
    });

    this.prevActiveIdx = this.activeIndex();
    this.setupEvents();
    gsap.ticker.add(this.tick);

    // Initial state: discs are in their starting pose, waiting for user gesture (▶ PLAY)
    this.instances.forEach((inst, idx) => {
      inst.introProgress = 0;
      if (idx === this.activeIndex()) {
        inst.spinY = inst.baseFlipY - Math.PI * 2;
      }
    });
    this.stepLayout(1, true);
  }

  private createDiscInstances(
    frontNormalMap: THREE.CanvasTexture,
    frontRoughnessMap: THREE.CanvasTexture,
    placeholderTexture: THREE.CanvasTexture
  ): void {
    if (!this.geometries || !this.hubMaterials || !this.backMaterial) return;

    const totalDiscs = this.discs.length;
    if (totalDiscs === 0) {
      this.isLoaded = true;
      this.onProgress?.(1);
      this.onReady?.();
      return;
    }

    let loadedCount = 0;
    const onDiscLoaded = () => {
      loadedCount += 1;
      const ratio = Math.min(1, loadedCount / totalDiscs);
      this.onProgress?.(ratio);
      if (loadedCount >= totalDiscs) {
        this.isLoaded = true;
        this.onReady?.();
      }
    };

    for (let idx = 0; idx < totalDiscs; idx += 1) {
      const instance = createDiscInstance({
        discItem: this.discs[idx],
        index: idx,
        config: CONFIG,
        geometries: this.geometries,
        hubMaterials: this.hubMaterials,
        backMaterial: this.backMaterial,
        maps: {
          placeholderTexture,
          frontRoughnessMap,
          frontNormalMap
        },
        renderer: this.renderer,
        isDestroyed: () => this.destroyed,
        onLoaded: onDiscLoaded
      });

      this.galleryGroup.add(instance.group);
      this.instances.push(instance);
      this.pickMeshes.push(instance.pick);
    }
  }

  /**
   * Unlocks the Web Audio API immediately within the user gesture callback.
   */
  public async unlockAudio(): Promise<void> {
    await this.sound?.resume();
  }

  /**
   * Starts the 3D gallery experience and launches the sensory intro animation.
   * Called once the Play Gate has completely dissolved, ensuring the user sees
   * the full 360° spin and cascade unobstructed.
   */
  public start(): void {
    if (this.started) return;
    this.started = true;
    this.playIntroAnimation();
  }

  /**
   * Concept 3 — « Le Spin & Draw A24 »
   * 1. Le disque central arrive avec une rotation 360° sur lui-même en freinant face caméra.
   * 2. Dès qu'il se stabilise, le crayonnage animé A24 jaillit et trace ses cercles autour de lui.
   * 3. Aussitôt après, les disques latéraux surgissent des côtés en cascade.
   */
  public playIntroAnimation(): void {
    const centerIdx = this.activeIndex();
    const centerInst = this.instances[centerIdx];
    if (!centerInst) return;

    this.sound.playById(CONFIG.soundIntroCenter, 1.1);

    this.cascadeDelayedCall?.kill();
    this.cascadeDelayedCall = gsap.delayedCall(0.60, () => {
      this.sound.playById(CONFIG.soundIntroCascade);
      this.cascadeDelayedCall = null;
    });

    this.instances.forEach((inst, idx) => {
      gsap.killTweensOf(inst, 'introProgress');
      inst.introProgress = 0;
      if (idx === centerIdx) {
        inst.spinY = inst.baseFlipY - Math.PI * 2;
      }
    });

    gsap.to(centerInst, {
      introProgress: 1,
      duration: 0.78,
      ease: 'power3.out',
      overwrite: 'auto',
      onComplete: () => {
        centerInst.spinY = centerInst.baseFlipY;
      }
    });

    this.instances.forEach((inst, idx) => {
      if (idx === centerIdx) return;
      const h = Math.abs(this.wrapDiff(idx, centerIdx));
      const delay = 0.62 + Math.min(h, 4) * 0.085;
      gsap.to(inst, {
        introProgress: 1,
        duration: 0.68,
        delay,
        ease: 'back.out(1.25)',
        overwrite: 'auto'
      });
    });
  }

  private stepLayout(dt: number, immediate = false): void {
    const w = CONFIG;
    const activeIdx = this.activeIndex();

    if (this.prevActiveIdx !== activeIdx) {
      this.sound.playById(w.soundDiscChange, activeIdx);
      this.sound.playById(w.soundDiscSnap, Math.abs(this.flowVel));
      this.prevActiveIdx = activeIdx;
    }

    if (this.galleryGroup.scale.x !== w.galleryScale) {
      this.galleryGroup.scale.setScalar(w.galleryScale);
    }
    const targetRotX = THREE.MathUtils.degToRad(w.galleryRotX);
    if (this.galleryGroup.rotation.x !== targetRotX) {
      this.galleryGroup.rotation.x = targetRotX;
    }
    const targetRotY = THREE.MathUtils.degToRad(w.galleryRotY);
    if (this.galleryGroup.rotation.y !== targetRotY) {
      this.galleryGroup.rotation.y = targetRotY;
    }

    const lean = clamp(
      Math.sign(this.flowVel) * Math.sqrt(Math.abs(this.flowVel)) * w.flowLean,
      -w.flowLeanMax,
      w.flowLeanMax
    );
    const dip = Math.min(w.flowDipMax, Math.abs(this.flowVel) * w.flowDip);
    const baseFollow = this.isDragging ? w.followTight : w.followBase;

    const depth = Math.max(w.discThickness * 3, 0.12, w.depthGap);
    const depthSpan = depth * 2.4;
    const hGapSpan = w.hGap * 2.4;
    const teleportThreshold = w.hGap * 1.5;
    const inactiveDelta = (1 - w.inactiveScale) * 0.6;

    const layoutContext: CarouselLayoutContext = {
      hGapSpan,
      depthSpan,
      dip,
      lean,
      flowBank: w.flowBank,
      activeDiscY: w.activeDiscY,
      inactiveScale: w.inactiveScale,
      inactiveDelta,
      hoverTiltStrength: w.hoverTiltStrength,
      pointerNDCX: this.raycastManager.pointerNDC.x,
      pointerNDCY: this.raycastManager.pointerNDC.y,
      baseFollow,
      followFalloff: w.followFalloff,
      followMin: w.followMin,
      followTight: w.followTight
    };

    this.instances.forEach((inst, discIdx) => {
      // Relative slot distance from carousel center (0 = centered front disc)
      const relativeIndex = this.wrapDiff(discIdx, this.scrollPos);
      const isActive = discIdx === activeIdx;
      const wasVisible = inst.group.visible;

      const target = calculateDiscTransform(inst, relativeIndex, isActive, layoutContext);

      if (!target.isVisible) {
        if (wasVisible) {
          inst.group.visible = false;
          inst.group.scale.setScalar(0);
        }
        return;
      }

      inst.group.visible = true;

      if (target.isIntro) {
        if (target.introSpinY !== undefined) {
          inst.spinY = target.introSpinY;
        }
        inst.group.position.set(target.posX, target.posY, target.posZ);
        inst.group.rotation.set(target.rotX, target.rotY, target.rotZ);
        inst.group.scale.setScalar(target.scale);
      } else {
        const alpha = immediate ? 1 : Math.min(1, dt * target.followRate);
        const distToTarget = Math.hypot(
          target.posX - inst.group.position.x,
          target.posZ - inst.group.position.z
        );
        const shouldTeleport = immediate || !wasVisible || distToTarget > teleportThreshold;

        if (shouldTeleport) {
          inst.group.position.set(target.posX, target.posY, target.posZ);
          inst.group.rotation.set(target.rotX, target.rotY, target.rotZ);
          inst.group.scale.setScalar(target.scale);
        } else {
          inst.group.position.x += (target.posX - inst.group.position.x) * alpha;
          inst.group.position.y += (target.posY - inst.group.position.y) * alpha;
          inst.group.position.z += (target.posZ - inst.group.position.z) * alpha;
          const nextScale = inst.group.scale.x + (target.scale - inst.group.scale.x) * alpha;
          inst.group.scale.setScalar(nextScale);
          inst.group.rotation.x += (target.rotX - inst.group.rotation.x) * alpha;
          inst.group.rotation.y += (target.rotY - inst.group.rotation.y) * alpha;
          inst.group.rotation.z += (target.rotZ - inst.group.rotation.z) * alpha;
        }
      }

      if (this.spinningDiscIdx !== discIdx && !inst.resetTween) {
        inst.spinX += (0 - inst.spinX) * Math.min(1, dt * 2.5);
      }

      inst.spin.rotation.x = inst.spinX + inst.pushRotX;
      inst.spin.rotation.y = inst.spinY + inst.pushRotY;
      inst.group.renderOrder = Math.round(500 + inst.group.position.z * 10 - Math.abs(relativeIndex) * 0.1);
    });
  }

  /**
   * Smoothly animates hover state transitions (elevation, UV tilt, cursor appearance).
   */
  private setHoveredDisc(nextHoverIdx: number): void {
    if (nextHoverIdx === this.hoveredDiscIdx) return;

    // Animate out previously hovered disc
    if (this.hoveredDiscIdx >= 0) {
      const prev = this.instances[this.hoveredDiscIdx];
      if (prev) {
        prev.hoverTween?.kill();
        prev.hoverTween = gsap.to(prev, {
          hover: 0,
          hoverUVX: 0,
          hoverUVY: 0,
          duration: 0.45,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }
    }

    this.hoveredDiscIdx = nextHoverIdx;

    // Animate in newly hovered disc
    if (nextHoverIdx >= 0) {
      const curr = this.instances[nextHoverIdx];
      if (curr) {
        curr.hoverTween?.kill();
        curr.hoverTween = gsap.to(curr, {
          hover: 1,
          duration: 0.35,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }
    }

    if (!this.pointerDown) {
      this.container.style.cursor = this.hoveredDiscIdx >= 0 ? 'pointer' : 'grab';
    }
  }

  private updateHoverState(): void {
    this.needsRaycast = false;
    const hitDiscIdx = this.raycastManager.raycastDisc(this.pickMeshes);

    if (hitDiscIdx !== this.hoveredDiscIdx) {
      if (hitDiscIdx >= 0 && !this.pointerDown) {
        this.applyHoverWipe(hitDiscIdx);
        this.sound.playById(CONFIG.soundDiscHover);
      }
      this.setHoveredDisc(hitDiscIdx);
    } else if (hitDiscIdx >= 0 && !this.pointerDown) {
      const curr = this.instances[hitDiscIdx];
      if (curr) {
        curr.hoverUVTween?.kill();
        curr.hoverUVTween = gsap.to(curr, {
          hoverUVX: this.raycastManager.hitUV.x,
          hoverUVY: this.raycastManager.hitUV.y,
          duration: 0.18,
          ease: 'power1.out',
          overwrite: 'auto'
        });
      }
    }
  }

  private tick = (_time: number, deltaTime: number) => {
    if (this.destroyed) return;
    const dt = Math.min(0.05, Math.max(0.001, (deltaTime || 16.667) / 1000));
    const now = performance.now();

    if (this.needsRaycast) {
      this.updateHoverState();
    }

    if (!CONFIG.loopInfini) {
      this.scrollPos = clamp(this.scrollPos, -0.05, this.discs.length - 0.95);
    } else {
      const N = this.discs.length;
      if (N > 0 && Math.abs(this.scrollPos) > 1000) {
        this.scrollPos = ((this.scrollPos % N) + N) % N;
      }
    }

    this.stepLayout(dt, false);
    this.lighting.update(dt, this.instances[this.activeIndex()]?.dominantColor);

    this.scribbleEffect.step(
      now,
      dt,
      this.activeIndex(),
      this.hoveredDiscIdx,
      this.isHoldingActiveDisc,
      this.instances
    );

    this.renderer.render(this.scene, this.camera);
  };

  private handleResize = () => {
    if (!this.renderer || !this.camera) return;
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private isGuiEvent(e: Event): boolean {
    return e.target instanceof Element && !!e.target.closest('.lil-gui');
  }

  /* -------------------------------------------------------------------------- */
  /*  Pointer, Mouse & Touch Interactions                                       */
  /* -------------------------------------------------------------------------- */

  private handlePointerDown = (e: PointerEvent): void => {
    // Only primary left button, ignore clicks originating inside the debug lil-gui
    if (e.button !== 0 || !e.isPrimary || this.isGuiEvent(e)) return;
    void this.sound.resume();

    this.cancelIntroAnimation();

    const pointerPos = this.raycastManager.updatePointerCoords(e);
    this.pointerDown = true;
    this.activePointerId = e.pointerId;
    this.isTouch = e.pointerType !== 'mouse';

    // Record initial coordinates for measuring drag thresholds and velocities
    this.startX = pointerPos.x;
    this.startY = pointerPos.y;
    this.lastDragX = pointerPos.x;
    this.lastDragY = pointerPos.y;
    this.lastDragTime = performance.now();
    this.dragVelocity = 0;
    this.pressedDiscIdx = -1;

    // Detect if the press started on a disc near the center of the viewport
    const hitDiscIdx = this.raycastManager.raycastDisc(this.pickMeshes);
    if (hitDiscIdx >= 0 && Math.abs(this.wrapDiff(hitDiscIdx, this.scrollPos)) < 0.6) {
      this.pressedDiscIdx = hitDiscIdx;
    }
    this.hoveredDiscIdx = hitDiscIdx;
    this.isHoldingActiveDisc = hitDiscIdx >= 0 && hitDiscIdx === this.activeIndex();
  };

  /**
   * Evaluates whether pointer movement has exceeded the minimum drag threshold (5px).
   * Once exceeded, locks pointer capture and decides whether to spin the center disc in 3D
   * or scroll the carousel horizontally.
   */
  private startDrag(pointerId: number, deltaX: number, deltaY: number): boolean {
    // Ignore micro-movements to avoid cancelling click events accidentally
    if (Math.hypot(deltaX, deltaY) < CONFIG.dragStartDistance) return false;

    // On mobile touch: if gesture is predominantly horizontal, prioritize carousel scrolling
    if (this.isTouch && Math.abs(deltaX) >= Math.abs(deltaY)) {
      this.pressedDiscIdx = -1;
      this.isHoldingActiveDisc = false;
    }

    this.isDragging = true;
    this.scrollTween?.kill();
    this.flowTween?.kill();
    this.dragVelocity = 0;
    this.spinningDiscIdx = this.pressedDiscIdx;
    this.container.style.cursor = 'grabbing';

    // Interrupt any ongoing return tween on the disc we are grabbing
    if (this.spinningDiscIdx >= 0) {
      const grabbedDisc = this.instances[this.spinningDiscIdx];
      grabbedDisc?.resetTween?.kill();
      if (grabbedDisc) grabbedDisc.resetTween = null;
    }

    try {
      this.container.setPointerCapture(pointerId);
    } catch {}

    return true;
  }

  /**
   * Handles continuous drag motion:
   * - Mode A: 3D free rotation of the active center disc (spinningDiscIdx >= 0)
   * - Mode B: Horizontal scrolling of the carousel collection
   */
  private handleDragMove(e: PointerEvent, pointerLocation: PointerLocation): void {
    if (e.cancelable) e.preventDefault();
    const now = performance.now();
    const deltaX = pointerLocation.x - this.lastDragX;
    const deltaY = pointerLocation.y - this.lastDragY;
    const elapsedMs = Math.max(8, now - this.lastDragTime);
    this.lastDragX = pointerLocation.x;
    this.lastDragY = pointerLocation.y;
    this.lastDragTime = now;

    // --- Mode A: 3D free rotation of the grabbed active disc ---
    if (this.spinningDiscIdx >= 0) {
      const grabbedDisc = this.instances[this.spinningDiscIdx];
      if (!grabbedDisc) return;
      const sensitivity = CONFIG.dragSensitivity * 0.0045;
      grabbedDisc.spinY = applySpinDelta(grabbedDisc.spinY, grabbedDisc.baseFlipY, deltaX * sensitivity, CONFIG);
      grabbedDisc.spinX = applySpinDelta(grabbedDisc.spinX, 0, deltaY * sensitivity, CONFIG);
      return;
    }

    // --- Mode B: Horizontal scrolling of the carousel collection ---
    if (pointerLocation.rect.width <= 0) return;
    const carouselDragSpan = this.isTouch ? 1.8 : 6 * CONFIG.dragSensitivity;
    const deltaScroll = -(deltaX / pointerLocation.rect.width) * carouselDragSpan;
    this.scrollPos += deltaScroll;

    if (!CONFIG.loopInfini) {
      this.scrollPos = clamp(this.scrollPos, 0, this.discs.length - 1);
    }

    // Velocity tracking for momentum flick at release
    const instantScrollVelocity = clamp(
      (16.667 / elapsedMs) * deltaScroll,
      -CONFIG.dragMaxVelocity,
      CONFIG.dragMaxVelocity
    );
    this.dragVelocity += (instantScrollVelocity - this.dragVelocity) * CONFIG.dragVelocitySmoothing;
    this.flowVel = clamp(this.dragVelocity * 28, -12, 12);
    this.targetIndex = Math.round(this.scrollPos);
  }

  private handlePointerMove = (e: PointerEvent): void => {
    this.isTouch = e.pointerType !== 'mouse';

    // Pointer is floating (Hover): compute cursor velocity and request raycasting
    if (!this.pointerDown) {
      if (this.isGuiEvent(e)) return;
      this.raycastManager.updatePointerCoords(e);
      const now = performance.now();
      const elapsed = now - this.lastMoveTime;
      this.lastMoveTime = now;

      // Track cursor velocity over discs for the hover wipe wobble effect
      if (elapsed < 120) {
        const factor = 16.7 / Math.max(8, elapsed);
        this.wipeVX = (e.clientX - this.lastMoveX) * factor;
        this.wipeVY = (e.clientY - this.lastMoveY) * factor;
      } else {
        this.wipeVX = 0;
        this.wipeVY = 0;
      }

      this.lastMoveX = e.clientX;
      this.lastMoveY = e.clientY;
      this.needsRaycast = true;
      return;
    }

    // Pointer is pressed: verify active pointer ID and initiate or continue drag
    if (e.pointerId !== this.activePointerId) return;
    const pointerPos = this.raycastManager.updatePointerCoords(e);
    if (!this.isDragging && !this.startDrag(e.pointerId, pointerPos.x - this.startX, pointerPos.y - this.startY)) {
      return;
    }

    this.handleDragMove(e, pointerPos);
  };

  /**
   * Releases pointer drag, applies momentum flick or resets disc spin back to neutral.
   */
  private endDrag(cancelled = false): void {
    if (!this.pointerDown) return;
    const wasDragging = this.isDragging;
    const discBeingSpun = this.spinningDiscIdx;
    const pointerId = this.activePointerId;

    this.pointerDown = false;
    this.activePointerId = -1;
    this.pressedDiscIdx = -1;
    this.isDragging = false;
    this.spinningDiscIdx = -1;
    this.isHoldingActiveDisc = false;

    // Refresh hover state after pointer release
    if (this.isTouch) {
      this.setHoveredDisc(-1);
    } else {
      const hitDiscIdx = this.raycastManager.raycastDisc(this.pickMeshes);
      this.setHoveredDisc(hitDiscIdx);
    }

    try {
      if (this.container.hasPointerCapture(pointerId)) {
        this.container.releasePointerCapture(pointerId);
      }
    } catch {}

    if (!wasDragging) return;

    // Suppress clicks temporarily (140ms) to prevent mouseup/click triggering right after a drag
    this.suppressClickUntil = performance.now() + 140;

    // If we were rotating a disc in 3D, spring it back smoothly to neutral
    if (discBeingSpun >= 0) {
      this.resetDiscSpin(discBeingSpun);
      this.dragVelocity = 0;
      return;
    }

    if (cancelled) {
      this.dragVelocity = 0;
      this.navigateTo(Math.round(this.scrollPos));
      return;
    }

    // Carousel flick momentum calculation: project scrollPos based on release speed
    const flickMomentum = this.dragVelocity * 8;
    if (Math.abs(flickMomentum) > 1.2) {
      this.sound.playById(CONFIG.soundDiscFlick, Math.min(1.2, Math.abs(flickMomentum) / 3));
    }
    const nextIdx = Math.round(this.scrollPos + flickMomentum);
    this.dragVelocity = 0;
    this.navigateTo(nextIdx, 'flick');
  }

  /**
   * Handles discrete clicks (no drag):
   * - Active center disc: flips 180° to reveal the holographic CD back.
   * - Peripheral disc: navigates the carousel to center that disc.
   */
  private handleClick = (e: MouseEvent): void => {
    if (this.isGuiEvent(e)) return;
    if (performance.now() < this.suppressClickUntil) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    this.raycastManager.updatePointerCoords(e);
    const clickedDiscIdx = this.raycastManager.raycastDisc(this.pickMeshes);
    if (clickedDiscIdx < 0) return;

    const currentActiveIdx = this.activeIndex();
    if (clickedDiscIdx !== currentActiveIdx) {
      e.preventDefault();
      this.applyPressImpulse(clickedDiscIdx);
      const slotDelta = this.wrapDiff(clickedDiscIdx, this.scrollPos);
      this.navigateTo(Math.round(this.scrollPos + slotDelta), 'click');
    } else {
      this.flipDisc(currentActiveIdx);
    }
  };

  /**
   * Mouse wheel & trackpad input filtered through WheelController
   * to smooth out macOS high-frequency trackpad momentum.
   */
  private handleWheel = (e: WheelEvent): void => {
    if (e.ctrlKey || this.isGuiEvent(e)) return;
    e.preventDefault();
    this.wheelController.handleWheel(e);
  };

  /**
   * Keyboard shortcuts:
   * - Space: flips active disc to show back/front.
   * - Left/Right arrows: navigate one disc at a time.
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      this.flipDisc(this.activeIndex());
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.navigateTo(this.targetLogicalIndex() + 1, 'key');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.navigateTo(this.targetLogicalIndex() - 1, 'key');
    } else if (e.key === 'd' || e.key === 'D' || e.key === 'h' || e.key === 'H') {
      if (this.gui) {
        this.gui.show(this.gui._hidden);
      }
    }
  };

  private setupEvents(): void {
    const el = this.container;
    el.style.cursor = 'grab';
    el.style.touchAction = 'none';
    el.style.userSelect = 'none';

    const onPointerUp = () => this.endDrag(false);
    const onPointerCancel = () => this.endDrag(true);
    const onPointerLeave = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && !this.pointerDown && this.hoveredDiscIdx >= 0) {
        this.setHoveredDisc(-1);
      }
    };

    el.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    el.addEventListener('pointerleave', onPointerLeave);
    el.addEventListener('click', this.handleClick);
    el.addEventListener('wheel', this.handleWheel, { passive: false });
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('resize', this.handleResize);

    this.cleanups.push(
      () => el.removeEventListener('pointerdown', this.handlePointerDown),
      () => window.removeEventListener('pointermove', this.handlePointerMove),
      () => window.removeEventListener('pointerup', onPointerUp),
      () => window.removeEventListener('pointercancel', onPointerCancel),
      () => el.removeEventListener('pointerleave', onPointerLeave),
      () => el.removeEventListener('click', this.handleClick),
      () => el.removeEventListener('wheel', this.handleWheel),
      () => window.removeEventListener('keydown', this.handleKeyDown),
      () => window.removeEventListener('resize', this.handleResize)
    );
  }

  /**
   * Cleans up all Three.js scenes, GPU textures, geometries, lights, and event listeners.
   */
  public destroy(): void {
    this.destroyed = true;
    this.isHoldingActiveDisc = false;
    this.initAbortController.abort();
    gsap.ticker.remove(this.tick);

    this.wheelController?.dispose();
    this.cleanups.forEach((fn) => fn());
    this.cleanups.length = 0;

    this.scrollTween?.kill();
    this.flowTween?.kill();
    this.cascadeDelayedCall?.kill();
    this.scribbleEffect?.dispose();

    this.instances.forEach((inst) => {
      gsap.killTweensOf(inst, 'introProgress');
      inst.resetTween?.kill();
      inst.hoverTween?.kill();
      inst.hoverUVTween?.kill();
      inst.pushTween?.kill();
      if (inst.frontMaterial.map && inst.frontMaterial.map !== this.placeholderTexture) {
        inst.frontMaterial.map.dispose();
      }
      inst.frontMaterial.dispose();
    });
    this.instances.length = 0;
    this.pickMeshes.length = 0;

    if (this.geometries) {
      Object.values(this.geometries).forEach((geo) => geo.dispose());
    }

    this.sharedTextures.forEach((tex) => tex.dispose());
    this.sharedTextures.length = 0;
    this.holoUniforms.uScratchMap.value = null;

    this.backMaterial?.dispose();
    if (this.hubMaterials) {
      this.hubMaterials.edgeMaterial.dispose();
      this.hubMaterials.hubMaterial.dispose();
      this.hubMaterials.matrixMaterial.dispose();
      this.hubMaterials.frostMaterial.dispose();
      this.hubMaterials.pickMaterial.dispose();
    }

    this.sound?.dispose();
    this.lighting?.dispose();
    this.gui?.destroy();
    this.pmremTarget?.dispose();
    if (this.scene) {
      this.scene.environment = null;
      this.scene.clear();
    }
    this.renderer?.domElement?.remove();
    this.renderer?.dispose();
  }
}
