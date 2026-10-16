import * as THREE from 'three';
import inkVert from '../shaders/ink.vert?raw';
import inkFrag from '../shaders/ink.frag?raw';

// Hero : plan fullscreen + shader "encre" (fbm domain-warpé, halo souris).
// Pause automatique hors écran / onglet caché. 1 frame fixe si reduced-motion.
export function initHeroShader() {
  const container = document.querySelector('#hero-canvas');
  if (!container) return null;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTime: { value: reduced ? 12.0 : 0.0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0.5, 0.35) },
    uTheme: { value: document.documentElement.dataset.theme === 'light' ? 1 : 0 },
    uEnergy: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: inkVert,
    fragmentShader: inkFrag,
    uniforms,
    depthWrite: false,
    depthTest: false,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  const mouseTarget = new THREE.Vector2(0.5, 0.35);
  const onPointer = (e) => {
    const r = container.getBoundingClientRect();
    mouseTarget.x = (e.clientX - r.left) / Math.max(r.width, 1);
    mouseTarget.y = 1 - (e.clientY - r.top) / Math.max(r.height, 1);
    uniforms.uEnergy.value = Math.min(uniforms.uEnergy.value + 0.25, 1);
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  // Transition de thème : on interpole uTheme au lieu de couper brutalement.
  let themeTarget = uniforms.uTheme.value;
  window.addEventListener('blank:theme', (e) => {
    themeTarget = e.detail.theme === 'light' ? 1 : 0;
  });

  function resize() {
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  }
  resize();
  window.addEventListener('resize', resize);

  let visible = true;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  }).observe(container);

  const clock = new THREE.Clock();

  function render() {
    uniforms.uMouse.value.lerp(mouseTarget, 0.06);
    uniforms.uEnergy.value *= 0.985;
    uniforms.uTheme.value += (themeTarget - uniforms.uTheme.value) * 0.06;
    renderer.render(scene, camera);
  }

  if (reduced) {
    render(); // frame unique, pas de boucle
  } else {
    renderer.setAnimationLoop(() => {
      if (!visible || document.hidden) return;
      uniforms.uTime.value = clock.getElapsedTime();
      render();
    });
  }

  return { resize };
}
