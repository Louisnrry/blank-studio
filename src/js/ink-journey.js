import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import journeyVert from '../shaders/journey.vert?raw';
import journeyFrag from '../shaders/journey.frag?raw';

gsap.registerPlugin(ScrollTrigger);

// Traversée d'encre : canvas sticky plein écran.
// 300vh de traversée (blanc → filets → nuages → nuages denses),
// puis zone about qui défile SUR les nuages vivants (le canvas reste en fond).
// Scrub total réversible. Rendu uniquement quand la zone est visible.
// Mobile : résolution allégée.
export function initInkJourney() {
  const container = document.querySelector('#ink-journey');
  const spacer = document.querySelector('.ink-spacer');
  const mount = document.querySelector('#ink-canvas');
  if (!container || !spacer || !mount) return null;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 768px)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5));
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uProgress: { value: 0 },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
  };

  // Qualité équilibrée : 24 plans de raymarch desktop, 14 sur mobile.
  const frag = '#define STEPS ' + (mobile ? 14 : 24) + '\n' + journeyFrag;

  const material = new THREE.ShaderMaterial({
    vertexShader: journeyVert,
    fragmentShader: frag,
    uniforms,
    depthWrite: false,
    depthTest: false,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  function resize() {
    const w = Math.max(mount.clientWidth, 1);
    const h = Math.max(mount.clientHeight, 1);
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  }
  resize();
  window.addEventListener('resize', resize);

  let target = 0;
  let inView = false;

  // La progression va de 0 → 1 sur la traversée, puis reste à 1
  // pendant que l'about défile sur les nuages.
  // Synchro resserrée : lissage court pour une naissance immédiate au relais.
  ScrollTrigger.create({
    trigger: spacer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.35,
    onUpdate: (self) => {
      target = self.progress;
    },
  });

  ScrollTrigger.create({
    trigger: container,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      inView = self.isActive;
    },
  });

  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    if (!inView || document.hidden) return;
    // Lissage doux vers la cible du scroll (le scrub lisse déjà).
    uniforms.uProgress.value += (target - uniforms.uProgress.value) * 0.15;
    if (!reduced) uniforms.uTime.value = clock.getElapsedTime();
    else uniforms.uProgress.value = target;
    renderer.render(scene, camera);
  });

  return { resize };
}
