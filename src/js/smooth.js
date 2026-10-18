import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Un saut déclenché par un lien (data-scroll-to) ouvre cette fenêtre : pendant
// ce temps, les bascules d'inversion (src/js/invert.js) ne bloquent pas le
// scroll, sinon la navigation n'aboutirait jamais.
export const jump = { until: 0 };

// Lenis + GSAP : le ticker GSAP pilote Lenis, ScrollTrigger suit le scroll.
export function initSmooth() {
  const lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Ancres fluides (sans décalage : le site n'a plus de header fixe)
  document.querySelectorAll('[data-scroll-to]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const target = el.getAttribute('data-scroll-to');
      if (!target) return;
      const node = document.querySelector(target);
      if (!node) return;
      e.preventDefault();
      jump.until = performance.now() + 1800;
      lenis.scrollTo(node, { duration: 1.4 });
    });
  });

  return lenis;
}
