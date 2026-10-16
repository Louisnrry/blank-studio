# Depth-map — guide d'intégration (non implémenté)

> Statut : **préparé, pas encore en place** (choix volontaire).
> Ce document décrit comment ajouter un effet 3D type depth-map sur les visuels
> de la section `#projets` quand tu auras décidé de l'emplacement.

## 1. Principe

Un effet depth-map donne une **parallaxe 3D au survol** à partir de 2 images :
- `couleur.jpg` — le visuel normal ;
- `depth.png` — sa **carte de profondeur** (grayscale : blanc = proche, noir = loin).

Un shader déplace chaque pixel de l'image couleur proportionnellement à la
valeur lue dans la depth-map + la position de la souris. Résultat : l'image
semble avoir du relief (effet "2.5D", très Awwwards).

## 2. Emplacement recommandé

Section `#projets`, sur `.work-visual` (ratio 4/3). Prévoir :
- un `<canvas>` par carte (4 cartes = 4 contextes WebGL, OK sur desktop) ;
- ou **un seul renderer partagé** si la page grossit (recommandé au-delà de 6 canvas).

Alternative : l'utiliser sur **une seule image hero secondaire** (portrait du
studio dans `#manifesto`) pour un effet plus subtil.

## 3. Ressources nécessaires

| Asset | Contraintes |
|---|---|
| Image couleur | JPG/WebP, ~1200 px de large, mêmes dimensions que la depth |
| Depth map | PNG grayscale, **exactement les mêmes dimensions**, bords adoucis (pas de noir/blanc pur franc sauf fond) |

### Comment générer une depth map
1. **MiDaS / Depth Anything** (gratuit, local ou démos Hugging Face) : depth automatique depuis une photo.
2. **Photoshop** : calques en niveaux de gris peints à la main (contrôle total, idéal pour du graphisme).
3. **LeiaPix Converter** (en ligne) : rapide pour tester un rendu.
4. Règle d'or : flouter légèrement la depth (1–2 px) pour éviter les contours qui "craquellent".

## 4. Implémentation type (Three.js, cohérent avec `hero-shader.js`)

Nouveau module `src/js/depth-card.js`, un quad par carte :

```js
import * as THREE from 'three';

const vert = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;

const frag = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uImage;
  uniform sampler2D uDepth;
  uniform vec2 uMouse;    // -0.5 .. 0.5, lerpé
  uniform float uStrength; // ~0.06

  void main() {
    float d = texture2D(uDepth, vUv).r;
    vec2 offset = uMouse * (d - 0.5) * uStrength;
    vec3 col = texture2D(uImage, vUv + offset).rgb;
    gl_FragColor = vec4(col, 1.0);
  }
`;
```

Points d'attention :
- `texture.colorSpace = THREE.SRGBColorSpace` sur l'image couleur (pas sur la depth).
- Lerper `uMouse` vers la cible souris (comme dans `hero-shader.js`, facteur `0.06`).
- `uStrength` ~ `0.04 – 0.08` : au-delà, l'effet fait "loupe" et casse le premium.
- Pause du render hors écran via `IntersectionObserver` (même pattern que le hero).
- `prefers-reduced-motion` : afficher l'image fixe (`<img>` de fallback), ne pas monter le shader.
- Accessibilité : garder un `<img>` réel dans le DOM (SEO/alt) et monter le canvas par-dessus.

## 5. Librairies alternatives (si tu ne veux pas coder le shader)

- **curtain.js** — faite pour ça (planes + depth), simple à intégrer.
- **pixi.js + DisplacementFilter** — plus simple mais moins "vrai 3D" (déformation globale, pas par pixel de profondeur).

Recommandation : rester sur le shader custom §4 — zéro dépendance en plus,
cohérent avec la stack (Three.js déjà installé).

## 6. Checklist avant mise en place

- [ ] Choisir l'emplacement final (cartes projets vs image studio)
- [ ] Produire 1 couple image/depth de test (mêmes dimensions)
- [ ] Créer `src/js/depth-card.js` + câbler dans `src/main.js`
- [ ] Tester perf mobile (désactiver sous 768 px si besoin : media query + `matchMedia`)
- [ ] Vérifier le fallback `<img>` sans WebGL

## 7. Références

- Depth Anything — estimation de profondeur (open source)
- MiDaS (Intel ISL) — modèle de depth estimation
- curtain.js — librairie de planes WebGL
- Exemples Awwwards : hover 3D sur listes de projets (notamment studios créatifs 2023–2025)
