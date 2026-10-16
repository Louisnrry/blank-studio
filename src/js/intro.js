import gsap from 'gsap';

// Séquence d'ouverture, jouée en place sur la landing (aucun overlay) :
//  Phase 1 — la tige : un trait vertical se dessine de bas en haut,
//    comme une pousse (les deux côtés simultanément).
//  Phase 2 — les fleurs : ouverture latérale, le flou d'encre se dissipe.
//  Puis le logo, puis la flèche (trait qui se trace + flottement doux).
// Durée totale : ~4,5 s. États initiaux posés en JS uniquement
// (sans JS, tout reste visible). Aucun transform animé sur les fleurs
// pour préserver le miroir CSS (scaleX).
export function playIntro() {
  const flowers = document.querySelectorAll('.landing-flower');
  const logo = document.querySelector('.landing-logo');
  const arrow = document.querySelector('.landing-arrow');
  if (!flowers.length || !logo) return Promise.resolve();

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return Promise.resolve();
  }

  // Prépare le tracé de la flèche (chaque trait se dessinera).
  const strokes = arrow ? Array.from(arrow.querySelectorAll('path')) : [];
  strokes.forEach((p) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = `${len}`;
  });

  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve });

    // Phase 1 — la tige pousse depuis la base.
    tl.fromTo(
      flowers,
      { clipPath: 'inset(100% 46% 0% 46%)', filter: 'blur(5px)' },
      {
        clipPath: 'inset(0% 46% 0% 46%)',
        filter: 'blur(2px)',
        duration: 1.3,
        ease: 'power2.inOut',
      },
      0.2
    );

    // Phase 2 — les fleurs s'ouvrent sur les côtés (ralentie, courbe douce).
    tl.to(
      flowers,
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        filter: 'blur(0px)',
        duration: 1.8,
        ease: 'expo.out',
        clearProps: 'clipPath,filter',
      },
      1.5
    );

    // Le logo après la floraison.
    tl.fromTo(
      logo,
      { autoAlpha: 0, y: 26 },
      { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' },
      3.1
    );

    // La flèche : apparition + trait qui se trace…
    if (arrow && strokes.length) {
      tl.fromTo(
        arrow,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.3, ease: 'power1.out' },
        3.6
      );
      tl.to(
        strokes,
        { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut', stagger: 0.12 },
        3.6
      );
      // …puis flottement doux en boucle (sinusoïde, aucun à-coup).
      tl.add(() => {
        gsap.to(arrow, {
          y: 8,
          duration: 2.4,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
      }, 4.4);
    }
  });
}
