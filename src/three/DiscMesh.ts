import * as THREE from 'three';
import { DiscEngineConfig, DiscInstance, DiscItem } from '../types';
import { DiscGeometrySet } from './geometries';
import { SharedHubMaterials, createFrontMaterial, FrontMaps } from './materials';
import { processArtworkToCanvas, toCanvasTexture, extractDominantColor } from './textures';

export interface CreateDiscInstanceParams {
  discItem: DiscItem;
  index: number;
  config: DiscEngineConfig;
  geometries: DiscGeometrySet;
  hubMaterials: SharedHubMaterials;
  backMaterial: THREE.MeshPhysicalMaterial;
  maps: FrontMaps;
  renderer: THREE.WebGLRenderer;
  isDestroyed: () => boolean;
  onLoaded?: () => void;
}

export function createDiscInstance(params: CreateDiscInstanceParams): DiscInstance {
  const {
    discItem,
    index,
    config,
    geometries,
    hubMaterials,
    backMaterial,
    maps,
    renderer,
    isDestroyed
  } = params;

  const group = new THREE.Group();
  const spin = new THREE.Group();
  group.add(spin);

  const frontMaterial = createFrontMaterial(config, maps);

  const frontMesh = new THREE.Mesh(geometries.frontGeometry, frontMaterial);
  const backMesh = new THREE.Mesh(geometries.backGeometry, backMaterial);
  const edgeMesh = new THREE.Mesh(geometries.edgeGeometry, hubMaterials.edgeMaterial);
  const hubMesh = new THREE.Mesh(geometries.hubGeometry, hubMaterials.hubMaterial);
  const matrixMesh = new THREE.Mesh(geometries.matrixGeometry, hubMaterials.matrixMaterial);
  const frostMesh = new THREE.Mesh(geometries.frostGeometry, hubMaterials.frostMaterial);

  const halfThickness = config.discThickness / 2;
  frontMesh.position.z = halfThickness + 6e-4;
  backMesh.position.z = -halfThickness - 6e-4;
  backMesh.rotation.y = Math.PI;
  edgeMesh.rotation.x = Math.PI / 2;
  hubMesh.rotation.x = Math.PI / 2;
  matrixMesh.rotation.x = Math.PI / 2;
  frostMesh.rotation.x = Math.PI / 2;

  spin.add(frontMesh, backMesh, edgeMesh, hubMesh, matrixMesh, frostMesh);

  const pick = new THREE.Mesh(geometries.pickGeometry, hubMaterials.pickMaterial);
  pick.renderOrder = -1;
  pick.userData.index = index;
  group.add(pick);

  const instance: DiscInstance = {
    index,
    group,
    spin,
    pick,
    frontMaterial,
    dominantColor: new THREE.Color(0xffffff),
    hover: 0,
    hoverUVX: 0,
    hoverUVY: 0,
    spinX: 0,
    spinY: 0,
    baseFlipY: 0,
    introProgress: 0,
    resetTween: null,
    hoverTween: null,
    hoverUVTween: null,
    pushTween: null,
    pushX: 0,
    pushY: 0,
    pushZ: 0,
    pushRotX: 0,
    pushRotY: 0
  };

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.onload = () => {
    img.onload = null;
    img.onerror = null;
    if (isDestroyed()) return;
    instance.dominantColor = discItem.signatureColor
      ? new THREE.Color(discItem.signatureColor)
      : extractDominantColor(img);
    const processedCanvas = processArtworkToCanvas(img, config);
    const texture = toCanvasTexture(processedCanvas, renderer, THREE.SRGBColorSpace);
    frontMaterial.map = texture;
    frontMaterial.needsUpdate = true;
    params.onLoaded?.();
  };
  img.onerror = () => {
    img.onload = null;
    img.onerror = null;
    if (isDestroyed()) return;
    params.onLoaded?.();
  };
  img.src = discItem.artwork;

  return instance;
}
