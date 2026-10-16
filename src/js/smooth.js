import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Lenis + GSAP : le ticker GSAP pilote Lenis, ScrollTrigger suit le scroll.
export function initSmooth() {
  const lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Ancres fluides (header fixe pris en compte)
  document.querySelectorAll('[data-scroll-to]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const target = el.getAttribute('data-scroll-to');
      if (!target) return;
      const node = document.querySelector(target);
      if (!node) return;
      e.preventDefault();
      lenis.scrollTo(node, { offset: -64, duration: 1.4 });
    });
  });

  return lenis;
}
