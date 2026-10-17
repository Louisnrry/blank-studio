// Section à propos détaillée (#studio).
//
// L'écran reste collé (sticky) pendant toute la traversée de la zone. Chaque
// barre sort du bord gauche pendant son tiers du scroll, poussée hors du mur :
// la plaque posée à son bout (« keep it simple. ») mène la sortie, la barre
// suit. Le texte de la section est posé DANS les barres : il sort avec elles.
// Le tout est scrubbé et donc réversible, comme le reste de la page.
//
// Pourquoi pas ScrollTrigger : la position MESURÉE d'un élément sticky inclut
// son propre décalage, les bornes calculées seraient donc fausses. On mesure la
// zone et l'écran une fois, puis on lit window.scrollY à chaque frame.
import gsap from 'gsap';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
// Départ et arrivée adoucis : le bloc se pose au lieu de s'arrêter net.
const smooth = (t) => t * t * (3 - 2 * t);

export function initStudio() {
  const section = document.querySelector('#studio');
  if (!section) return null;

  const zone = section.querySelector('.studio-zone');
  const sticky = section.querySelector('.studio-screen');
  if (!zone || !sticky) return null;

  const blocks = Array.from(section.querySelectorAll('.studio-block'));
  const count = blocks.length;
  if (!count) return null;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let zoneTop = 0;
  let travel = 1;
  let viewportH = 0;
  let lastY = NaN;

  const measure = () => {
    viewportH = window.innerHeight;
    zoneTop = zone.getBoundingClientRect().top + window.scrollY;
    // Traversée réelle, en pixels : la zone fait un écran + la réserve de
    // scroll, donc la course collée est la différence des deux.
    travel = Math.max(1, zone.offsetHeight - sticky.offsetHeight);
  };

  const update = () => {
    if (!viewportH || !travel) return;
    const y = window.scrollY;
    if (y === lastY) return;
    lastY = y;
    // Rien à calculer quand la section est hors de l'écran.
    if (y + viewportH < zoneTop - viewportH || y > zoneTop + travel + viewportH) return;

    const p = clamp01((y - zoneTop) / travel);
    for (let i = 0; i < count; i++) {
      // La barre i sort pendant le tiers i de la traversée. L'état ne dépend
      // que de p : rien à rejouer si la page se recharge au milieu.
      const e = reduced.matches ? 1 : smooth(clamp01(p * count - i));
      blocks[i].style.transform = `translateX(${(-100 * (1 - e)).toFixed(3)}%)`;
    }
  };

  // Ne jamais passer les paramètres d'un écouteur d'événement ici (ils sont
  // toujours vrais et n'ont aucun sens pour refresh).
  const refresh = () => {
    measure();
    lastY = NaN;
    update();
  };

  refresh();
  gsap.ticker.add(update);

  // Même référence pour poser et retirer l'écouteur (sinon le retrait rate).
  const onResize = () => refresh();
  window.addEventListener('resize', onResize, { passive: true });

  // La page peut grandir APRÈS le chargement (polices, images tardives) : les
  // bornes absolues deviendraient fausses. On remesure donc dès que la hauteur
  // du document change.
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(() => refresh());
    observer.observe(document.body);
  }

  // Le chargement des polices peut décaler la mise en page.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => refresh());

  if (import.meta.env.DEV) {
    window.__studio = {
      section,
      zone,
      sticky,
      blocks,
      refresh,
      state: () => ({ zoneTop, travel, viewportH, lastY, out: blocks.map((b) => b.style.transform) }),
    };
  }

  // En dev, Vite réexécute ce module à chaque sauvegarde : sans ce nettoyage,
  // l'ancienne instance continuerait de tourner et d'écraser les états.
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      gsap.ticker.remove(update);
      window.removeEventListener('resize', onResize);
    });
  }

  return { refresh };
}
