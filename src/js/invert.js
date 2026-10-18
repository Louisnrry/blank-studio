import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Multiplication par -1 de la page, jouée UNIQUEMENT quand la section contact
// occupe tout l'écran. À chaque franchissement du seuil (dans un sens ou dans
// l'autre), on bloque d'abord le scroll, on bascule lentement (blanc → noir,
// noir → blanc — guirlande, logo, formulaire, footer, tout est retourné d'un
// coup), puis le scroll repart. Le seuil est le haut de la section : à ce
// moment elle remplit l'écran, donc le switch ne se voit jamais sur le reste
// du site.
export function initInvert(lenis) {
  const contact = document.querySelector('#contact');
  const main = document.querySelector('main');
  const footer = document.querySelector('#site-footer');
  if (!contact || !main || !footer) return;

  // On filtre main + footer (et pas body : #progress est en position fixe).
  const targets = [main, footer];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DURATION = reduced ? 0 : 2.4;
  const lock = !reduced;

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

    // On bloque AVANT la bascule, en recalant le scroll juste à l'entrée du
    // seuil (1 px dedans : ScrollTrigger doit rester « dans » la zone, sinon
    // la prochaine sortie ne serait plus détectée). La bascule se joue donc
    // toujours avec la seule section contact à l'écran, jamais le reste.
    if (lock && lenis) {
      lenis.stop();
      if (typeof boundary === 'number') {
        lenis.scrollTo(boundary + 1, { immediate: true, force: true });
      }
    }

    const vars = {
      filter: on ? 'invert(1)' : 'invert(0)',
      duration: DURATION,
      ease: 'power2.inOut',
      delay: lock ? 0.15 : 0,
      overwrite: true,
      onComplete: () => {
        note('fin → ' + on);
        busy = false;
        if (lock && lenis) lenis.start();
      },
    };
    // Retour en blanc : on retire le filtre une fois fini (un filter, même à
    // 0, crée un contenant pour les fixed — les épingles n'aiment pas).
    if (!on) vars.clearProps = 'filter';

    gsap.to(targets, vars);
  }

  // Le seuil : le haut de la section contact. Vers le bas (onEnter /
  // onEnterBack) on inverse ; vers le haut (onLeaveBack) on revient en blanc.
  // Bloqué dans les deux sens, à chaque passage.
  const st = ScrollTrigger.create({
    trigger: contact,
    start: 'top top',
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
