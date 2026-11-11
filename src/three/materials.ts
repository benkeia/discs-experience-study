import * as THREE from 'three';
import { DiscEngineConfig, HolographicUniforms } from '../types';

/* -------------------------------------------------------------------------- */
/*  CD/DVD Optical Diffraction Shaders (GLSL)                                 */
/* -------------------------------------------------------------------------- */

const cdVertexPreamble = /* glsl */ `
#include <common>
varying vec2 vDiscPos;
varying vec3 vBasisX;
varying vec3 vBasisY;
`;

const cdVertexBegin = /* glsl */ `
#include <begin_vertex>
vDiscPos = position.xy;
vBasisX = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));
vBasisY = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
`;

const cdFragmentPreamble = /* glsl */ `
#include <common>
varying vec2 vDiscPos;
varying vec3 vBasisX;
varying vec3 vBasisY;

uniform float uTrackPitch;
uniform float uRainbowIntensity;
uniform float uRainbowSaturation;
uniform float uAnisoSpread;
uniform float uOrder2Intensity;
uniform float uSpecularCore;
uniform float uRadialRings;
uniform float uBackScratches;
uniform sampler2D uScratchMap;

// Convert optical wavelength in nm (380 - 720 nm) to rich physical RGB
vec3 wavelengthToRGB(float lambda, float sat) {
  float l = clamp(lambda, 380.0, 720.0);
  
  // Highly saturated multi-peak spectral response replicating human trichromatic vision & film
  float r = 1.15 * exp(-pow((l - 620.0) / 46.0, 2.0)) + 0.35 * exp(-pow((l - 425.0) / 20.0, 2.0));
  float g = 1.08 * exp(-pow((l - 535.0) / 44.0, 2.0));
  float b = 1.25 * exp(-pow((l - 460.0) / 36.0, 2.0));
  
  vec3 col = clamp(vec3(r, g, b), 0.0, 1.0);
  
  // Saturation adjustment
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  return mix(vec3(lum), col, sat);
}

// Compute optical diffraction lobe for a light vector L
vec3 calcDiffraction(vec3 L, vec3 V, vec3 T, vec3 B, float trackPitch, float spread, float sat, float order2) {
  vec3 H = normalize(V + L);
  float hT = dot(H, T);
  float hB = dot(H, B);
  
  // Perpendicular constraint: light diffracts along the groove cross-section
  float streak = exp(-pow(hT / spread, 2.0));
  if (streak < 0.001) return vec3(0.0);
  
  // Grating optical path difference
  float opd = abs(hB) * trackPitch;
  
  // Order 1 (m = 1)
  float l1 = opd;
  vec3 c1 = vec3(0.0);
  if (l1 >= 380.0 && l1 <= 720.0) {
    c1 = wavelengthToRGB(l1, sat);
  }
  
  // Order 2 (m = 2)
  float l2 = opd * 0.5;
  vec3 c2 = vec3(0.0);
  if (l2 >= 380.0 && l2 <= 720.0) {
    c2 = wavelengthToRGB(l2, sat) * order2;
  }

  // Order 3 (m = 3)
  float l3 = opd * 0.3333;
  vec3 c3 = vec3(0.0);
  if (l3 >= 380.0 && l3 <= 720.0) {
    c3 = wavelengthToRGB(l3, sat) * (order2 * 0.4);
  }
  
  return streak * (c1 + c2 + c3);
}
`;

const cdFragmentShading = /* glsl */ `
// Analytical Per-Pixel CD/DVD Radial Optical Grating
float r = length(vDiscPos);
vec2 radial2D = vDiscPos / max(r, 1e-5);
vec2 tangent2D = vec2(-radial2D.y, radial2D.x);

vec3 T = normalize(vBasisX * tangent2D.x + vBasisY * tangent2D.y);
vec3 B = normalize(vBasisX * radial2D.x + vBasisY * radial2D.y);
vec3 V = normalize(vViewPosition);
vec3 N = normalize(normal);

// Studio Lights & Reflections in View Space
vec3 L1 = normalize(vec3(0.35, 0.75, 0.55));
vec3 L2 = normalize(vec3(-0.6, -0.3, 0.75));
vec3 L3 = normalize(vec3(0.0, 0.95, 0.3));
vec3 L4 = reflect(-V, N);

vec3 d1 = calcDiffraction(L1, V, T, B, uTrackPitch, uAnisoSpread, uRainbowSaturation, uOrder2Intensity);
vec3 d2 = calcDiffraction(L2, V, T, B, uTrackPitch, uAnisoSpread * 1.2, uRainbowSaturation, uOrder2Intensity) * 0.85;
vec3 d3 = calcDiffraction(L3, V, T, B, uTrackPitch, uAnisoSpread * 0.9, uRainbowSaturation, uOrder2Intensity) * 0.7;
vec3 d4 = calcDiffraction(L4, V, T, B, uTrackPitch, uAnisoSpread * 1.7, uRainbowSaturation, uOrder2Intensity) * 0.65;

// Microscopic track groove optical density ripple across radius
float grooveTrack = 1.0 - 0.12 * uRadialRings * (0.5 + 0.5 * sin(r * 450.0));

vec3 totalRainbow = (d1 + d2 + d3 + d4) * uRainbowIntensity * grooveTrack;

// Mirror Silver specular streak (metallic brushed reflection core)
float silverLobe = exp(-pow(dot(normalize(V + L1), T) / (uAnisoSpread * 0.75), 2.0)) * 0.65
                 + exp(-pow(dot(normalize(V + L4), T) / (uAnisoSpread * 0.95), 2.0)) * 0.45;
vec3 silverCore = vec3(silverLobe * uSpecularCore);

// Microscopic physical hairline scratches (polycarbonate wear catching specular light)
vec3 scratchGlint = vec3(0.0);
if (uBackScratches > 0.001) {
  vec2 sUV = vDiscPos * 0.5 + 0.5;
  float sMask = texture2D(uScratchMap, sUV).r;
  if (sMask > 0.005) {
    float glint = pow(max(0.0, dot(normalize(V + L1), N)), 16.0) * 0.8
                + pow(max(0.0, dot(normalize(V + L4), N)), 12.0) * 0.6;
    scratchGlint = vec3(0.85, 0.88, 0.92) * sMask * uBackScratches * (0.35 + 0.65 * glint);
  }
}

outgoingLight += totalRainbow + silverCore + scratchGlint;

#include <opaque_fragment>
`;

/* -------------------------------------------------------------------------- */
/*  Material Factories                                                        */
/* -------------------------------------------------------------------------- */

export function createCDBackMaterial(
  config: DiscEngineConfig,
  uniforms: HolographicUniforms
): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(config.backBaseColor),
    roughness: config.backRough,
    metalness: config.backMetal,
    clearcoat: config.backClearcoat,
    clearcoatRoughness: 0.02,
    envMapIntensity: 2.0
  });

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', cdVertexPreamble)
      .replace('#include <begin_vertex>', cdVertexBegin);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', cdFragmentPreamble)
      .replace('#include <opaque_fragment>', cdFragmentShading);
  };

  return mat;
}

export interface FrontMaps {
  placeholderTexture: THREE.CanvasTexture;
  frontRoughnessMap: THREE.CanvasTexture;
  frontNormalMap: THREE.CanvasTexture;
}

export function createFrontMaterial(
  config: DiscEngineConfig,
  maps: FrontMaps
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    map: maps.placeholderTexture,
    roughness: config.frontRough,
    metalness: config.frontMetal,
    roughnessMap: maps.frontRoughnessMap,
    clearcoat: config.frontClearcoat,
    clearcoatRoughness: 0.18 * (1 - config.texGloss),
    normalMap: maps.frontNormalMap,
    normalScale: new THREE.Vector2(0.3, 0.3),
    envMapIntensity: 0.85
  });
}

export interface SharedHubMaterials {
  edgeMaterial: THREE.MeshPhysicalMaterial;
  hubMaterial: THREE.MeshPhysicalMaterial;
  matrixMaterial: THREE.MeshPhysicalMaterial;
  frostMaterial: THREE.MeshPhysicalMaterial;
  pickMaterial: THREE.MeshBasicMaterial;
}

export function createSharedHubMaterials(
  config: DiscEngineConfig,
  matrixTexture: THREE.CanvasTexture
): SharedHubMaterials {
  return {
    edgeMaterial: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(config.edgeColor),
      roughness: config.edgeRoughness,
      metalness: config.edgeMetalness,
      clearcoat: 0.7,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.8,
      side: THREE.DoubleSide
    }),
    hubMaterial: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(config.hubColor),
      roughness: config.hubRoughness,
      metalness: 0,
      transmission: config.hubTransmission,
      thickness: 0.6,
      ior: config.hubIOR,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.3,
      transparent: true,
      side: THREE.DoubleSide
    }),
    matrixMaterial: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xdfe3e9),
      map: matrixTexture,
      roughness: 0.28,
      metalness: 0.82,
      clearcoat: 0.7,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.45,
      side: THREE.DoubleSide
    }),
    frostMaterial: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xeef1f5),
      roughness: 0.25 + config.hubFrostedEdge * 0.55,
      metalness: 0,
      transmission: (1 - config.hubFrostedEdge) * 0.5,
      thickness: 0.3,
      ior: 1.5,
      clearcoat: 0.4,
      clearcoatRoughness: 0.3,
      envMapIntensity: 0.9,
      transparent: true,
      side: THREE.DoubleSide
    }),
    pickMaterial: new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  };
}
