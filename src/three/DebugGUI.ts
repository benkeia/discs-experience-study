import GUI from 'lil-gui';
import * as THREE from 'three';
import { DiscEngineConfig, HolographicUniforms, SoundId } from '../types';
import { SOUND_CATALOG, SoundDesignManager } from './SoundDesign';

export interface DebugGUIHandlers {
  onFlipActiveDisc: (flipped: boolean) => void;
  onReplayIntro: () => void;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  topStrip: THREE.RectAreaLight;
  backMaterial: THREE.MeshPhysicalMaterial;
  scribbleMaterial: THREE.MeshBasicMaterial;
  sound?: SoundDesignManager;
}

type NumericShaderConfigKey =
  | 'rainbowIntensity'
  | 'trackPitch'
  | 'anisoSpread'
  | 'rainbowSaturation'
  | 'order2Intensity'
  | 'specularCore'
  | 'radialRings'
  | 'backScratches';

type NumericUniformKey = Exclude<keyof HolographicUniforms, 'uScratchMap'>;

const SHADER_SLIDERS: ReadonlyArray<{
  key: NumericShaderConfigKey;
  uniform: NumericUniformKey;
  min: number;
  max: number;
  step: number;
  label: string;
}> = [
  { key: 'rainbowIntensity', uniform: 'uRainbowIntensity', min: 0, max: 4, step: 0.05, label: 'Éclat Arc-en-ciel' },
  { key: 'trackPitch', uniform: 'uTrackPitch', min: 400, max: 1600, step: 10, label: 'Pas des Sillons (nm)' },
  { key: 'anisoSpread', uniform: 'uAnisoSpread', min: 0.02, max: 0.25, step: 0.005, label: 'Finesse du Faisceau' },
  { key: 'rainbowSaturation', uniform: 'uRainbowSaturation', min: 0, max: 1.5, step: 0.05, label: 'Saturation Couleurs' },
  { key: 'order2Intensity', uniform: 'uOrder2Intensity', min: 0, max: 1.5, step: 0.05, label: 'Ordre 2 (Double Arc)' },
  { key: 'specularCore', uniform: 'uSpecularCore', min: 0, max: 1.5, step: 0.05, label: 'Faisceau Argenté' },
  { key: 'radialRings', uniform: 'uRadialRings', min: 0, max: 1.5, step: 0.05, label: 'Stries Concentriques' },
  { key: 'backScratches', uniform: 'uBackScratches', min: 0, max: 1, step: 0.01, label: 'Rayures du Dos' }
];

type SoundAssignmentKey =
  | 'soundDiscChange'
  | 'soundDiscSnap'
  | 'soundDiscFlip'
  | 'soundDiscTap'
  | 'soundDiscFlick'
  | 'soundIntroCenter'
  | 'soundIntroCascade'
  | 'soundDiscHover';

const SOUND_ASSIGNMENTS: ReadonlyArray<{
  key: SoundAssignmentKey;
  label: string;
  previewParam?: number;
}> = [
  { key: 'soundDiscChange', label: 'Changement de CD (Air / Note)', previewParam: 2 },
  { key: 'soundDiscSnap', label: 'Cran Défilement (Snap / Ratchet)', previewParam: 8 },
  { key: 'soundDiscFlip', label: 'Retournement 180° (Flip)' },
  { key: 'soundDiscTap', label: 'Sélection Disque (Tap)' },
  { key: 'soundDiscFlick', label: 'Lancer Rapide (Flick)', previewParam: 1.1 },
  { key: 'soundIntroCenter', label: 'Intro : Spin 1er DVD', previewParam: 1.1 },
  { key: 'soundIntroCascade', label: 'Intro : Arrivée Latérale' },
  { key: 'soundDiscHover', label: 'Survol Disque (Hover)' }
];

export function setupDebugGUI(
  config: DiscEngineConfig,
  uniforms: HolographicUniforms,
  handlers: DebugGUIHandlers
): GUI {
  const gui = new GUI({ title: 'CD / DVD Controls', width: 310 });

  // 1. Holographic & Optical Shader Controls
  const fHolo = gui.addFolder('Dos du CD (Shader Réaliste)');
  fHolo
    .add(config, 'voirDosCD')
    .name('🔄 Retourner le CD actif')
    .onChange((val: boolean) => {
      handlers.onFlipActiveDisc(val);
    });

  for (const slider of SHADER_SLIDERS) {
    fHolo
      .add(config, slider.key, slider.min, slider.max, slider.step)
      .name(slider.label)
      .onChange((v: number) => {
        uniforms[slider.uniform].value = v;
      });
  }

  fHolo
    .addColor(config, 'backBaseColor')
    .name('Couleur Métal Miroir')
    .onChange((v: string) => {
      handlers.backMaterial.color.set(v);
    });

  fHolo
    .add(config, 'backRough', 0.01, 0.35, 0.01)
    .name('Rugosité Miroir')
    .onChange((v: number) => {
      handlers.backMaterial.roughness = v;
    });

  fHolo
    .add(config, 'backMetal', 0.5, 1, 0.01)
    .name('Métallicité')
    .onChange((v: number) => {
      handlers.backMaterial.metalness = v;
    });

  // 2. Navigation & Infinite Loop
  const fNav = gui.addFolder('Navigation & Galerie');
  fNav.add({ replay: () => handlers.onReplayIntro() }, 'replay').name('▶️ Rejouer le Spin In');
  fNav.add(config, 'loopInfini').name('♾️ Boucle Infinie (Loop)');
  fNav.add(config, 'hGap', 1.5, 3.5, 0.1).name('Espacement Horizontal');
  fNav.add(config, 'depthGap', 0.4, 2.0, 0.1).name('Profondeur 3D');
  fNav.add(config, 'galleryScale', 0.6, 1.6, 0.02).name('Échelle Globale');

  // 3. Hover & A24 Effects
  const fHover = gui.addFolder('Hover & Effet A24');
  fHover.add(config, 'flipDuration', 0.8, 3.0, 0.05).name('Durée Flip (s)');
  fHover.add(config, 'flipElasticAmp', 0.5, 2.0, 0.05).name('Dépassement Elastic (Amp)');
  fHover.add(config, 'flipElasticPeriod', 0.4, 2.0, 0.05).name('Période Elastic (Lenteur)');
  fHover.add(config, 'hoverTiltStrength', 0, 0.8, 0.02).name('Inclinaison Hover');
  fHover.add(config, 'wipePush', 0, 0.06, 0.002).name('Impulsion Passage');
  fHover.add(config, 'wipeSpin', 0, 0.05, 0.002).name('Rotation Passage');
  fHover.add(config, 'scribbleEnabled').name('Crayonnage A24');
  fHover.add(config, 'scribbleOnHover').name('Crayonnage au Hover');
  fHover
    .addColor(config, 'scribbleColor')
    .name('Couleur Trait')
    .onChange((v: string) => {
      handlers.scribbleMaterial.color.set(v);
    });
  fHover.add(config, 'scribbleFps', 4, 24, 1).name('FPS Crayonnage');
  fHover.close();

  // 4. Adaptive Ambient Lighting (Chameleon)
  const fChameleon = gui.addFolder('🦎 Éclairage Caméléon (Adaptatif)');
  fChameleon.add(config, 'chameleonEnabled').name('Activer Caméléon');
  fChameleon.add(config, 'chameleonIntensity', 0, 1, 0.02).name('Intensité Teinte & Halo');
  fChameleon.add(config, 'chameleonAura').name('Halo Ambiant (Backdrop)');
  fChameleon.add(config, 'chameleonRim').name('Teinter Rim-Light');
  fChameleon.add(config, 'chameleonReflections').name('Teinter Reflets Studio');
  fChameleon.close();

  // 5. Lighting & Studio
  const fLight = gui.addFolder('Éclairage Studio');
  fLight
    .add(config, 'exposure', 0.4, 1.8, 0.02)
    .name('Exposition')
    .onChange((v: number) => {
      handlers.renderer.toneMappingExposure = v;
    });
  fLight
    .add(config, 'environmentIntensity', 0.2, 2.5, 0.05)
    .name('Reflets Studio')
    .onChange((v: number) => {
      handlers.scene.environmentIntensity = v;
    });
  fLight
    .add(config, 'topStripIntensity', 0, 5, 0.1)
    .name('Néon Sommital')
    .onChange((v: number) => {
      handlers.topStrip.intensity = v;
    });
  fLight.close();

  // 6. Tactile Sound Design & Sound Bank
  const fSound = gui.addFolder('🔊 Sound Design & Banque de Sons');
  fSound.add(config, 'soundEnabled').name('Activer le Son');
  fSound
    .add(config, 'soundVolume', 0, 1, 0.05)
    .name('Volume Général')
    .onChange((v: number) => {
      handlers.sound?.setVolume(v);
    });

  const soundChoices: Record<string, SoundId> = {};
  for (const entry of SOUND_CATALOG) {
    soundChoices[entry.choiceLabel] = entry.id;
  }

  const fAssign = fSound.addFolder('🎛️ Assigner un Son par Interaction');
  for (const item of SOUND_ASSIGNMENTS) {
    fAssign
      .add(config, item.key, soundChoices)
      .name(item.label)
      .onChange((v: SoundId) => handlers.sound?.playById(v, item.previewParam));
  }

  const rackFolders: Record<'music' | 'meca' | 'aero', GUI> = {
    music: fSound.addFolder('🎵 Airs, Harmonies & Shimmer'),
    meca: fSound.addFolder('⚙️ Mécanique, Lecteur & Vintage'),
    aero: fSound.addFolder('🌪️ Aérodynamique, Rebonds & Impacts')
  };

  const noteCursors: Partial<Record<SoundId, number>> = {};
  for (const entry of SOUND_CATALOG) {
    if (!entry.rack) continue;
    const { folder, buttonLabel, incrementNote, previewParam } = entry.rack;
    rackFolders[folder]
      .add(
        {
          trigger: () => {
            if (incrementNote) {
              const nextNote = noteCursors[entry.id] ?? 0;
              handlers.sound?.playById(entry.id, nextNote);
              noteCursors[entry.id] = nextNote + 1;
            } else {
              handlers.sound?.playById(entry.id, previewParam);
            }
          }
        },
        'trigger'
      )
      .name(buttonLabel);
  }

  return gui;
}
