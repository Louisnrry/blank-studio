// Section offres (#offres).
//
// L'écran reste collé (sticky) pendant toute la traversée de la zone. On lit la
// progression dans le scroll, on en déduit l'offre affichée (une par tiers) et
// on anime le remplacement du texte et du visuel. Les trois traits de gauche se
// remplissent segment par segment, dans le même mouvement.
//
// Pourquoi pas ScrollTrigger : la position MESURÉE d'un élément sticky inclut
// son propre décalage, les bornes calculées seraient donc fausses. On mesure la
// zone et l'écran une fois, puis on lit window.scrollY à chaque frame.
import gsap from 'gsap';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function initOffres() {
  const section = document.querySelector('#offres');
  if (!section) return null;

  const zone = section.querySelector('.offres-zone');
  const sticky = section.querySelector('.offres-sticky');
  if (!zone || !sticky) return null;

  // Ce qui change d'une offre à l'autre : le texte et le visuel.
  const groups = [
    Array.from(section.querySelectorAll('.offre')),
    Array.from(section.querySelectorAll('.offre-visual')),
  ];
  const fills = Array.from(section.querySelectorAll('.offres-tick i'));
  const count = Math.max(groups[0].length, groups[1].length, fills.length);
  if (!count) return null;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let zoneTop = 0;
  let travel = 1;
  let viewportH = 0;
  let index = 0;
  let lastY = NaN;
  let first = true; // premier calcul : on se pose sans animer (rechargement)

  const measure = () => {
    viewportH = window.innerHeight;
    zoneTop = zone.getBoundingClientRect().top + window.scrollY;
    // Traversée réelle, en pixels : la zone fait un écran + la réserve de
    // scroll, donc la course collée est la différence des deux.
    travel = Math.max(1, zone.offsetHeight - sticky.offsetHeight);
  };

  // État appliqué sans transition : rechargement au milieu de la section,
  // changement de hauteur de page, polices qui arrivent.
  const apply = (next) => {
    index = next;
    groups.forEach((group) => {
      group.forEach((el, i) => {
        const on = i === next;
        el.classList.toggle('is-active', on);
        el.style.opacity = on ? '1' : '0';
        el.style.transform = '';
      });
    });
  };

  // Remplacement d'une offre par une autre : la sortante part vers le haut,
  // l'entrante arrive par le bas (inversé quand on remonte le scroll).
  const show = (next) => {
    if (next === index) return;
    const from = index;
    index = next;
    const down = next > from;
    const d = reduced.matches ? 0 : 0.5;

    groups.forEach((group) => {
      const out = group[from];
      const incoming = group[next];
      if (out && out !== incoming) {
        gsap.to(out, {
          opacity: 0,
          y: down ? -22 : 22,
          duration: d * 0.7,
          ease: 'power2.in',
          overwrite: true,
          onComplete: () => out.classList.remove('is-active'),
        });
      }
      if (incoming) {
        incoming.classList.add('is-active');
        gsap.fromTo(
          incoming,
          { opacity: 0, y: down ? 26 : -26 },
          { opacity: 1, y: 0, duration: d, ease: 'power2.out', overwrite: true }
        );
      }
    });
  };

  const update = () => {
    if (!viewportH || !travel) return;
    const y = window.scrollY;
    if (y === lastY) return;
    lastY = y;
    // Rien à calculer quand la section est hors de l'écran.
    if (y + viewportH < zoneTop - viewportH || y > zoneTop + travel + viewportH) return;

    const p = clamp01((y - zoneTop) / travel);
    for (let i = 0; i < fills.length; i++) {
      // Le trait i se remplit pendant le tiers i de la traversée (du haut vers
      // le bas : la barre descend).
      fills[i].style.transform = `scaleY(${clamp01(p * count - i)})`;
    }
    const next = Math.min(count - 1, Math.floor(p * count));
    if (first) {
      first = false;
      apply(next);
    } else {
      show(next);
    }
  };

  // snap = true : on applique l'état sans transition (les paramètres de
  // l'écouteur d'événement ne doivent surtout pas être passés ici).
  const refresh = (snap = false) => {
    measure();
    lastY = NaN;
    if (snap) first = true;
    update();
  };

  refresh(true);
  gsap.ticker.add(update);

  window.addEventListener('resize', () => refresh(), { passive: true });

  // La page peut grandir APRÈS le chargement (polices, images tardives) : les
  // bornes absolues deviendraient fausses. On remesure donc dès que la hauteur
  // du document change.
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(() => refresh());
    observer.observe(document.body);
  }

  // Le chargement des polices peut décaler la mise en page.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => refresh(true));

  if (import.meta.env.DEV) {
    window.__offres = {
      section,
      zone,
      sticky,
      refresh,
      show,
      state: () => ({ zoneTop, travel, viewportH, index, lastY }),
    };
  }

  // En dev, Vite réexécute ce module à chaque sauvegarde : sans ce nettoyage,
  // l'ancienne instance continuerait de tourner et d'écraser les états.
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      gsap.ticker.remove(update);
      window.removeEventListener('resize', refresh);
    });
  }

  return { refresh };
}
