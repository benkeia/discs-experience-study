import { DiscEngineConfig, SoundId } from '../types';

export interface SoundRackMetadata {
  folder: 'music' | 'meca' | 'aero';
  buttonLabel: string;
  incrementNote?: boolean;
  previewParam?: number;
}

export interface SoundCatalogEntry {
  id: SoundId;
  choiceLabel: string;
  rack?: SoundRackMetadata;
}

export const SOUND_CATALOG: readonly SoundCatalogEntry[] = [
  { id: 'none', choiceLabel: '— Muet (Aucun) —' },
  {
    id: 'chime',
    choiceLabel: '🎵 Air Chime (Pentatonique)',
    rack: { folder: 'music', buttonLabel: '🎵 Air Chime (Pentatonique)', incrementNote: true }
  },
  {
    id: 'marimba',
    choiceLabel: '🪵 Lame Bois Marimba',
    rack: { folder: 'music', buttonLabel: '🪵 Lame Bois Marimba', incrementNote: true }
  },
  {
    id: 'hologram',
    choiceLabel: '🌈 Glint Holographique',
    rack: { folder: 'music', buttonLabel: '🌈 Glint Holographique' }
  },
  {
    id: 'vinyl',
    choiceLabel: '📻 Aiguille Vinyle',
    rack: { folder: 'music', buttonLabel: '📻 Aiguille & Vinyle Crépitant' }
  },
  {
    id: 'tape',
    choiceLabel: '📼 Rewind Cassette',
    rack: { folder: 'music', buttonLabel: '📼 Rewind Tête Magnétique' }
  },
  {
    id: 'shutter',
    choiceLabel: '📷 Obturateur Reflex',
    rack: { folder: 'meca', buttonLabel: '📷 Obturateur Reflex (Shutter)' }
  },
  {
    id: 'cassette',
    choiceLabel: '📼 Latch Walkman',
    rack: { folder: 'meca', buttonLabel: '📼 Enclenchement Walkman (Latch)' }
  },
  {
    id: 'spinUp',
    choiceLabel: '⚡ Accélération CD 52x',
    rack: { folder: 'meca', buttonLabel: '⚡ Accélération CD 52x (Spin-Up)' }
  },
  {
    id: 'glitch',
    choiceLabel: '👾 Glitch Saut Laser',
    rack: { folder: 'meca', buttonLabel: '👾 Glitch Saut Laser CD' }
  },
  {
    id: 'coin',
    choiceLabel: '🪙 Pièce Jukebox',
    rack: { folder: 'meca', buttonLabel: '🪙 Pièce Jukebox (Coin Drop)' }
  },
  {
    id: 'velvet',
    choiceLabel: '🧣 Chiffon Velours',
    rack: { folder: 'meca', buttonLabel: '🧣 Frottement Chiffon Velours' }
  },
  {
    id: 'slide',
    choiceLabel: '📦 Frottement Pochette',
    rack: { folder: 'meca', buttonLabel: '📦 Frottement Pochette Carton' }
  },
  {
    id: 'jewelOpen',
    choiceLabel: '💿 Ouverture Boîtier Cristal',
    rack: { folder: 'meca', buttonLabel: '💿 Ouverture Boîtier Cristal' }
  },
  {
    id: 'jewelClose',
    choiceLabel: '📁 Fermeture Boîtier Cristal',
    rack: { folder: 'meca', buttonLabel: '📁 Fermeture Boîtier Cristal' }
  },
  {
    id: 'trayMotor',
    choiceLabel: '🤖 Moteur Éjecteur DVD',
    rack: { folder: 'meca', buttonLabel: '🤖 Moteur Éjecteur DVD' }
  },
  {
    id: 'laserBlip',
    choiceLabel: '🎯 Bip Lentille Laser',
    rack: { folder: 'meca', buttonLabel: '🎯 Bip Lentille Laser' }
  },
  {
    id: 'cascade',
    choiceLabel: '🃏 Cascade Arrivée Disques',
    rack: { folder: 'aero', buttonLabel: '🃏 Cascade Arrivée Disques' }
  },
  {
    id: 'whoosh',
    choiceLabel: '🌪️ Souffle Whoosh',
    rack: { folder: 'aero', buttonLabel: '🌪️ Souffle Grand Spin (Whoosh)', previewParam: 1.0 }
  },
  {
    id: 'whip',
    choiceLabel: '💨 Coup de Vent Whip',
    rack: { folder: 'aero', buttonLabel: '💨 Coup de Vent Tranchant (Whip)' }
  },
  {
    id: 'springBounce',
    choiceLabel: '🪀 Rebond Ressort Élastique',
    rack: { folder: 'aero', buttonLabel: '🪀 Rebond Ressort Élastique' }
  },
  {
    id: 'snap',
    choiceLabel: '⚙️ Clapet Ratchet Snap',
    rack: { folder: 'aero', buttonLabel: '⚙️ Clapet Ratchet (Snap)', previewParam: 6 }
  },
  {
    id: 'flip',
    choiceLabel: '🔄 Flip 180° Dos/Face',
    rack: { folder: 'aero', buttonLabel: '🔄 Flip 180° (Dos / Face)' }
  },
  {
    id: 'tap',
    choiceLabel: '👆 Tap Plastique Doux',
    rack: { folder: 'aero', buttonLabel: '👆 Tap Plastique Doux' }
  },
  {
    id: 'glassPing',
    choiceLabel: '✨ Tintement Polycarbonate',
    rack: { folder: 'aero', buttonLabel: '✨ Tintement Verre Polycarbonate' }
  },
  {
    id: 'subDrop',
    choiceLabel: '🔘 Sub Drop Basse Cinéma',
    rack: { folder: 'aero', buttonLabel: '🔘 Sub Drop Cinéma (Impact)' }
  }
];

interface AudioRamp {
  mode: 'set' | 'linear' | 'exp';
  value: number;
  time: number;
}

interface FilterOptions {
  type: BiquadFilterType;
  freq: number;
  q?: number;
  freqRamps?: AudioRamp[];
}

interface ToneOptions {
  type?: OscillatorType;
  startTime: number;
  stopTime: number;
  freq: number;
  freqRamps?: AudioRamp[];
  gain: number;
  gainRamps: AudioRamp[];
  filter?: FilterOptions;
}

interface NoiseOptions {
  startTime: number;
  stopTime: number;
  gain: number;
  gainRamps: AudioRamp[];
  filter: FilterOptions;
}

function applyRamps(param: AudioParam, ramps?: AudioRamp[]): void {
  if (!ramps) return;
  for (const ramp of ramps) {
    if (ramp.mode === 'set') {
      param.setValueAtTime(ramp.value, ramp.time);
    } else if (ramp.mode === 'linear') {
      param.linearRampToValueAtTime(ramp.value, ramp.time);
    } else {
      param.exponentialRampToValueAtTime(ramp.value, ramp.time);
    }
  }
}

const expRamp = (value: number, time: number): AudioRamp => ({ mode: 'exp', value, time });
const linRamp = (value: number, time: number): AudioRamp => ({ mode: 'linear', value, time });
const setRamp = (value: number, time: number): AudioRamp => ({ mode: 'set', value, time });

function createFilterNode(ctx: AudioContext, startTime: number, opts: FilterOptions): BiquadFilterNode {
  const filter = ctx.createBiquadFilter();
  filter.type = opts.type;
  filter.frequency.setValueAtTime(opts.freq, startTime);
  if (opts.q !== undefined) {
    filter.Q.setValueAtTime(opts.q, startTime);
  }
  applyRamps(filter.frequency, opts.freqRamps);
  return filter;
}

/**
 * Rich procedural Web Audio synthesizer bank.
 * Generates musical chimes, vintage media textures (vinyl, tape, laser),
 * and tactile mechanical sounds (jewel-case, ratchet, motor eject) with zero latency.
 */
export class SoundDesignManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private config: DiscEngineConfig;
  private disposed = false;

  private lastSnapTime = 0;
  private lastWhooshTime = 0;
  private lastChimeTime = 0;

  // Pentatonic scale frequencies in Hz (Eb Major Pentatonic spanning 2 octaves)
  private readonly CHIME_SCALE: number[] = [
    155.56, // Eb3
    174.61, // F3
    196.00, // G3
    233.08, // Bb3
    261.63, // C4
    311.13, // Eb4
    349.23, // F4
    392.00, // G4
    466.16, // Bb4
    523.25, // C5
    622.25, // Eb5
    698.46, // F5
    783.99, // G5
    932.33, // Bb5
    1046.50 // C6
  ];

  private readonly soundHandlers: Record<Exclude<SoundId, 'none'>, (param?: number) => void>;

  constructor(config: DiscEngineConfig) {
    this.config = config;
    this.soundHandlers = {
      chime: (p) => this.playMelodicChime(p ?? 0),
      marimba: (p) => this.playMarimbaTone(p ?? 0),
      hologram: () => this.playHologramSweep(),
      vinyl: () => this.playVinylPop(),
      tape: () => this.playTapeRewind(),
      shutter: () => this.playCameraShutter(),
      cassette: () => this.playCassetteClick(),
      spinUp: () => this.playSpinUp(),
      glitch: () => this.playGlitchArtifact(),
      coin: () => this.playCoinDrop(),
      velvet: () => this.playVelvetRub(),
      slide: () => this.playDiscSlide(),
      jewelOpen: () => this.playJewelCaseOpen(),
      jewelClose: () => this.playJewelCaseClose(),
      trayMotor: () => this.playTrayMotor(),
      laserBlip: () => this.playLaserBlip(),
      cascade: () => this.playCascadeArrival(),
      whoosh: (p) => this.playWhoosh(p ?? 1.0),
      whip: () => this.playAirWhip(),
      springBounce: () => this.playSpringBounce(),
      snap: (p) => this.playSnap(p ?? 6),
      flip: () => this.playFlip(),
      tap: () => this.playTap(),
      glassPing: () => this.playGlassPing(),
      subDrop: () => this.playSubDrop()
    };
  }

  /**
   * Initializes or resumes the AudioContext on first user gesture.
   */
  public async resume(): Promise<void> {
    if (this.disposed || !this.config.soundEnabled) return;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(
        Math.min(1, Math.max(0, this.config.soundVolume)),
        this.ctx.currentTime
      );
      this.masterGain.connect(this.ctx.destination);

      this.generateNoiseBuffer();
    }

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // Audio resume may fail if called without user interaction
      }
    }
  }

  private generateNoiseBuffer(): void {
    if (!this.ctx) return;
    const length = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private getAudioDestination(): { ctx: AudioContext; dest: AudioNode } | null {
    if (this.disposed || !this.config.soundEnabled) return null;
    if (!this.ctx || !this.masterGain) {
      void this.resume();
      return null;
    }
    if (this.ctx.state !== 'running') {
      void this.ctx.resume();
    }
    this.masterGain.gain.setValueAtTime(
      Math.min(1, Math.max(0, this.config.soundVolume)),
      this.ctx.currentTime
    );
    return { ctx: this.ctx, dest: this.masterGain };
  }

  private getContextAndDestination(): { ctx: AudioContext; dest: AudioNode; t: number } | null {
    const audio = this.getAudioDestination();
    if (!audio) return null;
    return { ctx: audio.ctx, dest: audio.dest, t: audio.ctx.currentTime };
  }

  private getNoiseContextAndDestination(): { ctx: AudioContext; dest: AudioNode; t: number } | null {
    if (!this.noiseBuffer) return null;
    return this.getContextAndDestination();
  }

  private getScaleFrequency(index: number): number {
    const len = this.CHIME_SCALE.length;
    return this.CHIME_SCALE[((index % len) + len) % len];
  }

  private scheduleTone(ctx: AudioContext, dest: AudioNode, opts: ToneOptions): void {
    const osc = ctx.createOscillator();
    if (opts.type) osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.freq, opts.startTime);
    applyRamps(osc.frequency, opts.freqRamps);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(opts.gain, opts.startTime);
    applyRamps(gain.gain, opts.gainRamps);

    if (opts.filter) {
      const filter = createFilterNode(ctx, opts.startTime, opts.filter);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(dest);
    osc.start(opts.startTime);
    osc.stop(opts.stopTime);
  }

  private scheduleNoise(ctx: AudioContext, dest: AudioNode, opts: NoiseOptions): void {
    if (!this.noiseBuffer) return;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = createFilterNode(ctx, opts.startTime, opts.filter);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(opts.gain, opts.startTime);
    applyRamps(gain.gain, opts.gainRamps);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(opts.startTime);
    noise.stop(opts.stopTime);
  }

  /**
   * Generic dispatcher to play any procedural sound by its unique identifier.
   */
  public playById(soundId: SoundId, param?: number): void {
    if (soundId === 'none') return;
    this.soundHandlers[soundId]?.(param);
  }

  /* -------------------------------------------------------------------------- */
  /*  1. Sons Mélodiques & Harmoniques ("L'air au changement de CD")            */
  /* -------------------------------------------------------------------------- */

  /**
   * Musical chime note played when browsing from disc to disc.
   * Uses FM-synthesis with warm harmonics and smooth decay.
   */
  public playMelodicChime(index = 0): void {
    const audio = this.getAudioDestination();
    if (!audio) return;
    const { ctx, dest } = audio;

    const now = performance.now();
    if (now - this.lastChimeTime < 70) return;
    this.lastChimeTime = now;

    const t = ctx.currentTime;
    const noteFreq = this.getScaleFrequency(index);

    const carrier = ctx.createOscillator();
    const carrierGain = ctx.createGain();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(noteFreq, t);

    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(noteFreq * 2.002, t);
    modGain.gain.setValueAtTime(noteFreq * 0.8, t);
    modGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    modulator.connect(carrier.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(noteFreq * 3.5, t);
    filter.frequency.exponentialRampToValueAtTime(noteFreq * 1.2, t + 0.5);

    carrierGain.gain.setValueAtTime(0.22, t);
    carrierGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

    carrier.connect(filter);
    filter.connect(carrierGain);
    carrierGain.connect(dest);

    carrier.start(t);
    modulator.start(t);
    carrier.stop(t + 0.58);
    modulator.stop(t + 0.58);
  }

  /**
   * Vintage vinyl needle drop & dust crackle.
   */
  public playVinylPop(): void {
    const a = this.getNoiseContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    this.scheduleTone(ctx, dest, {
      startTime: t,
      stopTime: t + 0.09,
      freq: 120,
      freqRamps: [expRamp(30, t + 0.08)],
      gain: 0.3,
      gainRamps: [expRamp(0.001, t + 0.085)]
    });

    for (let i = 0; i < 4; i += 1) {
      const clickTime = t + 0.01 + Math.random() * 0.06;
      this.scheduleNoise(ctx, dest, {
        startTime: clickTime,
        stopTime: clickTime + 0.012,
        gain: 0.18,
        gainRamps: [expRamp(0.001, clickTime + 0.01)],
        filter: { type: 'highpass', freq: 4000 + Math.random() * 3000 }
      });
    }
  }

  /**
   * Analog tape head rewind chirp.
   */
  public playTapeRewind(): void {
    const a = this.getContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    this.scheduleTone(ctx, dest, {
      type: 'sawtooth',
      startTime: t,
      stopTime: t + 0.15,
      freq: 280,
      freqRamps: [expRamp(1400, t + 0.12)],
      gain: 0.01,
      gainRamps: [
        linRamp(0.2, t + 0.06),
        expRamp(0.0001, t + 0.14)
      ],
      filter: { type: 'bandpass', freq: 650, q: 3.5 }
    });
  }

  /* -------------------------------------------------------------------------- */
  /*  2. Sons Mécaniques & Objets Réels                                         */
  /* -------------------------------------------------------------------------- */

  /**
   * Cardboard sleeve friction when sliding a disc in and out.
   */
  public playDiscSlide(): void {
    const a = this.getNoiseContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    this.scheduleNoise(ctx, dest, {
      startTime: t,
      stopTime: t + 0.14,
      gain: 0.01,
      gainRamps: [
        linRamp(0.18, t + 0.04),
        expRamp(0.001, t + 0.13)
      ],
      filter: {
        type: 'bandpass',
        freq: 620,
        q: 1.8,
        freqRamps: [linRamp(480, t + 0.12)]
      }
    });
  }

  /**
   * Resonant crisp jewel-case latch opening.
   */
  public playJewelCaseOpen(): void {
    const a = this.getContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    this.scheduleTone(ctx, dest, {
      type: 'sine',
      startTime: t,
      stopTime: t + 0.04,
      freq: 2100,
      freqRamps: [expRamp(680, t + 0.035)],
      gain: 0.35,
      gainRamps: [expRamp(0.001, t + 0.038)]
    });
  }

  /**
   * Dry plastic jewel-case latch closing.
   */
  public playJewelCaseClose(): void {
    const a = this.getContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    this.scheduleTone(ctx, dest, {
      type: 'triangle',
      startTime: t,
      stopTime: t + 0.055,
      freq: 480,
      freqRamps: [expRamp(140, t + 0.045)],
      gain: 0.32,
      gainRamps: [expRamp(0.001, t + 0.05)]
    });
  }

  /**
   * Motorized optical tray ejection sound (stepper motor hum + latch).
   */
  public playTrayMotor(): void {
    const a = this.getContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    this.scheduleTone(ctx, dest, {
      type: 'sawtooth',
      startTime: t,
      stopTime: t + 0.26,
      freq: 160,
      freqRamps: [linRamp(190, t + 0.22)],
      gain: 0.01,
      gainRamps: [
        linRamp(0.18, t + 0.04),
        setRamp(0.18, t + 0.18),
        expRamp(0.001, t + 0.25)
      ],
      filter: { type: 'lowpass', freq: 450 }
    });

    this.playJewelCaseOpen();
  }

  /**
   * Retro optical laser pickup calibration beep.
   */
  public playLaserBlip(): void {
    const a = this.getContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    this.scheduleTone(ctx, dest, {
      type: 'sine',
      startTime: t,
      stopTime: t + 0.12,
      freq: 1174.66, // D6
      freqRamps: [setRamp(1760.0, t + 0.04)], // A6
      gain: 0.15,
      gainRamps: [
        setRamp(0.15, t + 0.07),
        expRamp(0.001, t + 0.11)
      ]
    });
  }

  /* -------------------------------------------------------------------------- */
  /*  3. Aérodynamique & Mouvements Rapides                                     */
  /* -------------------------------------------------------------------------- */

  /**
   * Crisp air whip for rapid flicks.
   */
  public playAirWhip(): void {
    const a = this.getNoiseContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    this.scheduleNoise(ctx, dest, {
      startTime: t,
      stopTime: t + 0.1,
      gain: 0.3,
      gainRamps: [expRamp(0.001, t + 0.095)],
      filter: {
        type: 'bandpass',
        freq: 1700,
        q: 3.0,
        freqRamps: [expRamp(350, t + 0.09)]
      }
    });
  }

  /**
   * Distinct swoosh & multi-card cascade sound when flanking discs rush in from the sides.
   */
  public playCascadeArrival(): void {
    const a = this.getNoiseContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    this.scheduleNoise(ctx, dest, {
      startTime: t,
      stopTime: t + 0.32,
      gain: 0.01,
      gainRamps: [
        linRamp(0.35, t + 0.05),
        expRamp(0.001, t + 0.3)
      ],
      filter: {
        type: 'bandpass',
        freq: 1400,
        q: 2.4,
        freqRamps: [expRamp(380, t + 0.28)]
      }
    });

    const clickDelays = [0.04, 0.09, 0.14, 0.19];
    clickDelays.forEach((delay, idx) => {
      const clickTime = t + delay;
      this.scheduleTone(ctx, dest, {
        type: 'triangle',
        startTime: clickTime,
        stopTime: clickTime + 0.025,
        freq: 650 + idx * 90,
        freqRamps: [expRamp(180, clickTime + 0.02)],
        gain: 0.18 - idx * 0.02,
        gainRamps: [expRamp(0.001, clickTime + 0.022)]
      });
    });
  }

  /**
   * Aerodynamic air spin whoosh for fast flick or 360° spin intro.
   */
  public playWhoosh(intensity = 1.0): void {
    const a = this.getNoiseContextAndDestination();
    if (!a) return;

    const now = performance.now();
    if (now - this.lastWhooshTime < 200) return;
    this.lastWhooshTime = now;

    const { ctx, dest, t } = a;
    const duration = 0.55;
    const scale = Math.min(1.2, Math.max(0.4, intensity));

    this.scheduleNoise(ctx, dest, {
      startTime: t,
      stopTime: t + duration,
      gain: 0.0001,
      gainRamps: [
        linRamp(0.32 * scale, t + duration * 0.35),
        expRamp(0.0001, t + duration)
      ],
      filter: {
        type: 'bandpass',
        freq: 220,
        q: 2.2,
        freqRamps: [
          expRamp(820 * scale, t + duration * 0.45),
          expRamp(180, t + duration)
        ]
      }
    });
  }

  /* -------------------------------------------------------------------------- */
  /*  4. Impacts & Taps Tactiles                                                */
  /* -------------------------------------------------------------------------- */

  /**
   * Mechanical camera reflex shutter (mirror slap + curtain release).
   */
  public playCameraShutter(): void {
    const a = this.getNoiseContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    this.scheduleTone(ctx, dest, {
      type: 'triangle',
      startTime: t,
      stopTime: t + 0.022,
      freq: 1400,
      freqRamps: [expRamp(320, t + 0.018)],
      gain: 0.35,
      gainRamps: [expRamp(0.001, t + 0.02)]
    });

    this.scheduleNoise(ctx, dest, {
      startTime: t,
      stopTime: t + 0.018,
      gain: 0.25,
      gainRamps: [expRamp(0.001, t + 0.015)],
      filter: { type: 'highpass', freq: 3600 }
    });

    const t2 = t + 0.038;
    this.scheduleTone(ctx, dest, {
      type: 'sine',
      startTime: t2,
      stopTime: t2 + 0.04,
      freq: 680,
      freqRamps: [expRamp(120, t2 + 0.03)],
      gain: 0.38,
      gainRamps: [expRamp(0.001, t2 + 0.035)]
    });
  }

  /**
   * Shimmering iridescent holographic sweep (spectral rainbow reflection).
   */
  public playHologramSweep(): void {
    const audio = this.getAudioDestination();
    if (!audio) return;
    const { ctx, dest } = audio;
    const t = ctx.currentTime;
    const dur = 0.35;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(1318.51, t); // E6
    osc1.frequency.exponentialRampToValueAtTime(2093.0, t + dur); // C7
    osc2.frequency.setValueAtTime(1975.53, t); // B6
    osc2.frequency.exponentialRampToValueAtTime(3135.96, t + dur); // G7

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(4500, t + dur);
    filter.Q.value = 4.0;

    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.2, t + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(g);
    g.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + dur);
    osc2.stop(t + dur);
  }

  /**
   * CD laser tracking glitch / digital buffer jump artifact.
   */
  public playGlitchArtifact(): void {
    const a = this.getContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    const notes = [1760, 880, 2640, 1320];
    notes.forEach((freq, i) => {
      const stepT = t + i * 0.016;
      this.scheduleTone(ctx, dest, {
        type: 'sawtooth',
        startTime: stepT,
        stopTime: stepT + 0.015,
        freq,
        gain: 0.18,
        gainRamps: [expRamp(0.001, stepT + 0.012)],
        filter: { type: 'bandpass', freq, q: 6 }
      });
    });
  }

  /**
   * Heavy vintage Walkman / Cassette PLAY latch.
   */
  public playCassetteClick(): void {
    const a = this.getContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    this.scheduleTone(ctx, dest, {
      type: 'triangle',
      startTime: t,
      stopTime: t + 0.06,
      freq: 190,
      freqRamps: [expRamp(42, t + 0.05)],
      gain: 0.42,
      gainRamps: [expRamp(0.001, t + 0.055)]
    });

    this.scheduleTone(ctx, dest, {
      type: 'sine',
      startTime: t,
      stopTime: t + 0.03,
      freq: 3200,
      freqRamps: [expRamp(1800, t + 0.025)],
      gain: 0.2,
      gainRamps: [expRamp(0.001, t + 0.028)]
    });
  }

  /**
   * Warm acoustic wooden marimba / kalimba note.
   */
  public playMarimbaTone(index = 0): void {
    const a = this.getContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    const baseFreq = this.getScaleFrequency(index);

    this.scheduleTone(ctx, dest, {
      type: 'sine',
      startTime: t,
      stopTime: t + 0.3,
      freq: baseFreq,
      gain: 0.35,
      gainRamps: [expRamp(0.001, t + 0.28)]
    });

    this.scheduleTone(ctx, dest, {
      type: 'sine',
      startTime: t,
      stopTime: t + 0.05,
      freq: baseFreq * 3.8,
      gain: 0.18,
      gainRamps: [expRamp(0.001, t + 0.045)]
    });

    this.scheduleTone(ctx, dest, {
      type: 'triangle',
      startTime: t,
      stopTime: t + 0.02,
      freq: 450,
      freqRamps: [expRamp(80, t + 0.015)],
      gain: 0.25,
      gainRamps: [expRamp(0.001, t + 0.018)]
    });
  }

  /**
   * Jukebox coin insertion ting and roll.
   */
  public playCoinDrop(): void {
    const a = this.getContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    this.scheduleTone(ctx, dest, {
      type: 'sine',
      startTime: t,
      stopTime: t + 0.2,
      freq: 3135.96, // G7
      gain: 0.3,
      gainRamps: [expRamp(0.001, t + 0.18)]
    });

    const t2 = t + 0.055;
    this.scheduleTone(ctx, dest, {
      type: 'sine',
      startTime: t2,
      stopTime: t2 + 0.14,
      freq: 2637.02, // E7
      gain: 0.22,
      gainRamps: [expRamp(0.001, t2 + 0.12)]
    });
  }

  /**
   * High-speed 52x CD drive motor spin-up spool.
   */
  public playSpinUp(): void {
    const a = this.getContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;
    const dur = 0.42;

    this.scheduleTone(ctx, dest, {
      type: 'sawtooth',
      startTime: t,
      stopTime: t + dur,
      freq: 65,
      freqRamps: [expRamp(540, t + dur)],
      gain: 0.01,
      gainRamps: [
        linRamp(0.24, t + dur * 0.4),
        expRamp(0.001, t + dur)
      ],
      filter: {
        type: 'lowpass',
        freq: 180,
        freqRamps: [expRamp(950, t + dur)]
      }
    });
  }

  /**
   * Soft microfiber cloth rub cleaning disc polycarbonate.
   */
  public playVelvetRub(): void {
    const a = this.getNoiseContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;
    const dur = 0.24;

    this.scheduleNoise(ctx, dest, {
      startTime: t,
      stopTime: t + dur,
      gain: 0.001,
      gainRamps: [
        linRamp(0.22, t + dur * 0.4),
        expRamp(0.001, t + dur)
      ],
      filter: {
        type: 'lowpass',
        freq: 450,
        freqRamps: [
          linRamp(750, t + dur * 0.5),
          linRamp(380, t + dur)
        ]
      }
    });
  }

  /**
   * Elastic boundary spring bounce.
   */
  public playSpringBounce(): void {
    const a = this.getContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;
    const dur = 0.28;

    this.scheduleTone(ctx, dest, {
      type: 'sine',
      startTime: t,
      stopTime: t + dur,
      freq: 260,
      freqRamps: [
        linRamp(180, t + 0.07),
        linRamp(240, t + 0.14),
        linRamp(160, t + 0.21),
        expRamp(90, t + dur)
      ],
      gain: 0.3,
      gainRamps: [expRamp(0.001, t + dur)]
    });
  }

  /**
   * Cinematic sub drop boom (low bass impact).
   */
  public playSubDrop(): void {
    const a = this.getContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    this.scheduleTone(ctx, dest, {
      type: 'sine',
      startTime: t,
      stopTime: t + 0.42,
      freq: 85,
      freqRamps: [expRamp(32, t + 0.38)],
      gain: 0.4,
      gainRamps: [expRamp(0.001, t + 0.4)]
    });
  }

  /**
   * Fine crystal ping on high-density polycarbonate edge.
   */
  public playGlassPing(): void {
    const a = this.getContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    this.scheduleTone(ctx, dest, {
      type: 'sine',
      startTime: t,
      stopTime: t + 0.42,
      freq: 2640,
      gain: 0.2,
      gainRamps: [expRamp(0.0001, t + 0.4)]
    });
  }

  /**
   * Crisp tactile snap/ratchet tick when passing between discs.
   */
  public playSnap(velocity = 0): void {
    const a = this.getNoiseContextAndDestination();
    if (!a) return;

    const now = performance.now();
    if (now - this.lastSnapTime < 45) return;
    this.lastSnapTime = now;

    const { ctx, dest, t } = a;
    const speedFactor = Math.min(1.5, 1 + velocity * 0.04);
    const baseFreq = (950 + (Math.random() - 0.5) * 80) * speedFactor;

    this.scheduleTone(ctx, dest, {
      type: 'triangle',
      startTime: t,
      stopTime: t + 0.03,
      freq: baseFreq,
      freqRamps: [expRamp(baseFreq * 0.35, t + 0.025)],
      gain: 0.32,
      gainRamps: [expRamp(0.0001, t + 0.028)]
    });

    this.scheduleNoise(ctx, dest, {
      startTime: t,
      stopTime: t + 0.02,
      gain: 0.18,
      gainRamps: [expRamp(0.0001, t + 0.016)],
      filter: { type: 'bandpass', freq: 3200 * speedFactor, q: 4.0 }
    });
  }

  /**
   * Two-stage jewel-case plastic latch snap when flipping the disc 180°.
   */
  public playFlip(): void {
    const a = this.getContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    this.scheduleTone(ctx, dest, {
      type: 'sine',
      startTime: t,
      stopTime: t + 0.025,
      freq: 1350,
      freqRamps: [expRamp(450, t + 0.02)],
      gain: 0.3,
      gainRamps: [expRamp(0.0001, t + 0.022)]
    });

    const t2 = t + 0.095;
    this.scheduleTone(ctx, dest, {
      type: 'triangle',
      startTime: t2,
      stopTime: t2 + 0.045,
      freq: 580,
      freqRamps: [expRamp(160, t2 + 0.035)],
      gain: 0.28,
      gainRamps: [expRamp(0.0001, t2 + 0.04)]
    });
  }

  /**
   * Soft plastic impact tap when clicking to select a lateral disc.
   */
  public playTap(): void {
    const a = this.getContextAndDestination();
    if (!a) return;
    const { ctx, dest, t } = a;

    this.scheduleTone(ctx, dest, {
      type: 'sine',
      startTime: t,
      stopTime: t + 0.05,
      freq: 320,
      freqRamps: [expRamp(90, t + 0.045)],
      gain: 0.25,
      gainRamps: [expRamp(0.0001, t + 0.048)]
    });
  }

  public setVolume(volume: number): void {
    this.config.soundVolume = Math.min(1, Math.max(0, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.config.soundVolume, this.ctx.currentTime);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.config.soundEnabled = enabled;
  }

  public dispose(): void {
    this.disposed = true;
    this.masterGain?.disconnect();
    this.masterGain = null;
    this.noiseBuffer = null;
    if (this.ctx) {
      try {
        void this.ctx.close();
      } catch {
        // AudioContext may already be closed
      }
      this.ctx = null;
    }
  }
}
