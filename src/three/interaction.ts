import * as THREE from 'three';
import { DiscEngineConfig } from '../types';

export const clamp = (val: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, val));

/* -------------------------------------------------------------------------- */
/*  Raycasting & UV Coordinate Projection                                     */
/* -------------------------------------------------------------------------- */

export interface PointerLocation {
  x: number;
  y: number;
  rect: DOMRect;
}

export class RaycastManager {
  public pointerNDC = new THREE.Vector2();
  public hitUV = { x: 0, y: 0 };
  private raycaster = new THREE.Raycaster();
  private intersects: THREE.Intersection[] = [];
  private domElement: HTMLElement;
  private camera: THREE.Camera;

  constructor(domElement: HTMLElement, camera: THREE.Camera) {
    this.domElement = domElement;
    this.camera = camera;
  }

  public updatePointerCoords(e: PointerEvent | MouseEvent): PointerLocation {
    const rect = this.domElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (rect.width > 0 && rect.height > 0) {
      this.pointerNDC.x = (x / rect.width) * 2 - 1;
      this.pointerNDC.y = -(y / rect.height) * 2 + 1;
    }
    return { x, y, rect };
  }

  public raycastDisc(pickMeshes: THREE.Mesh[]): number {
    if (!pickMeshes.length) return -1;
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    this.intersects.length = 0;
    this.raycaster.intersectObjects(pickMeshes, false, this.intersects);
    const hit = this.intersects[0];
    if (!hit) return -1;

    if (hit.uv) {
      this.hitUV.x = hit.uv.x * 2 - 1;
      this.hitUV.y = hit.uv.y * 2 - 1;
    } else {
      this.hitUV.x = 0;
      this.hitUV.y = 0;
    }

    return (hit.object.userData.index as number) ?? -1;
  }
}

/* -------------------------------------------------------------------------- */
/*  Mouse Wheel & Trackpad Inertia Envelope Filter                            */
/* -------------------------------------------------------------------------- */

export class WheelController {
  private wheelReady = true;
  private wheelAccum = 0;
  private wheelDir = 0;
  private wheelLastTime = 0;
  private wheelEnv = 0;
  private wheelPeak = 0;
  private wheelStepCount = 0;
  private wheelLastStepTime = 0;
  private wheelTimer: number | null = null;
  private onStep: (direction: number) => void;

  constructor(onStep: (direction: number) => void) {
    this.onStep = onStep;
  }

  public handleWheel(e: WheelEvent): void {
    let dx = e.deltaX;
    let dy = e.deltaY;

    if (e.deltaMode === 1) {
      dx *= 16;
      dy *= 16;
    } else if (e.deltaMode === 2) {
      dx *= window.innerWidth;
      dy *= window.innerHeight;
    }

    const delta = Math.abs(dx) > Math.abs(dy) * 1.25 ? dx : dy;
    const mag = Math.abs(delta);

    const now = performance.now();
    const gap = this.wheelLastTime ? now - this.wheelLastTime : Infinity;
    this.wheelLastTime = now;

    if (this.wheelTimer) clearTimeout(this.wheelTimer);
    this.wheelTimer = window.setTimeout(() => {
      this.wheelReady = true;
      this.wheelAccum = 0;
      this.wheelDir = 0;
      this.wheelEnv = 0;
      this.wheelPeak = 0;
      this.wheelStepCount = 0;
    }, 150);

    const decay = gap === Infinity ? 0 : Math.exp(-gap / 550);
    const env = this.wheelEnv * decay;
    if (mag < 0.3) {
      this.wheelEnv = env;
      return;
    }

    const rising = mag > env * 1.2;
    this.wheelEnv = Math.max(mag, env);

    if (!this.wheelReady) {
      this.wheelStepCount += 1;
      this.wheelPeak = Math.max(this.wheelPeak, mag);
      const sinceStep = now - this.wheelLastStepTime;
      const allowPause = gap >= 130;
      const allowTick = gap >= 34 && this.wheelStepCount <= 2 && sinceStep >= 90 && mag >= this.wheelPeak;
      const allowFlick = rising && sinceStep >= 190;
      const allowSustain = sinceStep >= 480 && this.wheelEnv >= this.wheelPeak * 0.8;

      if (!(allowPause || allowTick || allowFlick || allowSustain)) return;

      this.wheelReady = true;
      this.wheelAccum = 0;
      this.wheelDir = 0;
    }

    const dir = delta > 0 ? 1 : -1;
    if (dir !== this.wheelDir) {
      this.wheelAccum = 0;
      this.wheelDir = dir;
    }

    this.wheelAccum += Math.min(mag, 24);
    if (this.wheelAccum >= 6) {
      this.wheelReady = false;
      this.wheelAccum = 0;
      this.wheelLastStepTime = now;
      this.wheelStepCount = 0;
      this.wheelPeak = mag;
      this.onStep(dir);
    }
  }

  public dispose(): void {
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
      this.wheelTimer = null;
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Angular Spin Physics & Elastic Resistance                                 */
/* -------------------------------------------------------------------------- */

export function applySpinDelta(
  current: number,
  base: number,
  delta: number,
  config: Pick<DiscEngineConfig, 'maxSpinAngle'>
): number {
  const maxRad = THREE.MathUtils.degToRad(config.maxSpinAngle);
  if (maxRad <= 0) return base;
  const rel = current - base;
  const over = Math.max(0, Math.abs(rel) - maxRad * 0.8) / maxRad;
  const resist = 1 / (1 + over * over * 14);
  return current + delta * (Math.sign(delta) === Math.sign(rel) || rel === 0 ? resist : 1);
}
