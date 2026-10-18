import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { jump } from './smooth.js';

gsap.registerPlugin(ScrollTrigger);

// Multiplication par -1 de la page, jouée UNIQUEMENT quand la section contact
// occupe tout l'écran. À chaque franchissement du seuil (dans un sens ou dans
// l'autre), on bloque d'abord le scroll, on bascule lentement (blanc → noir,
// noir → blanc — guirlande, logo, formulaire, tout est retourné d'un coup),
// puis le scroll repart. Le seuil est le haut de la section : à ce moment elle
// remplit l'écran, donc le switch ne se voit jamais sur le reste du site.
// Exceptions : le footer est un bandeau noir permanent (hors inversion), et un
// saut depuis un lien de navigation n'est jamais bloqué (il doit aboutir).
export function initInvert(lenis) {
  const contact = document.querySelector('#contact');
  const main = document.querySelector('main');
  if (!contact || !main) return;

  // On filtre main seul : le footer reste noir en permanence (hors inversion).
  const targets = [main];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DURATION = reduced ? 0 : 2.4; // bascule bloquée (scroll manuel)
  const DURATION_JUMP = reduced ? 0 : 1.4; // bascule pendant un saut de lien
  const lockAllowed = !reduced;

  let inverted = false;
  let busy = false;

  // Journal de debug (window.__invert.state() dans la console).
  const log = [];
  const note = (ev) => {
    log.push({ ev, t: Math.round(performance.now()), y: Math.round(window.scrollY) });
    if (log.length > 20) log.shift();
  };

  function invert(on, boundary) {
    if (busy || inverted === on) {
      note('skip ' + (busy ? 'busy' : 'même état') + ' → ' + on);
      return;
    }
    note('bascule → ' + on);
    inverted = on;
    busy = true;

    // Pas de blocage pendant un saut de navigation : sinon le lien
    // n'aboutirait pas (le scroll se figerait en chemin).
    // Et si on arrive « déjà là » (rechargement en bas de page, très loin du
    // seuil), on applique l'état sans rien bloquer ni recaler.
    const proche = typeof boundary !== 'number' || Math.abs(window.scrollY - (boundary + 1)) <= 150;
    const doLock = lockAllowed && proche && performance.now() > jump.until;
    const instantane = lockAllowed && !proche;

    // On bloque AVANT la bascule, en recalant le scroll juste sur le seuil :
    // après une inversion on se pose 1 px DANS la zone (la bascule se joue
    // avec la seule section contact à l'écran, et ScrollTrigger reste
    // « dedans »), après un retour on se pose 1 px DEHORS (sinon la prochaine
    // descente ne re-franchirait rien et l'inversion ne partirait plus).
    if (doLock && lenis) {
      lenis.stop();
      if (typeof boundary === 'number') {
        lenis.scrollTo(boundary + (on ? 1 : -1), { immediate: true, force: true });
      }
    }

    const vars = {
      filter: on ? 'invert(1)' : 'invert(0)',
      duration: instantane ? 0 : doLock ? DURATION : DURATION_JUMP,
      ease: 'power2.inOut',
      delay: doLock ? 0.15 : 0,
      overwrite: true,
      onComplete: () => {
        note('fin → ' + on);
        busy = false;
        if (doLock && lenis) lenis.start();
      },
    };
    // Retour en blanc : on retire le filtre une fois fini (un filter, même à
    // 0, crée un contenant pour les fixed — les épingles n'aiment pas).
    if (!on) vars.clearProps = 'filter';

    gsap.to(targets, vars);
  }

  // Le seuil : 1 px au-dessus du haut de la section contact (un saut qui
  // atterrit pile sur le haut de la section compte donc comme « dedans »).
  // Calculé à la main plutôt qu'avec « top top-=1 » : l'offset de syntaxe
  // n'est pas fiable et le seuil se retrouvait 1 px APRÈS la section.
  // Vers le bas (onEnter / onEnterBack) on inverse ; vers le haut
  // (onLeaveBack) on revient en blanc. Bloqué dans les deux sens, à chaque
  // passage (sauf saut de lien, voir plus haut).
  const st = ScrollTrigger.create({
    trigger: contact,
    start: () => window.scrollY + contact.getBoundingClientRect().top - 1,
    onEnter: (self) => {
      note('onEnter');
      invert(true, self.start);
    },
    onEnterBack: (self) => {
      note('onEnterBack');
      invert(true, self.start);
    },
    onLeaveBack: (self) => {
      note('onLeaveBack');
      invert(false, self.start);
    },
  });

  // Resynchronisation après un refresh de ScrollTrigger (redimensionnement de
  // la fenêtre, zoom de page, polices qui arrivent) : tout le layout se décale,
  // l'état peut se retrouver faux — on le réaligne sur la position réelle, en
  // dur, sans blocage ni recalage (la personne est en train de redimensionner,
  // on ne lui vole pas son scroll).
  ScrollTrigger.addEventListener('refresh', () => {
    if (busy) return;
    const dedans = st.progress > 0;
    if (dedans === inverted) return;
    inverted = dedans;
    note('resync → ' + dedans);
    const vars = { filter: dedans ? 'invert(1)' : 'invert(0)', duration: 0, overwrite: true };
    if (!dedans) vars.clearProps = 'filter';
    gsap.to(targets, vars);
  });

  window.__invert = {
    state: () => ({
      inverted,
      busy,
      progress: Math.round(st.progress * 1000) / 1000,
      seuil: Math.round(st.start),
      y: Math.round(window.scrollY),
      log: [...log],
    }),
  };
}
