# blank® — one-pager agence (Vite + Three.js + GSAP)

Agence digitale fictive : branding & création de sites.
One-pager : landing → traversée d'encre → about → projets → contact + formulaire → footer.

## Stack

| Brique | Rôle |
|---|---|
| Vite (vanilla JS) | build + dev local |
| Three.js | shader hero (`src/shaders/ink.*`, `src/js/hero-shader.js`) |
| GSAP + ScrollTrigger | intro, reveals, transitions inter-sections, compteurs |
| Lenis | smooth scroll, piloté par le ticker GSAP |
| Tailwind CSS v4 | layout utilitaire (couleurs via variables CSS pour le clair/sombre) |

## Démarrage

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build prod → dist/
npm run preview  # prévisualiser le build
```

## Déploiement (Netlify, continu)

```bash
git remote add origin https://github.com/TON-USER/blank-studio.git
git push -u origin main
```

Puis sur Netlify : *Add new site → Import an existing project → GitHub →
blank-studio* (réglages repris de `netlify.toml`), *Deploy*, puis renommer
le site en `blank-studio` → https://blank-studio.netlify.app.
Chaque push sur `main` redéploie automatiquement.

## Structure

```
index.html            # landing, encre, about, projets, contact, footer
public/favicon.svg    # favicon placeholder (□)
public/assets/        # fleur.png + logo.png (landing, noir & blanc)
src/main.js           # orchestration
src/style.css         # design system (thèmes, sections, boutons…)
src/js/theme.js       # clair / sombre (data-theme + localStorage)
src/js/smooth.js      # Lenis + ancres fluides
src/js/hero-shader.js # shader encre fullscreen
src/js/reveals.js     # transitions inter-sections, parallaxe, progression
src/js/ink-journey.js # traversée d'encre + about sur nuages vivants (scrub réversible)
src/js/nav.js         # header, menu mobile, boutons magnétiques
src/js/intro.js       # ouverture : tige dessinée → fleurs → logo → flèche (~4,5 s)
src/js/contact.js     # formulaire démo (sans backend)
src/shaders/          # ink.* (hero, en pause) + journey.* (encre volumétrique raymarchée)
docs/depth-map.md     # guide effet depth-map (préparé, non implémenté)
```

## Personnaliser

- **Logo Figma** : exporte ton logo en SVG → `public/logo.svg`, puis remplace les
  `.wordmark` (header) et `.footer-word` (footer) par `<img src="/logo.svg" alt="blank">`.
- **Textes** : directement dans `index.html` (français, contenus démo).
- **Shader** : réglages dans `src/shaders/ink.frag` (vitesse `uTime * 0.05`,
  halo souris `exp(-d * 3.0)`, grain, vignette).
- **Thème** : variables dans `src/style.css` (`html[data-theme="light"]`).
- **Visuels projets** : remplace les placeholders `.work-visual--*` par des `<img>`
  réelles — la parallaxe `[data-parallax]` est déjà câblée.
- **Formulaire** : `src/js/contact.js` simule l'envoi (900 ms) ; branche ton
  backend / Formspree / API à l'endroit indiqué.
- **Depth-map** : voir `docs/depth-map.md` (guide complet, en attente de ton go).

## Notes

- `prefers-reduced-motion` respecté partout (shader figé, pas de scrub).
- Sans JS : contenu visible, overlay d'intro masqué (`<noscript>` + failsafe).
- Canvas hero en pause hors écran / onglet caché (perf).
