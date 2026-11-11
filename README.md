# 3D Disc Gallery & Optical CD Diffraction Shader

> Étude technique et ré-implémentation inspirée du site [a24.raviklaassens.com](https://a24.raviklaassens.com/) de Ravi Klaassens.

Une expérience interactive 3D modélisant une collection de disques Blu-ray / DVD avec un rendu photoréaliste de diffraction optique (effets holographiques de réseau de Bragg), une physique inertielle fluide et une esthétique inspirée du style A24.

---

## 1. Présentation du projet

Cette application web interactive présente une galerie circulaire et infinie de disques physiques 3D. L'utilisateur peut parcourir la collection à la souris, au pavé tactile, à la molette ou au clavier, inspecter un disque, le faire tourner en 3D sous tous les angles, ou le retourner pour observer le shader de diffraction holographique reproduisant fidèlement les sillons microscopiques d'un DVD/CD optique.

---

## 2. Technologies utilisées

- **React 18.3** : Couche d'accroche UI et montage dans le DOM.
- **Three.js 0.174** : Moteur 3D WebGL (scène, caméras, maillages, matériaux PBR `MeshPhysicalMaterial`).
- **GSAP 3.15** : Moteur d'interpolation physique et d'animations (ticker haute précision, tweens avec courbes d'inertie élastiques et cubiques).
- **GLSL personnalisé** : Shaders de diffraction optique injectés via `onBeforeCompile` simulant la réponse spectrale humaine (RGB trichromatique) et les ordres d'interférence optique 1, 2 et 3.
- **lil-gui 0.21** : Panneau de contrôle et débogage en direct des shaders et paramètres de la scène.
- **TypeScript 5.7 (Mode strict)** : Typage complet de l'ensemble de l'architecture.
- **Vite 6.2** : Bundler et serveur de développement ultra-rapide.
- **Tailwind CSS 3.4** : Gestion du layout plein écran.

---

## 3. Prérequis

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 (ou pnpm / yarn)
- Navigateur moderne supportant **WebGL 2.0** et les **Web Workers**.

---

## 4. Installation

```bash
# Cloner le dépôt ou se placer dans le répertoire
cd cd-shader

# Installer les dépendances
npm install
```

---

## 5. Commandes de développement

```bash
# Démarrer le serveur de développement local avec rechargement à chaud (HMR)
npm run dev

# Exécuter la vérification stricte des types TypeScript
npm run typecheck
```

Le serveur sera accessible par défaut sur `http://localhost:3000`.

---

## 6. Commandes de build

```bash
# Compiler le projet pour la production (TypeScript + Vite)
npm run build

# Prévisualiser la version de production localement
npm run preview
```

Les fichiers générés sont placés dans le dossier `dist/`.

---

## 7. Structure du projet

```text
cd-shader/
├── public/
│   └── assets/
│       └── labels/              # Textures et jaquettes haute résolution
│           ├── avatar/          # Collection des disques Avatar
│           └── classics/        # Autres éditions
│
├── src/
│   ├── App.tsx                  # Composant racine React
│   ├── main.tsx                 # Point d'entrée de l'application
│   ├── index.css                # Styles globaux & Tailwind
│   │
│   ├── types/
│   │   └── index.ts             # Définitions TypeScript (DiscItem, Config, State)
│   │
│   ├── data/
│   │   └── movies.ts            # Données des disques Avatar (titre, jaquette)
│   │
│   └── three/                   # Moteur 3D Three.js modulaire à plat (sans sous-dossiers artificiels)
│       ├── index.ts             # Point d'export unifié
│       ├── DiscEngine.ts        # Orchestrateur central (Scène, Cycle de vie, Events)
│       ├── config.ts            # Paramètres centralisés (caméra, shader, physique)
│       ├── materials.ts         # Matériaux Three.js & Shader GLSL de diffraction CD
│       ├── geometries.ts        # Géométries procédurales (tranche biseautée, bagues concentriques)
│       ├── textures.ts          # Génération procédurale (Web Worker, studio PMREM, matrix, jaquette)
│       ├── interaction.ts       # Contrôles (Raycasting UV, Drag, Spin et Molette filtrée)
│       ├── ScribbleEffect.ts    # Effet complet de crayonnage A24 (géométrie, matériau, GSAP)
│       ├── Lighting.ts          # Éclairage de studio calibré (Key, Fill, Rim, Néon)
│       ├── DiscMesh.ts          # Assemblage des 6 couches d'un disque 3D
│       └── DebugGUI.ts          # Panneau de contrôle interactif lil-gui
```

---

## 8. Explication de l'architecture

Le projet repose sur une séparation rigoureuse des responsabilités :

1. **Orchestrateur (`DiscEngine`)** : Gère la boucle de rendu `tick`, l'initialisation du renderer WebGL et la synchronisation spatiale des disques. Il délègue l'interaction, la géométrie, les matériaux et l'éclairage à des sous-modules spécialisés.
2. **Gestionnaire d'événements & Contrôleurs d'interaction** :
   - `DragController` : Calcule le déplacement relatif, applique une résistance quadratique si le disque est tourné au-delà de sa limite angulaire, et propulse l'inertie (`flick`) au relâchement.
   - `WheelController` : Implémente un filtre à décroissance exponentielle d'enveloppe (`decay = exp(-gap / 550)`), permettant d'éviter les à-coups des pavés tactiles haute fréquence (MacBook trackpads) tout en conservant une réactivité instantanée sur molette crantée.
   - `RaycastManager` : Projette les coordonnées d'écran vers le repère normalisé NDC et extrait les coordonnées UV d'intersection pour orienter l'inclinaison dynamique du disque sous le curseur.
3. **Pipeline de rendu procédural** :
   - Un **Web Worker** dédié génère en tâche de fond les cartes de micro-rayures (`frontNormal`) et de rugosité (`frontRough`) sans bloquer le thread principal.
   - Un repli synchrone automatique (`fallback`) garantit le fonctionnement si l'environnement bloque les Workers locaux (CSP, sandboxing).

---

## 9. Fonctionnement de la scène Three.js

- **Caméra** : PerspectiveCamera positionnée à distance `cameraDistance = 4.4` avec un champ de vision de `cameraFOV = 40°`.
- **Galerie en carrousel infini** :
  - Les disques sont agencés sur un arc de cercle via la formule `wrapDiff(p, scrollPos)`.
  - Seuls les disques situés dans le champ visible avant ($|h| \le 3.2$) sont affichés ; les disques arrière sont masqués et téléportés instantanément pour éviter toute traversée de scène non désirée.
  - Une atténuation d'échelle progressive (`wrapFade`) garantit des apparitions/disparitions imperceptibles sur les bords de l'écran.
- **Anatomie d'un disque 3D** (6 couches maillées superposées) :
  1. `frontMesh` : Surface avant imprimée avec vernis et carte de normales.
  2. `backMesh` : Miroir arrière avec shader physique de diffraction spectrale.
  3. `edgeMesh` : Tranche circulaire en polycarbonate biseautée via `LatheGeometry`.
  4. `hubMesh` : Bague centrale transparente en polycarbonate avec réfraction (transmission).
  5. `matrixMesh` : Zone métallique portant les anneaux de code-barres et gravures laser.
  6. `frostMesh` : Anneau dépoli entourant le trou central.
  7. `pickMesh` : Plan invisible optimisé pour le raycasting de clic et de survol.

---

## 10. Emplacement des principaux paramètres

Tous les paramètres configurables sont centralisés dans `src/three/config.ts` :

| Catégorie | Paramètre clé | Description |
|---|---|---|
| **Shader CD** | `trackPitch` | Pas des sillons du disque en nanomètres (DVD standard : ~740nm, CD : ~1600nm). |
| **Shader CD** | `rainbowIntensity` | Intensité de l'éclat arc-en-ciel de diffraction. |
| **Shader CD** | `anisoSpread` | Finesse angulaire du faisceau spectral anisotrope. |
| **Shader CD** | `order2Intensity` | Présence du deuxième ordre de réfraction spectrale. |
| **Galerie** | `loopInfini` | Active/désactive la boucle infinie circulaire du carrousel. |
| **Galerie** | `hGap`, `depthGap` | Espacement horizontal et profondeur 3D entre les disques. |
| **Animation A24**| `scribbleEnabled` | Active les anneaux de crayonnage au survol. |
| **Animation A24**| `scribbleFps` | Fréquence d'actualisation de la déformation stop-motion (défaut : 10 FPS). |
| **Physique** | `dragSensitivity` | Sensibilité du glissement à la souris / au toucher. |
| **Physique** | `snapDuration` | Durée de recentrage automatique sur le disque cible. |

---

## 11. Procédure pour ajouter un disque 3D

1. Placer l'image de la jaquette (carrée, idéalement 700x700px ou 1000x1000px) dans le dossier `public/assets/labels/avatar/` (ou un sous-dossier approprié).
2. Ouvrir `src/data/movies.ts`.
3. Ajouter un nouvel objet à la constante `AVATAR_DISCS` :
```typescript
{
  id: 'avatar-11',
  title: 'Avatar — Nouvelle Édition',
  artwork: '/assets/labels/avatar/mon-image.jpg'
}
```
Le moteur calcule automatiquement le dimensionnement, le découpage du trou central et l'intégration dans la boucle infinie.

---

## 12. Procédure pour ajouter une animation

Pour ajouter un nouveau comportement d'animation dans la scène :

1. Définir les paramètres d'animation dans `src/three/config.ts`.
2. Si l'animation concerne le mouvement du carrousel ou le disque actif, isoler la fonction dans `src/three/interaction.ts` ou dans un composant dédié.
3. Utiliser **GSAP** pour animer les valeurs numériques via des références ou des propriétés directes :
```typescript
gsap.to(instance, {
  pushZ: -0.5,
  duration: 0.6,
  ease: 'back.out(2)',
  overwrite: 'auto'
});
```
4. Mettre à jour les transformations 3D dans `stepLayout` ou dans la méthode `step` du composant pour appliquer les valeurs interpolées au maillage.

---

## 13. Gestion des assets

- **Images et textures** : Situées dans le dossier standard `public/assets/labels/`. Vite les sert directement à la racine sous le chemin `/assets/labels/...`.
- **Mémoire GPU & Nettoyage** : La méthode `DiscEngine.destroy()` se charge de désallouer systématiquement les textures Canvas (`CanvasTexture.dispose()`), les cibles de rendu d'environnement (`pmremTarget.dispose()`), les géométries Three.js (`LatheGeometry`, `RingGeometry`, `BufferGeometry`) et de résilier les écouteurs d'événements du DOM et du ticker GSAP.
