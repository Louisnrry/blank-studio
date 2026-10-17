// Pile de projets (#projets).
//
// Chaque carte est en position: sticky, centrée verticalement dans l'écran et
// avec le même décalage que les autres : elle recouvre donc entièrement la
// précédente. La carte entrante arrive agrandie (--card-zoom) et reprend sa
// taille normale exactement au moment où elle se cale — décroissance linéaire
// dans le scroll, comme sur la référence.
//
// Le décalage du sticky est lu dans le CSS (top: calc((100svh - hauteur) / 2))
// et retiré aux bornes : sans ça, la carte se calerait plus tard que prévu et
// l'échelle n'atteindrait pas 1 à l'instant du calage.
//
// Pourquoi pas ScrollTrigger : les cartes sont sticky, donc leur position
// MESURÉE est décalée par le sticky lui-même et les bornes calculées seraient
// fausses. On reconstruit ici la position STATIQUE de chaque carte à partir de
// sa hauteur de layout et de sa marge (offsetTop et getBoundingClientRect
// incluent, eux, le décalage du sticky), puis on applique l'échelle nous-mêmes
// à chaque frame.
import gsap from 'gsap';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function initProjectsStack() {
  const stack = document.querySelector('.projects-stack');
  if (!stack) return null;

  const cards = Array.from(stack.querySelectorAll('.project-card'));
  if (!cards.length) return null;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let viewportH = 0;
  let zoom = 1;
  let stickyTop = 0; // décalage du sticky, lu dans le CSS (cartes centrées)
  let pins = []; // scroll absolu auquel chaque carte se cale en place
  let last = []; // dernière échelle écrite, pour ne rien toucher quand c'est stable
  let running = !reduced.matches;

  const measure = () => {
    viewportH = window.innerHeight;
    zoom = parseFloat(getComputedStyle(stack).getPropertyValue('--card-zoom')) || 1;
    stickyTop = parseFloat(getComputedStyle(cards[0]).top) || 0;
    const stackTop = stack.getBoundingClientRect().top + window.scrollY;
    // Position STATIQUE de chaque carte, reconstruite à partir des hauteurs de
    // layout et des marges. Surtout pas card.offsetTop : il inclut le décalage
    // du sticky, donc dès qu'une carte est collée en haut les trois positions
    // se confondent et l'échelle se fige. offsetHeight, lui, n'est pas touché
    // par le sticky ni par une transformation.
    let acc = 0;
    pins = cards.map((card) => {
      const pin = stackTop + acc - stickyTop;
      acc += card.offsetHeight + (parseFloat(getComputedStyle(card).marginBottom) || 0);
      return pin;
    });
  };

  const update = () => {
    if (!running || !viewportH) return;
    const y = window.scrollY;
    for (let i = 0; i < cards.length; i++) {
      // 0 = la carte entre par le bas de l'écran, 1 = elle vient de se caler.
      const progress = clamp01((y - (pins[i] - viewportH)) / viewportH);
      const scale = zoom - (zoom - 1) * progress;
      if (last[i] === scale) continue;
      last[i] = scale;
      // L'échelle part de --card-zoom (> 1) et DESCEND vers 1 : on écrit donc
      // tant qu'elle est supérieure à 1, et on retire la transformation une
      // fois la carte parfaitement calée.
      cards[i].style.transform = scale > 1.0005 ? `scale(${scale})` : '';
    }
  };

  const refresh = () => {
    measure();
    last = [];
    update();
  };

  refresh();
  gsap.ticker.add(update);

  window.addEventListener('resize', refresh, { passive: true });

  // La page peut grandir APRÈS le chargement (spacers de ScrollTrigger, images
  // tardives) : les bornes absolues deviendraient fausses. On remesure donc
  // dès que la hauteur du document change.
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(refresh);
    observer.observe(document.body);
  }

  reduced.addEventListener('change', (event) => {
    running = !event.matches;
    if (!running) {
      cards.forEach((card) => {
        card.style.transform = '';
      });
    }
    last = [];
    update();
  });

  // Le chargement des polices peut décaler la mise en page.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

  if (import.meta.env.DEV) {
    window.__projectsStack = {
      cards,
      refresh,
      update,
      state: () => ({ viewportH, zoom, pins, running, last }),
    };
  }

  // En dev, Vite réexécute ce module à chaque sauvegarde : sans ce nettoyage,
  // l'ancienne instance continuerait de tourner et d'écraser le transform.
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      gsap.ticker.remove(update);
      window.removeEventListener('resize', refresh);
    });
  }

  return { refresh };
}
