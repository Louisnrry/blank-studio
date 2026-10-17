import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import layerVert from '../shaders/ink-layer.vert?raw';
import layerFrag from '../shaders/ink-layer.frag?raw';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------
   Traversée d'encre — HYBRIDE.

   La MATIÈRE vient des textures d'encre (filets + nuage) ; le MOUVEMENT
   vient d'un champ de vitesse procédural calculé dans le shader. Les
   textures sont advectées dans des tourbillons → « encre dans l'eau ».

   Chaque calque est un plan 3D à une profondeur différente : la caméra
   oscille lentement, donc la parallaxe entre les plans est réelle.

   - FILETS  : entrent par le haut (front descendant érodé par le bruit).
   - NUAGES  : poussent depuis cette poussée (croissance radiale).
   - NAPPE   : calque 100 % procédural (uPure = 1) qui nappe de l'encre
               diluée et remplit les blancs.

   Le tout est scrubbé par le scroll, donc réversible.
------------------------------------------------------------------- */

const FOV = 45;
const CAM_Z = 1;
const TAN_HALF = Math.tan((FOV * Math.PI) / 360);

// Dimensions réelles des PNG (après recadrage), largeur / hauteur.
const TEX = {
  filets: { url: '/assets/filets.png', aspect: 1421 / 1717 },
  nuage: { url: '/assets/nuage.png', aspect: 981 / 680 },
};

const sstep = (a, b, t) => {
  const x = Math.min(Math.max((t - a) / (b - a), 0), 1);
  return x * x * (3 - 2 * x);
};

/* --- Calques -------------------------------------------------------
   hFactor    : hauteur du plan, en hauteurs d'écran
   cx, cy     : centre du plan, en hauteurs d'écran (0 = centre de l'écran)
   depth      : distance derrière la caméra (parallaxe)
   grow       : [début, fin] de la poussée, en progression de scroll 0→1
   fadeOut    : [début, fin] du fondu, fadeKeep = part conservée
   drift      : dérive du plan sur toute la traversée, en hauteurs d'écran
   flow*      : champ de vitesse (advection) — le cœur de l'effet « eau »
   haze*      : voile d'encre diluée (remplit les blancs)
   vein       : modulation d'alpha (casse les aplats du PNG)
   sway       : courant — oscillation lente et ample du calque entier
   pure       : 1 = aucune texture, uniquement le voile procédural
------------------------------------------------------------------- */
const LAYERS = [
  /* ---- FILETS : descendent depuis le haut de l'écran ---- */
  {
    src: 'filets', mode: 'front', order: 30,
    hFactor: 1.8, cx: 0.05, cy: 0.05, rot: 0, mirror: false, depth: 0.1,
    seed: 1.0, grow: [0.0, 0.38], opacity: 1.0,
    fadeOut: [0.54, 0.88], fadeKeep: 0.22,
    tint: 0.035, gain: 1.55, gamma: 0.78,
    wobble: 0.24, soft: 0.1, disp: 0.05,
    flow: 0.052, flowScale: 2.1, flowSpeed: 1.15, haze: 0.0, vein: 0.55, sway: 0.022,
    drift: [0.0, -0.05],
  },
  {
    src: 'filets', mode: 'front', order: 31,
    hFactor: 1.55, cx: -0.55, cy: -0.04, rot: 9, mirror: true, depth: 0.24,
    seed: 2.3, grow: [0.04, 0.44], opacity: 0.92,
    fadeOut: [0.56, 0.9], fadeKeep: 0.2,
    tint: 0.05, gain: 1.5, gamma: 0.8,
    wobble: 0.26, soft: 0.11, disp: 0.06,
    flow: 0.058, flowScale: 1.8, flowSpeed: 1.0, haze: 0.1, hazeThresh: 0.52, vein: 0.6, sway: 0.026,
    drift: [0.02, -0.07],
  },
  {
    src: 'filets', mode: 'front', order: 32,
    hFactor: 1.5, cx: 0.58, cy: -0.1, rot: -8, mirror: false, depth: 0.32,
    seed: 3.7, grow: [0.07, 0.48], opacity: 0.9,
    fadeOut: [0.58, 0.92], fadeKeep: 0.18,
    tint: 0.06, gain: 1.5, gamma: 0.8,
    wobble: 0.26, soft: 0.11, disp: 0.06,
    flow: 0.058, flowScale: 1.9, flowSpeed: 1.05, haze: 0.1, hazeThresh: 0.52, vein: 0.6, sway: 0.024,
    drift: [-0.02, -0.06],
  },
  {
    src: 'filets', mode: 'front', order: 33,
    hFactor: 1.25, cx: -0.24, cy: -0.26, rot: 15, mirror: true, depth: 0.44,
    seed: 5.1, grow: [0.12, 0.56], opacity: 0.85,
    fadeOut: [0.6, 0.95], fadeKeep: 0.15,
    tint: 0.08, gain: 1.45, gamma: 0.82,
    wobble: 0.28, soft: 0.12, disp: 0.07,
    flow: 0.062, flowScale: 1.6, flowSpeed: 0.95, haze: 0.12, hazeThresh: 0.5, vein: 0.6, sway: 0.028,
    drift: [0.03, -0.04],
  },
  {
    src: 'filets', mode: 'front', order: 34, desktopOnly: true,
    hFactor: 1.15, cx: 0.38, cy: 0.28, rot: -13, mirror: true, depth: 0.06,
    seed: 6.9, grow: [0.05, 0.44], opacity: 0.8,
    fadeOut: [0.52, 0.88], fadeKeep: 0.2,
    tint: 0.07, gain: 1.5, gamma: 0.8,
    wobble: 0.24, soft: 0.12, disp: 0.05,
    flow: 0.05, flowScale: 2.0, flowSpeed: 1.2, haze: 0.0, vein: 0.55, sway: 0.022,
    drift: [-0.02, -0.05],
  },

  /* ---- NUAGES : poussent depuis les filets et envahissent l'écran ---- */
  {
    src: 'nuage', mode: 'radial', order: 10,
    hFactor: 1.7, cx: 0.0, cy: -0.34, rot: 0, mirror: false, depth: 0.82,
    seed: 11.3, grow: [0.34, 0.76], opacity: 0.95,
    tint: 0.05, gain: 1.32, gamma: 0.92,
    wobble: 0.18, soft: 0.22, disp: 0.08,
    flow: 0.1, flowScale: 1.35, flowSpeed: 0.85, vein: 0.9, sway: 0.03,
    haze: 0.4, hazeThresh: 0.42, swell: 1.16,
    origin: [0.5, 0.98],
    drift: [0.0, -0.03],
  },
  {
    src: 'nuage', mode: 'radial', order: 11,
    hFactor: 1.55, cx: -0.55, cy: -0.3, rot: 14, mirror: true, depth: 1.06,
    seed: 13.1, grow: [0.4, 0.84], opacity: 0.9,
    tint: 0.06, gain: 1.28, gamma: 0.95,
    wobble: 0.2, soft: 0.22, disp: 0.09,
    flow: 0.115, flowScale: 1.2, flowSpeed: 0.78, vein: 0.9, sway: 0.034,
    haze: 0.38, hazeThresh: 0.44, swell: 1.14,
    origin: [0.5, 0.98],
    drift: [0.03, -0.02],
  },
  {
    src: 'nuage', mode: 'radial', order: 12,
    hFactor: 1.55, cx: 0.56, cy: -0.3, rot: -12, mirror: false, depth: 1.22,
    seed: 15.7, grow: [0.4, 0.84], opacity: 0.9,
    tint: 0.06, gain: 1.28, gamma: 0.95,
    wobble: 0.2, soft: 0.22, disp: 0.09,
    flow: 0.115, flowScale: 1.25, flowSpeed: 0.82, vein: 0.9, sway: 0.032,
    haze: 0.38, hazeThresh: 0.44, swell: 1.14,
    origin: [0.5, 0.98],
    drift: [-0.03, -0.02],
  },
  {
    src: 'nuage', mode: 'radial', order: 13,
    hFactor: 1.8, cx: 0.0, cy: 0.46, rot: 180, mirror: false, depth: 1.55,
    seed: 17.3, grow: [0.46, 0.94], opacity: 0.95,
    tint: 0.055, gain: 1.22, gamma: 0.98,
    wobble: 0.2, soft: 0.24, disp: 0.1,
    flow: 0.105, flowScale: 1.15, flowSpeed: 0.72, vein: 0.88, sway: 0.03,
    haze: 0.36, hazeThresh: 0.44, swell: 1.12,
    origin: [0.5, 0.06],
    drift: [0.0, 0.02],
  },

  /* ---- NAPPE : calque purement procédural, le plus profond ----
     100 % shader (aucune texture) : de l'encre diluée qui nappe et
     comble les blancs. C'est lui qui garantit qu'on ne voit plus de
     grand aplat blanc au centre du nuage.
     Sa poussée est volontairement tardive ([0.42, 1]) : lancée plus tôt,
     elle voilait tout le milieu du parcours et tuait le contraste des
     filets sur le blanc. Elle n'agit donc que pour refermer la fin.   */
  {
    src: 'nuage', mode: 'radial', order: 5, pure: true,
    hFactor: 1.6, cx: 0.0, cy: -0.05, rot: 0, mirror: false, depth: 1.9,
    seed: 23.7, grow: [0.42, 1.0], opacity: 1.0,
    tint: 0.15, gain: 1.0, gamma: 1.0,
    wobble: 0.22, soft: 0.25, disp: 0.12,
    flow: 0.2, flowScale: 1.05, flowSpeed: 0.62, vein: 0.95, sway: 0.036,
    haze: 0.72, hazeThresh: 0.32, swell: 1.1,
    origin: [0.5, 0.95], reach: 1.3,
    drift: [0.0, -0.02],
  },
];

export function initInkJourney() {
  const container = document.querySelector('#ink-journey');
  const spacer = document.querySelector('.ink-spacer');
  const mount = document.querySelector('#ink-canvas');
  if (!container || !spacer || !mount) return null;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 768px)').matches;

  const renderer = new THREE.WebGLRenderer({
    antialias: !mobile,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.35 : 1.75));
  renderer.setClearColor(0xffffff, 1);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 30);
  camera.position.set(0, 0, CAM_Z);

  // --- Textures (mis en cache : les filets servent à 5 calques) ---
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const loader = new THREE.TextureLoader();
  const textures = {};
  for (const [key, def] of Object.entries(TEX)) {
    const t = loader.load(def.url);
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = maxAniso;
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    textures[key] = t;
  }

  // --- Construction des calques ---
  const geometry = new THREE.PlaneGeometry(1, 1);
  const built = [];

  for (const cfg of LAYERS) {
    if (cfg.desktopOnly && mobile) continue;

    const uniforms = {
      uMap: { value: textures[cfg.src] },
      uTime: { value: 0 },
      uGrow: { value: 0 },
      uSeed: { value: cfg.seed },
      uSoft: { value: cfg.soft },
      uWobble: { value: cfg.wobble },
      uOpacity: { value: 0 },
      uMode: { value: cfg.mode === 'radial' ? 1 : 0 },
      uOrigin: { value: new THREE.Vector2(...(cfg.origin || [0.5, 0.5])) },
      uReach: { value: cfg.reach || 1.4 },
      uFront: { value: new THREE.Vector2(0, 0) },
      uTint: { value: new THREE.Color().setScalar(cfg.tint) },
      uGain: { value: cfg.gain },
      uGamma: { value: cfg.gamma },
      uDisp: { value: cfg.disp },
      // Encre dans l'eau
      uFlow: { value: cfg.flow ?? 0 },
      uFlowScale: { value: cfg.flowScale ?? 2 },
      uFlowSpeed: { value: cfg.flowSpeed ?? 0.6 },
      uHaze: { value: cfg.haze ?? 0 },
      uHazeThresh: { value: cfg.hazeThresh ?? 0.45 },
      uPure: { value: cfg.pure ? 1 : 0 },
      uVein: { value: cfg.vein ?? 0 },
      uSway: { value: cfg.sway ?? 0 },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: layerVert,
      fragmentShader: layerFrag,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = cfg.order;
    mesh.rotation.z = THREE.MathUtils.degToRad(cfg.rot);
    mesh.frustumCulled = false;
    scene.add(mesh);

    built.push({
      cfg, mesh, uniforms, aspect: TEX[cfg.src].aspect,
      vh: 1, w: 1, h: 1, x: 0, y: 0,
    });
  }

  // Hauteur visible (en unités monde) à une profondeur donnée.
  const visibleHeightAt = (depth) => 2 * TAN_HALF * (CAM_Z + depth);

  // Place chaque calque : tout est exprimé en hauteurs d'écran, donc la
  // composition reste identique quelle que soit la taille de la fenêtre.
  function layout() {
    const A = Math.max(camera.aspect, 0.1);
    // Sur écran étroit, on resserre l'écartement horizontal.
    const xScale = Math.min(A / 1.6, 1);

    for (const L of built) {
      const c = L.cfg;
      const vh = visibleHeightAt(c.depth);
      L.vh = vh;
      L.h = c.hFactor * vh;
      L.w = L.h * L.aspect;
      L.x = c.cx * vh * xScale;
      L.y = c.cy * vh;

      if (c.mode === 'front') {
        // Portion du plan réellement visible à l'écran, en UV : identique
        // sur tous les écrans puisque le plan ET l'écran sont en hauteurs d'écran.
        const bottom = c.cy - c.hFactor / 2;
        const uvTop = ((0.5 - bottom) / c.hFactor);
        const uvBottom = ((-0.5 - bottom) / c.hFactor);
        // Marge : le front démarre hors du visible, même avec l'érosion
        // maximale et la douceur du bord (sinon l'encre apparaîtrait d'un coup).
        const margin = 0.06 + c.wobble * 0.5 + c.soft;
        L.uniforms.uFront.value.set(uvTop + margin, uvBottom - margin);
      }
    }
  }

  function resize() {
    const w = Math.max(mount.clientWidth, 1);
    const h = Math.max(mount.clientHeight, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    layout();
  }
  resize();
  window.addEventListener('resize', resize);

  let target = 0;
  let progress = 0;
  let inView = false;

  // La traversée se joue sur les 300vh du spacer, puis reste à 1 pendant
  // que l'about défile sur les nuages.
  ScrollTrigger.create({
    trigger: spacer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.4,
    onUpdate: (self) => { target = self.progress; },
  });

  ScrollTrigger.create({
    trigger: container,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => { inView = self.isActive; },
  });

  const clock = new THREE.Clock();
  let elapsed = 0;
  let frozen = null;

  function loop() {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!inView || document.hidden) return;

    // Mode « hold » (dev) : la boucle continue de rendre (le compositeur
    // reste à jour) mais l'image est figée sur une progression donnée.
    if (frozen) {
      applyFrame(frozen.t, frozen.p);
      renderer.render(scene, camera);
      return;
    }

    elapsed += dt;
    progress = reduced ? target : progress + (target - progress) * Math.min(1, dt * 7);

    applyFrame(elapsed, progress);
    renderer.render(scene, camera);
  }

  // Applique une image complète pour une progression donnée.
  function applyFrame(time, p) {
    // Oscillation lente : la parallaxe entre les profondeurs fait la 3D.
    camera.position.x = reduced ? 0 : Math.sin(time * 0.055) * 0.035;
    camera.position.y = reduced
      ? p * 0.03
      : Math.cos(time * 0.043) * 0.025 + p * 0.03;

    for (const L of built) {
      const c = L.cfg;
      const u = L.uniforms;
      // Mouvement réduit : l'encre reste figée (sinon elle tourbillonne
      // indéfiniment, ce qui est exactement ce qu'on veut éviter).
      u.uTime.value = reduced ? 0 : time;

      const g = sstep(c.grow[0], c.grow[1], p);
      u.uGrow.value = g;

      let op = c.opacity;
      if (c.fadeOut) {
        op *= 1 - (1 - (c.fadeKeep ?? 0)) * sstep(c.fadeOut[0], c.fadeOut[1], p);
      }
      u.uOpacity.value = op;

      // Expansion pendant la poussée (les nuages gonflent en apparaissant).
      const s = c.swell ? 1 + (c.swell - 1) * g : 1;
      L.mesh.scale.set(L.w * s, L.h * s, 1);
      if (c.mirror) L.mesh.scale.x *= -1;

      const dx = (c.drift ? c.drift[0] : 0) * p;
      const dy = (c.drift ? c.drift[1] : 0) * p;
      L.mesh.position.set(L.x + dx * L.vh, L.y + dy * L.vh, -c.depth);
    }
  }

  renderer.setAnimationLoop(loop);

  // Outil de mise au point, dev uniquement : rend une image pour une
  // progression donnée, sans dépendre du scroll ni de la visibilité
  // de l'onglet (retiré du build de production).
  if (import.meta.env.DEV) {
    window.__inkJourney = {
      renderAt(p, time = 0) {
        target = p;
        progress = p;
        applyFrame(time, p);
        renderer.render(scene, camera);
      },
      // Fige la scène : indispensable pour capturer une image fiable
      // (sinon la boucle réécrit par-dessus avec la progression du scroll).
      pause() { renderer.setAnimationLoop(null); },
      resume() { clock.getDelta(); renderer.setAnimationLoop(loop); },
      // Fige l'image SANS arrêter la boucle : le canvas continue d'être
      // composité à chaque frame, donc les captures ne sont plus trouées.
      hold(p, t = 0) { frozen = { p, t }; },
      release() { frozen = null; },
      // Lit les vrais pixels du framebuffer WebGL (pas de compositing, donc
      // aucune ambiguïté entre encre saturée et fond de section dans le noir).
      // pts : [fx, fy] avec 0,0 = coin haut-gauche. Renvoie la luminance 0-255.
      probe(p, t, pts) {
        applyFrame(t, p);
        renderer.render(scene, camera);
        const gl = renderer.getContext();
        const w = renderer.domElement.width;
        const h = renderer.domElement.height;
        const px = new Uint8Array(4);
        return pts.map(([fx, fy]) => {
          gl.readPixels(
            Math.round(fx * (w - 1)),
            Math.round((1 - fy) * (h - 1)),
            1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px,
          );
          return `${fx}:${fy}=${px[0]}`;
        });
      },
      bounds() {
        return built.map((L, i) => {
          const s = L.cfg.swell ? 1 + (L.cfg.swell - 1) * L.uniforms.uGrow.value : 1;
          const half = (L.cfg.hFactor * s) / 2;
          return {
            i,
            src: L.cfg.src,
            mode: L.cfg.mode,
            pure: !!L.cfg.pure,
            grow: +L.uniforms.uGrow.value.toFixed(3),
            opacity: +L.uniforms.uOpacity.value.toFixed(3),
            top: +(L.cfg.cy + half).toFixed(3),
            bottom: +(L.cfg.cy - half).toFixed(3),
          };
        });
      },
      only(i) {
        built.forEach((L, k) => { L.mesh.visible = k === i; });
      },
      all() {
        built.forEach((L) => { L.mesh.visible = true; });
      },
    };
  }

  return { resize };
}
