import gsap from 'gsap';

// Boutons magnétiques (desktop, pointeur fin uniquement).
export function initNav() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = 22;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, {
        x: (e.clientX - (r.left + r.width / 2)) / (r.width / 2) * strength * 0.4,
        y: (e.clientY - (r.top + r.height / 2)) / (r.height / 2) * strength * 0.4,
        duration: 0.4,
        ease: 'power2.out',
      });
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    });
  });
}
