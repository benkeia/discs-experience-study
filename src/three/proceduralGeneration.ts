/**
 * Procedural texture generation algorithms for optical disc surfaces.
 * Pure mathematical functions independent of the DOM and WebGL context.
 * Can be run in a Web Worker or directly on the main thread as a fallback.
 */

export interface ProceduralSettings {
  texPrint: number;
  texScratches: number;
  texGrain: number;
  texGloss: number;
  frontRough: number;
}

export type GeneratorJob = 'frontNormal' | 'frontRough' | 'backScratch';

/**
 * Fast deterministic pseudo-random 2D value noise.
 */
function valueNoise(x: number, y: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Computes normal vectors from a height map using central differences (Sobel gradient filter)
 * and packs the normalized vector (nx, ny, nz) into RGBA bytes: [0, 255] -> [-1, 1].
 */
function writeNormals(heightMap: Float32Array, data: Uint8ClampedArray, size: number): void {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = heightMap[y * size + Math.max(0, x - 1)];
      const right = heightMap[y * size + Math.min(size - 1, x + 1)];
      const up = heightMap[Math.max(0, y - 1) * size + x];
      const down = heightMap[Math.min(size - 1, y + 1) * size + x];

      let nx = left - right;
      let ny = up - down;
      let nz = 1;

      const inverse = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      const index = (y * size + x) * 4;

      nx *= inverse;
      ny *= inverse;
      nz *= inverse;

      data[index] = (nx * 0.5 + 0.5) * 255;
      data[index + 1] = (ny * 0.5 + 0.5) * 255;
      data[index + 2] = (nz * 0.5 + 0.5) * 255;
      data[index + 3] = 255;
    }
  }
}

/**
 * Generates front artwork normal map (subtle paper grain, ink relief, hairline scratches and dust).
 */
export function generateFrontNormal(size: number, s: ProceduralSettings): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  const heightMap = new Float32Array(size * size);
  const center = size / 2;

  // 1. Subtle radial waviness + fine ink relief
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const radiusValue = Math.sqrt(dx * dx + dy * dy) + 0.0001;

      const optical = Math.sin(radiusValue * 0.6) * 0.02;
      const ink = (valueNoise(x * 0.4, y * 0.4) - 0.5) * 0.5 * s.texPrint;

      heightMap[y * size + x] = optical + ink;
    }
  }

  // 2. Linear hairline scratches
  const scratchCount = Math.floor(30 * s.texScratches);
  for (let scratch = 0; scratch < scratchCount; scratch += 1) {
    const angle = Math.random() * Math.PI * 2;
    const length = 30 + Math.random() * 220;
    const startX = Math.random() * size;
    const startY = Math.random() * size;
    const deltaX = Math.cos(angle);
    const deltaY = Math.sin(angle);
    const depth = (Math.random() * 0.7 + 0.2) * s.texScratches;

    for (let step = 0; step < length; step += 1) {
      const px = Math.round(startX + deltaX * step);
      const py = Math.round(startY + deltaY * step);

      if (px < 1 || py < 1 || px >= size - 1 || py >= size - 1) continue;
      heightMap[py * size + px] -= depth;
    }
  }

  // 3. Micro dust specks
  const dustCount = Math.floor(500 * s.texScratches);
  for (let dust = 0; dust < dustCount; dust += 1) {
    const px = Math.floor(Math.random() * size);
    const py = Math.floor(Math.random() * size);
    heightMap[py * size + px] += (Math.random() - 0.5) * s.texScratches * 1.2;
  }

  writeNormals(heightMap, data, size);
  return data;
}

/**
 * Generates front roughness map (print varnish variations, micro-gloss highlights, paper texture).
 */
export function generateFrontRoughness(size: number, s: ProceduralSettings): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  const center = size / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let roughness = s.frontRough;

      roughness += (valueNoise(x * 2.3, y * 2.3) - 0.5) * 0.35 * s.texGrain;
      roughness += (valueNoise(x * 0.5, y * 0.5) - 0.5) * 0.3 * s.texPrint;

      const dx = x - center;
      const dy = y - center;
      const radiusValue = Math.sqrt(dx * dx + dy * dy) / (size * 0.5);

      roughness -= (Math.sin(radiusValue * 14) * 0.5 + 0.5) * 0.5 * s.texGloss;
      roughness = clamp(roughness, 0.02, 1);

      const value = roughness * 255;
      const index = (y * size + x) * 4;

      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }

  return data;
}

/**
 * Generates back mirror scratch mask (concentric rotation scuffs and accidental scratches).
 */
export function generateBackScratch(size: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  const center = size / 2;

  function plot(x: number, y: number, alpha: number): void {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    if (x0 < 1 || y0 < 1 || x0 >= size - 2 || y0 >= size - 2) return;
    const fx = x - x0;
    const fy = y - y0;
    const idx00 = (y0 * size + x0) * 4;
    const idx10 = (y0 * size + (x0 + 1)) * 4;
    const idx01 = ((y0 + 1) * size + x0) * 4;
    const idx11 = ((y0 + 1) * size + (x0 + 1)) * 4;

    data[idx00] = Math.min(255, data[idx00] + alpha * (1 - fx) * (1 - fy) * 255);
    data[idx10] = Math.min(255, data[idx10] + alpha * fx * (1 - fy) * 255);
    data[idx01] = Math.min(255, data[idx01] + alpha * (1 - fx) * fy * 255);
    data[idx11] = Math.min(255, data[idx11] + alpha * fx * fy * 255);
  }

  // 1. Concentric hairline rotation scratches (disc spinning in tray)
  const arcCount = 45;
  for (let a = 0; a < arcCount; a += 1) {
    const r = (0.24 + Math.random() * 0.72) * (size * 0.5);
    const startAngle = Math.random() * Math.PI * 2;
    const arcLen = (0.15 + Math.random() * 0.7) * Math.PI;
    const steps = Math.floor(r * arcLen * 2);
    const intensity = 0.35 + Math.random() * 0.55;

    for (let st = 0; st < steps; st += 1) {
      const angle = startAngle + (st / steps) * arcLen;
      const px = center + Math.cos(angle) * r;
      const py = center + Math.sin(angle) * r;
      plot(px, py, intensity * (0.8 + 0.2 * Math.sin(st * 0.05)));
    }
  }

  // 2. Linear accidental handling scratches
  const linearCount = 50;
  for (let i = 0; i < linearCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const len = 40 + Math.random() * 180;
    const startX = (0.15 + Math.random() * 0.7) * size;
    const startY = (0.15 + Math.random() * 0.7) * size;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const intensity = 0.3 + Math.random() * 0.5;

    for (let step = 0; step < len; step += 1) {
      plot(startX + dx * step, startY + dy * step, intensity);
    }
  }

  // Duplicate grayscale channel into G and B
  for (let i = 0; i < size * size; i += 1) {
    data[i * 4 + 1] = data[i * 4];
    data[i * 4 + 2] = data[i * 4];
    data[i * 4 + 3] = 255;
  }

  return data;
}

export const PROCEDURAL_BUILDERS = {
  frontNormal: generateFrontNormal,
  frontRough: generateFrontRoughness,
  backScratch: (size: number, _settings: ProceduralSettings) => generateBackScratch(size)
} as const;
