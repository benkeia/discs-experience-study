import * as THREE from 'three';
import gsap from 'gsap';
import { DiscEngineConfig, DiscInstance } from '../types';

/* -------------------------------------------------------------------------- */
/*  Internal Ribbon Geometry & Dynamic Jitter                                 */
/* -------------------------------------------------------------------------- */

const _targetQuat = new THREE.Quaternion();

function createScribbleGeometry(config: Pick<DiscEngineConfig, 'scribblePoints'>): THREE.BufferGeometry {
  const segs = config.scribblePoints * 3;
  const geo = new THREE.BufferGeometry();
  const vertCount = (segs + 1) * 2;
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertCount * 3), 3));

  const indices: number[] = [];
  for (let i = 0; i < segs; i += 1) {
    const base = i * 2;
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
  geo.setIndex(indices);
  // Pre-set static bounding sphere to prevent expensive recalculations per stop-motion frame
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2.0);
  return geo;
}

function updateScribbleLoop(
  geo: THREE.BufferGeometry,
  loopIdx: number,
  coverage: number,
  config: DiscEngineConfig,
  noiseBuffer: Float32Array
): void {
  const segs = config.scribblePoints * 3;
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  if (!pos) return;

  const baseRadius = 1 * (1 + config.scribblePadding + loopIdx * config.scribbleLoopGap);
  const halfWidth = 1 * config.scribbleWidth * 0.5;
  const clampedSweep = Math.min(
    1,
    Math.max(0.12, config.scribbleSweep * (1 + (Math.random() - 0.5) * config.scribbleSweepJitter))
  );
  const sweep = clampedSweep * coverage;
  const totalAngle = Math.PI * 2 * sweep;
  const startAngle = Math.random() * Math.PI * 2;

  const pointCount = config.scribblePoints;
  for (let i = 0; i <= pointCount; i += 1) {
    noiseBuffer[i] = 1 + (Math.random() - 0.5) * 2 * config.scribbleJitter;
  }

  for (let i = 0; i <= segs; i += 1) {
    const t = i / segs;
    const angle = startAngle + t * totalAngle;
    const u = t * pointCount * sweep;
    const idx0 = Math.floor(u);
    const idx1 = Math.min(pointCount, idx0 + 1);
    const frac = u - idx0;
    const smooth = frac * frac * (3 - 2 * frac);
    const rFactor = noiseBuffer[idx0] * (1 - smooth) + noiseBuffer[idx1] * smooth;
    const taper = Math.min(1, Math.min(t, 1 - t) * 14 + 0.15);

    const rInner = baseRadius * rFactor - halfWidth * taper;
    const rOuter = baseRadius * rFactor + halfWidth * taper;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    pos.setXYZ(i * 2, cosA * rInner, sinA * rInner, 0);
    pos.setXYZ(i * 2 + 1, cosA * rOuter, sinA * rOuter, 0);
  }

  pos.needsUpdate = true;
}

/* -------------------------------------------------------------------------- */
/*  A24 Stop-Motion Scribble Rings Controller                                 */
/* -------------------------------------------------------------------------- */

export class ScribbleEffect {
  public group: THREE.Group;
  public material: THREE.MeshBasicMaterial;

  private geometries: THREE.BufferGeometry[] = [];
  private anim = { progress: 0 };
  private tween: gsap.core.Tween | null = null;
  private burstDelayCall: gsap.core.Tween | null = null;
  private targetIdx = -1;
  private isBursting = false;
  private isHiding = false;
  private burstTargetIdx = -1;
  private lastTime = 0;
  private noiseBuffer: Float32Array;
  private config: DiscEngineConfig;

  constructor(config: DiscEngineConfig) {
    this.config = config;
    this.noiseBuffer = new Float32Array(config.scribblePoints + 2);
    this.group = new THREE.Group();
    this.material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(config.scribbleColor),
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false
    });

    for (let i = 0; i < config.scribbleLoops; i += 1) {
      const geo = createScribbleGeometry(config);
      const mesh = new THREE.Mesh(geo, this.material);
      mesh.renderOrder = 900;
      this.geometries.push(geo);
      this.group.add(mesh);
    }

    this.group.visible = false;
  }

  /**
   * Triggers an immediate signature burst around a target disc (used in intro animation).
   */
  public triggerBurst(targetIdx: number, duration = 1.25): void {
    if (!this.config.scribbleEnabled) return;
    this.isBursting = true;
    this.burstTargetIdx = targetIdx;
    this.targetIdx = targetIdx;
    this.group.visible = true;
    this.tween?.kill();
    this.burstDelayCall?.kill();
    this.burstDelayCall = null;
    this.anim.progress = 0;

    // Fast drawing of scribble signature
    this.tween = gsap.to(this.anim, {
      progress: 1,
      duration: 0.28,
      ease: 'power2.out',
      overwrite: 'auto',
      onComplete: () => {
        this.burstDelayCall = gsap.delayedCall(duration, () => {
          this.isBursting = false;
          this.burstDelayCall = null;
        });
      }
    });
  }

  public step(
    now: number,
    dt: number,
    activeIdx: number,
    hoveredDiscIdx: number,
    isHeld: boolean,
    instances: DiscInstance[]
  ): void {
    const w = this.config;
    const isHovered = hoveredDiscIdx >= 0 && hoveredDiscIdx === activeIdx;
    const shouldShow =
      w.scribbleEnabled &&
      (isHeld ||
        (w.scribbleOnHover && isHovered) ||
        (this.isBursting && this.burstTargetIdx === activeIdx));
    const targetIdx = shouldShow ? activeIdx : -1;
    const interval = 1000 / w.scribbleFps;

    const syncTransform = (inst: DiscInstance, snap: boolean) => {
      const lagAlpha = snap ? 1 : 1 - Math.exp(-Math.max(0, w.scribbleLag) * dt);
      _targetQuat.copy(inst.group.quaternion).multiply(inst.spin.quaternion);
      if (snap) {
        this.group.position.copy(inst.group.position);
        this.group.quaternion.copy(_targetQuat);
        this.group.scale.copy(inst.group.scale);
      } else {
        this.group.position.lerp(inst.group.position, lagAlpha);
        this.group.quaternion.slerp(_targetQuat, lagAlpha);
        this.group.scale.lerp(inst.group.scale, lagAlpha);
      }
    };

    if (targetIdx < 0) {
      if (this.targetIdx >= 0 && this.anim.progress > 0) {
        if (!this.isHiding) {
          this.isHiding = true;
          this.tween?.kill();
          this.tween = gsap.to(this.anim, {
            progress: 0,
            duration: 0.22,
            ease: 'power2.in',
            overwrite: 'auto',
            onComplete: () => {
              this.targetIdx = -1;
              this.group.visible = false;
              this.isHiding = false;
            }
          });
        }
        const prevInst = instances[this.targetIdx];
        if (prevInst) syncTransform(prevInst, false);
      }

      if (this.anim.progress <= 0.01) {
        this.group.visible = false;
        this.isHiding = false;
        return;
      }
    } else {
      const inst = instances[targetIdx];
      if (!inst) return;

      if (this.targetIdx !== targetIdx || this.anim.progress <= 0.01 || this.isHiding) {
        this.targetIdx = targetIdx;
        this.isHiding = false;
        this.group.visible = true;
        syncTransform(inst, true);
        if (!this.isBursting) {
          this.tween?.kill();
          this.tween = gsap.to(this.anim, {
            progress: 1,
            duration: 0.35,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        }
      } else {
        syncTransform(inst, false);
      }
    }

    if (now - this.lastTime < interval) return;
    this.lastTime = now;

    for (let i = 0; i < w.scribbleLoops; i += 1) {
      const geo = this.geometries[i];
      if (geo) {
        updateScribbleLoop(geo, i, this.anim.progress, w, this.noiseBuffer);
      }
    }
  }

  public dispose(): void {
    this.isBursting = false;
    this.isHiding = false;
    this.burstDelayCall?.kill();
    this.burstDelayCall = null;
    this.tween?.kill();
    this.tween = null;
    this.group.removeFromParent();
    this.geometries.forEach((g) => g.dispose());
    this.geometries.length = 0;
    this.material.dispose();
  }
}
