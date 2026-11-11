import * as THREE from 'three';
import { DiscEngineConfig } from '../types';

export function projectUVs(geo: THREE.BufferGeometry, maxRadius = 1): void {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  if (!pos || !uv) return;

  const invRadius = 1 / maxRadius;
  for (let i = 0; i < pos.count; i += 1) {
    uv.setXY(i, (pos.getX(i) * invRadius) * 0.5 + 0.5, (pos.getY(i) * invRadius) * 0.5 + 0.5);
  }
  uv.needsUpdate = true;
}

export function buildEdgeGeometry(config: Pick<DiscEngineConfig, 'discThickness' | 'edgeBevel' | 'edgeBleed'>): THREE.LatheGeometry {
  const halfThick = config.discThickness / 2;
  const bevel = 0.0015 + config.edgeBevel * Math.min(config.discThickness * 0.55, 0.018);
  const innerEdge = 1 - config.edgeBleed;

  const points = [
    new THREE.Vector2(innerEdge, halfThick),
    new THREE.Vector2(1 - bevel, halfThick),
    new THREE.Vector2(1, halfThick - bevel),
    new THREE.Vector2(1, -halfThick + bevel),
    new THREE.Vector2(1 - bevel, -halfThick),
    new THREE.Vector2(innerEdge, -halfThick)
  ];

  const geometry = new THREE.LatheGeometry(points, 256);
  geometry.computeVertexNormals();
  return geometry;
}

export function buildHubRingGeometry(
  innerRadius: number,
  outerRadius: number,
  thickness: number,
  waveAmplitude: number,
  segments = 160
): THREE.LatheGeometry {
  const halfThick = thickness / 2;
  const startR = Math.max(0.002, innerRadius);
  const spanR = Math.max(1e-4, outerRadius - startR);
  const points = [new THREE.Vector2(startR, -halfThick), new THREE.Vector2(startR, halfThick)];

  for (let i = 0; i <= 5; i += 1) {
    const t = i / 5;
    const r = startR + spanR * t;
    const y = halfThick * (1 - waveAmplitude) + halfThick * waveAmplitude * (0.6 + 0.4 * Math.cos(t * Math.PI * 3));
    points.push(new THREE.Vector2(r, y));
  }

  points.push(new THREE.Vector2(outerRadius, halfThick * 0.92));
  points.push(new THREE.Vector2(outerRadius, -halfThick * 0.92));

  for (let i = 5; i >= 0; --i) {
    const t = i / 5;
    const r = startR + spanR * t;
    const y = -(halfThick * (1 - waveAmplitude) + halfThick * waveAmplitude * (0.6 + 0.4 * Math.cos(t * Math.PI * 3)));
    points.push(new THREE.Vector2(r, y));
  }

  const geometry = new THREE.LatheGeometry(points, segments);
  geometry.computeVertexNormals();
  return geometry;
}

export interface DiscGeometrySet {
  frontGeometry: THREE.RingGeometry;
  backGeometry: THREE.RingGeometry;
  edgeGeometry: THREE.LatheGeometry;
  hubGeometry: THREE.LatheGeometry;
  matrixGeometry: THREE.LatheGeometry;
  frostGeometry: THREE.LatheGeometry;
  pickGeometry: THREE.CircleGeometry;
}

export function createDiscGeometries(config: DiscEngineConfig): DiscGeometrySet {
  const holeDiameter = 2 * config.holeSize;
  const hubRadius = 1 * config.hubSize;
  const discThickness = config.discThickness;
  const outerArtworkRadius = 1 - config.edgeBleed;

  const frontGeometry = new THREE.RingGeometry(hubRadius, outerArtworkRadius, 220, 1);
  const backGeometry = new THREE.RingGeometry(hubRadius, outerArtworkRadius, 220, 1);
  projectUVs(frontGeometry, outerArtworkRadius);
  projectUVs(backGeometry, outerArtworkRadius);

  const holeRadius = holeDiameter / 2;
  const hubSpan = hubRadius - holeRadius;
  const frostOuterRadius = holeRadius + hubSpan * 0.34;
  const matrixOuterRadius = frostOuterRadius + hubSpan * config.hubMatrixWidth;
  const hubHeight = discThickness * 1.02;

  const edgeGeometry = buildEdgeGeometry(config);
  const hubGeometry = buildHubRingGeometry(matrixOuterRadius, hubRadius, hubHeight, 0.22, 160);
  const matrixGeometry = buildHubRingGeometry(frostOuterRadius, matrixOuterRadius, hubHeight * 0.88, 0.12, 128);
  const frostGeometry = buildHubRingGeometry(holeRadius, frostOuterRadius, hubHeight * 0.96, 0.4, 128);
  const pickGeometry = new THREE.CircleGeometry(1, 24);

  return {
    frontGeometry,
    backGeometry,
    edgeGeometry,
    hubGeometry,
    matrixGeometry,
    frostGeometry,
    pickGeometry
  };
}
