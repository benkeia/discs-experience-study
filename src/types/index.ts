import type * as THREE from 'three';

/**
 * Identifiers for all procedural sounds in SoundDesignManager.
 */
export type SoundId =
  | 'none'
  | 'chime'
  | 'marimba'
  | 'hologram'
  | 'vinyl'
  | 'tape'
  | 'shutter'
  | 'cassette'
  | 'spinUp'
  | 'glitch'
  | 'coin'
  | 'velvet'
  | 'slide'
  | 'jewelOpen'
  | 'jewelClose'
  | 'trayMotor'
  | 'laserBlip'
  | 'cascade'
  | 'whoosh'
  | 'whip'
  | 'springBounce'
  | 'snap'
  | 'flip'
  | 'tap'
  | 'glassPing'
  | 'subDrop';

/**
 * Item representing a single disc in the catalog.
 */
export interface DiscItem {
  id: string;
  title: string;
  artwork: string;
  signatureColor?: string;
}

/**
 * Global configuration parameters for the 3D CD/DVD engine.
 */
export interface DiscEngineConfig {
  // Navigation & Infinite Loop
  loopInfini: boolean;

  // Artwork & Front Material
  artScale: number;
  artX: number;
  artY: number;
  artRot: number;
  artBright: number;
  artContrast: number;
  artSat: number;
  texGrain: number;
  texPrint: number;
  texScratches: number;
  texGloss: number;
  frontClearcoat: number;
  frontRough: number;
  frontMetal: number;

  // Back CD Photorealistic Diffraction Shader
  voirDosCD: boolean;
  backBaseColor: string;
  backRough: number;
  backMetal: number;
  backClearcoat: number;
  backScratches: number;
  trackPitch: number; // Optical track pitch in nanometers (DVD: ~740nm, CD: ~1600nm)
  rainbowIntensity: number;
  rainbowSaturation: number;
  anisoSpread: number;
  order2Intensity: number;
  specularCore: number;
  radialRings: number;

  // Edge & Hub Geometry / Materials
  edgeColor: string;
  edgeRoughness: number;
  edgeMetalness: number;
  edgeBleed: number;
  hubColor: string;
  hubTransmission: number;
  hubRoughness: number;
  hubIOR: number;
  hubMatrixIntensity: number;
  hubMatrixWidth: number;
  hubFrostedEdge: number;
  discThickness: number;
  edgeBevel: number;
  holeSize: number;
  hubSize: number;

  // Gallery & Camera
  galleryScale: number;
  hGap: number;
  depthGap: number;
  activeDiscY: number;
  galleryRotX: number;
  galleryRotY: number;
  inactiveScale: number;
  cameraDistance: number;
  cameraFOV: number;

  // Lighting & Atmosphere
  exposure: number;
  environmentIntensity: number;
  keyIntensity: number;
  keyColor: string;
  keyX: number;
  keyY: number;
  fillIntensity: number;
  rimIntensity: number;
  rimColor: string;
  topStripIntensity: number;
  fogColor: string;

  // Hover & Physics
  hoverTiltStrength: number;
  dragSensitivity: number;
  dragVelocitySmoothing: number;
  dragMaxVelocity: number;
  friction: number;
  maxSpinAngle: number;
  resetDuration: number;
  flipDuration: number;
  flipElasticAmp: number;
  flipElasticPeriod: number;
  dragStartDistance: number;
  snapDuration: number;
  flowLean: number;
  flowLeanMax: number;
  flowBank: number;
  flowDip: number;
  flowDipMax: number;
  followTight: number;
  followBase: number;
  followFalloff: number;
  followMin: number;
  snapFreq: number;
  snapDamping: number;
  wipePush: number;
  wipePushMax: number;
  wipeSpin: number;
  wipeSpinMax: number;
  wipeMinSpeed: number;
  pushDamping: number;
  pushReturn: number;
  pressDepth: number;
  pressTilt: number;

  // Scribble Intro & Hover Animation
  scribbleEnabled: boolean;
  scribbleOnHover: boolean;
  scribbleColor: string;
  scribbleFps: number;
  scribblePoints: number;
  scribbleJitter: number;
  scribbleLoops: number;
  scribbleLoopGap: number;
  scribblePadding: number;
  scribbleWidth: number;
  scribbleSweep: number;
  scribbleSweepJitter: number;
  scribbleIn: [number, number, number];
  scribbleOut: [number, number, number];
  scribbleLag: number;

  // Adaptive Ambient / Chameleon Lighting
  chameleonEnabled: boolean;
  chameleonIntensity: number;
  chameleonAura: boolean;
  chameleonRim: boolean;
  chameleonReflections: boolean;

  // Tactile Sound Design (Web Audio API)
  soundEnabled: boolean;
  soundVolume: number;
  soundDiscChange: SoundId;
  soundDiscSnap: SoundId;
  soundDiscFlip: SoundId;
  soundDiscTap: SoundId;
  soundDiscFlick: SoundId;
  soundIntroCenter: SoundId;
  soundIntroCascade: SoundId;
  soundDiscHover: SoundId;

  artResolution: number;
}

/**
 * Internal state for an individual disc instance in the 3D scene.
 */
export interface DiscInstance {
  index: number;
  group: THREE.Group;
  spin: THREE.Group;
  pick: THREE.Mesh;
  frontMaterial: THREE.MeshPhysicalMaterial;
  dominantColor: THREE.Color;
  hover: number;
  hoverUVX: number;
  hoverUVY: number;
  spinX: number;
  spinY: number;
  baseFlipY: number;
  introProgress: number;
  resetTween: gsap.core.Tween | null;
  hoverTween: gsap.core.Tween | null;
  hoverUVTween: gsap.core.Tween | null;
  pushTween: gsap.core.Tween | null;
  pushX: number;
  pushY: number;
  pushZ: number;
  pushRotX: number;
  pushRotY: number;
}

/**
 * Uniforms passed to the custom optical diffraction CD shader.
 */
export interface HolographicUniforms {
  uTrackPitch: { value: number };
  uRainbowIntensity: { value: number };
  uRainbowSaturation: { value: number };
  uAnisoSpread: { value: number };
  uOrder2Intensity: { value: number };
  uSpecularCore: { value: number };
  uRadialRings: { value: number };
  uBackScratches: { value: number };
  uScratchMap: { value: THREE.CanvasTexture | null };
}

/**
 * Navigation triggers for carousel animation.
 */
export type NavigationSource = 'wheel' | 'key' | 'click' | 'flick' | 'snap';
