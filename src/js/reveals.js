import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Transitions inter-sections + reveals :
//  - [data-reveal] : apparition douce au scroll
//  - [data-reveal-group] : cascade sur les enfants directs
//  - lignes .section-line : tracé horizontal au scroll (scrub)
//  - [data-parallax] : parallaxe image (prêt pour les vrais visuels)
export function initReveals() {
  if (reduced()) return;

  // Apparitions simples
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 44,
      autoAlpha: 0,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%' },
    });
  });

  // Cascades
  gsap.utils.toArray('[data-reveal-group]').forEach((group) => {
    gsap.from(group.children, {
      y: 48,
      autoAlpha: 0,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.12,
      scrollTrigger: { trigger: group, start: 'top 84%' },
    });
  });

  // Transition entre sections : la ligne du header se trace au scroll
  gsap.utils.toArray('.section-line').forEach((line) => {
    gsap.fromTo(
      line,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { trigger: line, start: 'top 88%', end: 'top 45%', scrub: true },
      }
    );
  });

  // Parallaxe images (utile dès que les visuels réels remplacent les placeholders)
  gsap.utils.toArray('[data-parallax]').forEach((img) => {
    gsap.fromTo(
      img,
      { yPercent: -8 },
      {
        yPercent: 8,
        ease: 'none',
        scrollTrigger: {
          trigger: img.closest('[data-parallax-wrap]') || img,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      }
    );
  });
}
