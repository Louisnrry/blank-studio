import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './style.css';
import { initTheme } from './js/theme.js';
import { initSmooth } from './js/smooth.js';
import { initHeroShader } from './js/hero-shader.js';
import { initInkJourney } from './js/ink-journey.js';
import { initProjectsStack } from './js/projects-stack.js';
import { initOffres } from './js/offres.js';
import { initStudio } from './js/studio.js';
import { initReveals } from './js/reveals.js';
import { initNav } from './js/nav.js';
import { initContact } from './js/contact.js';
import { playIntro } from './js/intro.js';

gsap.registerPlugin(ScrollTrigger);

initTheme();
const lenis = initSmooth();
initNav();
initHeroShader();
initInkJourney();
const projectsStack = initProjectsStack();
const offres = initOffres();
const studio = initStudio();
initContact();

const year = document.querySelector('#year');
if (year) year.textContent = String(new Date().getFullYear());

// La floraison joue d'abord ; les reveals se calent ensuite
// (refresh ScrollTrigger une fois la landing en place).
playIntro().then(() => {
  initReveals();
  ScrollTrigger.refresh();
  if (projectsStack) projectsStack.refresh();
  if (offres) offres.refresh();
  if (studio) studio.refresh();
});
