import * as THREE from 'three';
import { DiscEngineConfig } from '../types';
import {
  ProceduralSettings,
  GeneratorJob,
  PROCEDURAL_BUILDERS
} from './proceduralGeneration';

export type { ProceduralSettings, GeneratorJob };

/* -------------------------------------------------------------------------- */
/*  Web Worker & Procedural Surface Generation                                */
/* -------------------------------------------------------------------------- */

export async function buildProceduralCanvas(
  job: GeneratorJob,
  size: number,
  settings: ProceduralSettings,
  signal?: AbortSignal
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  if (signal?.aborted) return canvas;

  const data = await new Promise<Uint8ClampedArray | null>((resolve) => {
    let worker: Worker | null = null;
    let settled = false;

    const cleanup = () => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      if (worker) {
        worker.terminate();
        worker = null;
      }
    };

    const finish = (result: Uint8ClampedArray | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const onAbort = () => finish(null);
    signal?.addEventListener('abort', onAbort, { once: true });

    // Fallback: run directly on the main thread if Worker is unsupported or fails
    const runFallback = (): Uint8ClampedArray | null => {
      if (signal?.aborted) return null;
      const builder = PROCEDURAL_BUILDERS[job];
      return builder ? builder(size, settings) : null;
    };

    try {
      worker = new Worker(new URL('./proceduralWorker.ts', import.meta.url), {
        type: 'module'
      });

      worker.onmessage = (e: MessageEvent<{ data: Uint8ClampedArray }>) => {
        finish(e.data.data);
      };

      worker.onerror = () => {
        finish(runFallback());
      };

      worker.postMessage({ job, size, settings });
    } catch {
      finish(runFallback());
    }
  });

  if (!data || signal?.aborted) return canvas;

  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const imageData = ctx.createImageData(size, size);
    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);
  }
  return canvas;
}

/* -------------------------------------------------------------------------- */
/*  Studio Environment & Matrix Canvases                                      */
/* -------------------------------------------------------------------------- */

export function createEnvironmentCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#25282f');
  grad.addColorStop(0.5, '#0e0f13');
  grad.addColorStop(1, '#020203');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  const r = 0.07;
  const strips: Array<[number, number, number]> = [
    [0.14, r, 1],
    [0.4, r * 0.7, 0.6],
    [0.26, r * 1.1, 0.85],
    [0.62, r * 0.5, 0.35]
  ];

  strips.forEach(([yPos, halfH, intensity]) => {
    const strip = ctx.createLinearGradient(0, 512 * (yPos - halfH), 0, 512 * (yPos + halfH));
    strip.addColorStop(0, 'rgba(255,255,255,0)');
    strip.addColorStop(0.5, `rgba(255,255,255,${Math.max(0.1, 0.85 * intensity)})`);
    strip.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = strip;
    ctx.fillRect(0, 512 * (yPos - halfH), 1024, 512 * halfH * 2);
  });

  return canvas;
}

export function createMatrixCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const grad = ctx.createRadialGradient(256, 256, 40.96, 256, 256, 256);
  grad.addColorStop(0, '#d9dde4');
  grad.addColorStop(0.42, '#f0f2f5');
  grad.addColorStop(0.72, '#cfd4dc');
  grad.addColorStop(1, '#b8bec8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  ctx.lineWidth = 1;
  const rings = [0.255, 0.285, 0.315, 0.345];
  rings.forEach((radius, idx) => {
    ctx.strokeStyle = `rgba(255,255,255,${0.14 - idx * 0.018})`;
    ctx.beginPath();
    ctx.arc(256, 256, 512 * radius, 0, Math.PI * 2);
    ctx.stroke();
  });

  return canvas;
}

/* -------------------------------------------------------------------------- */
/*  Artwork Image Processing & Texture Utilities                              */
/* -------------------------------------------------------------------------- */

export function processArtworkToCanvas(
  img: HTMLImageElement,
  config: Pick<
    DiscEngineConfig,
    'artResolution' | 'holeSize' | 'hubSize' | 'artBright' | 'artContrast' | 'artSat' | 'artX' | 'artY' | 'artRot' | 'artScale'
  >
): HTMLCanvasElement {
  const size = config.artResolution;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const innerHole = size * 0.5 * Math.max(config.holeSize, config.hubSize);

  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.arc(size / 2, size / 2, innerHole, 0, Math.PI * 2, true);
  ctx.clip('evenodd');

  ctx.fillStyle = '#0c0c0e';
  ctx.fillRect(0, 0, size, size);

  ctx.filter = `brightness(${config.artBright}) contrast(${config.artContrast}) saturate(${config.artSat})`;
  ctx.translate(size / 2 + config.artX * size, size / 2 - config.artY * size);
  ctx.rotate(THREE.MathUtils.degToRad(config.artRot));

  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
    const aspect = img.naturalWidth / img.naturalHeight;
    let drawW = size * config.artScale;
    let drawH = size * config.artScale;
    if (aspect > 1) {
      drawW = drawH * aspect;
    } else {
      drawH = drawW / aspect;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  }
  ctx.filter = 'none';
  ctx.restore();

  return canvas;
}

/**
 * Computes the vibrant dominant chromatic color of the disc artwork
 * used by Chameleon Ambient Lighting via HSL chromatic binning.
 */
export function extractDominantColor(img: HTMLImageElement): THREE.Color {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return new THREE.Color(0xffffff);

  ctx.drawImage(img, 0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size).data;

  const center = size / 2;
  const minR = size * 0.15;
  const maxR = size * 0.48;

  // HSL Chromatic Binning (24 bins of 15 degrees)
  const bins = new Float32Array(24);
  const binHue = new Float32Array(24);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.hypot(dx, dy);
      if (dist < minR || dist > maxR) continue;

      const idx = (y * size + x) * 4;
      const a = imgData[idx + 3];
      if (a < 50) continue;

      const r = imgData[idx] / 255;
      const g = imgData[idx + 1] / 255;
      const b = imgData[idx + 2] / 255;

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const delta = maxC - minC;
      const l = (maxC + minC) / 2;

      // Discard desaturated pixels (greys, blacks, whites)
      if (delta < 0.12 || l < 0.08 || l > 0.92) continue;

      let h = 0;
      if (maxC === r) {
        h = ((g - b) / delta) % 6;
      } else if (maxC === g) {
        h = (b - r) / delta + 2;
      } else {
        h = (r - g) / delta + 4;
      }
      h = (h * 60 + 360) % 360;

      const sat = delta / (1 - Math.abs(2 * l - 1));
      const binIdx = Math.floor(h / 15) % 24;
      const weight = sat * sat * (1 - Math.abs(l - 0.5));

      bins[binIdx] += weight;
      binHue[binIdx] = h;
    }
  }

  let bestBin = -1;
  let maxWeight = 0;
  for (let b = 0; b < 24; b += 1) {
    if (bins[b] > maxWeight) {
      maxWeight = bins[b];
      bestBin = b;
    }
  }

  if (bestBin >= 0 && maxWeight > 0.05) {
    const dominantH = binHue[bestBin] / 360;
    return new THREE.Color().setHSL(dominantH, 0.88, 0.52);
  }

  return new THREE.Color(0xffffff);
}

export function toCanvasTexture(
  canvas: HTMLCanvasElement,
  renderer: THREE.WebGLRenderer,
  colorSpace: THREE.ColorSpace = THREE.NoColorSpace
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = colorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

export function createPlaceholderTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const placeholderCanvas = document.createElement('canvas');
  placeholderCanvas.width = 16;
  placeholderCanvas.height = 16;
  const pCtx = placeholderCanvas.getContext('2d');
  if (pCtx) {
    pCtx.fillStyle = '#0c0c0e';
    pCtx.fillRect(0, 0, 16, 16);
  }
  return toCanvasTexture(placeholderCanvas, renderer, THREE.SRGBColorSpace);
}
