# blank® — one-pager agence (Vite + Three.js + GSAP)

Agence digitale fictive : branding & création de sites.
One-pager : landing → traversée d'encre → about → projets → offres → à propos détaillé → contact + formulaire → footer.

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
index.html            # landing, encre, about, projets, offres, à propos, contact, footer
public/favicon.svg    # favicon placeholder (□)
public/assets/        # fleur.png + logo.png (landing), keep it simple.png (barres), ensemble_flower.png + triangle dropdown 2.png (contact)
src/main.js           # orchestration
src/style.css         # design system (thèmes, sections, boutons…)
src/js/theme.js       # clair / sombre (data-theme + localStorage)
src/js/smooth.js      # Lenis + ancres fluides
src/js/hero-shader.js # shader encre fullscreen
src/js/reveals.js     # transitions inter-sections, parallaxe
src/js/ink-journey.js # traversée d'encre + about sur nuages vivants (scrub réversible)
src/js/projects-stack.js # pile de projets : cartes centrées, arrivée agrandie puis calage
src/js/offres.js      # section offres figée : trois offres remplacées au fil du scroll
src/js/studio.js      # à propos détaillé : trois barres (texte dedans) qui sortent du bord gauche
src/js/nav.js         # header, menu mobile, boutons magnétiques
src/js/intro.js       # ouverture : tige dessinée → fleurs → logo → flèche (~4,5 s)
src/js/contact.js     # formulaire démo (sans backend)
src/js/invert.js      # bascule blanc ↔ noir à l'entrée du contact
src/shaders/          # ink.* (hero, en pause) + journey.* (encre volumétrique raymarchée)
docs/depth-map.md     # guide effet depth-map (préparé, non implémenté)
```

## Personnaliser

- **Logo Figma** : exporte ton logo en SVG → `public/logo.svg`, puis remplace les images
  `/assets/logo.png` (landing, projets et footer) par `<img src="/logo.svg" alt="blank">`.
- **Textes** : directement dans `index.html` (français, contenus démo).
- **Shader** : réglages dans `src/shaders/ink.frag` (vitesse `uTime * 0.05`,
  halo souris `exp(-d * 3.0)`, grain, vignette).
- **Thème** : variables dans `src/style.css` (`html[data-theme="light"]`) ; la sélection
  de texte suit la palette noir & blanc (`--ink` sur `--bg`).
- **Visuels projets** : chaque carte a un placeholder inline (`data:image/svg+xml` sur
  `.project-photo img` dans `index.html`) — remplace simplement le `src` par la vraie photo.
- **Plaque « keep it simple. »** : l'asset `public/assets/keep it simple.png` (lettres
  foncées sur fond transparent, 448 × 243) est posé tel quel au bout de chaque barre, sur
  le blanc. Sa taille dans `src/style.css` (`--plaque-h`, `--plaque-w`) suit son rapport :
  si tu remplaces le fichier, garde le même cadrage ou ajuste `1.8436` en conséquence.
- **Formulaire** : `src/js/contact.js` simule l'envoi (900 ms) ; branche ton
  backend / Formspree / API à l'endroit indiqué.
- **Guirlande (contact)** : l'asset `public/assets/ensemble_flower.png` (colonne +
  bandeau du haut + bouquet d'angle, coin vide en bas à droite) est posé à cheval sur le
  coin bas droit de la section — `.contact-garland` dans `src/style.css` : `height: 113%`,
  calé en bas à droite, donc son coin vide tombe sous le formulaire (qui masque la partie
  passant derrière lui). Sur téléphone il est réduit à la bande au-dessus du formulaire.
  Statique pour l'instant — l'animation viendra après.
- **Inversion (contact)** : `src/js/invert.js` — le seuil est le haut de la section
  contact. À chaque franchissement (descente comme remontée), on bloque d'abord le
  scroll et on recale la position juste à l'entrée du seuil (la section remplit alors
  tout l'écran), puis la page bascule lentement (`filter: invert(1)` sur `main` :
  blanc → noir, noir → blanc, guirlande et logo compris) pendant ~2,5 s, et le scroll
  repart. Le switch ne se voit donc jamais sur le reste du site. Le blocage a lieu à
  chaque passage, dans les deux sens — sauf pendant un saut de lien (fenêtre `jump`
  dans `src/js/smooth.js`) : une navigation doit aboutir, donc pas de gel en chemin.
  En fin de retour, le filtre est retiré pour ne pas perturber les épingles (un
  `filter`, même à 0, crée un contenant pour les `fixed`). Filtre sur `main` seul : le
  footer est un bandeau noir permanent (hors inversion). `window.__invert.state()` donne
  l'état (debug).
- **Footer** : bandeau noir permanent (hors inversion, voir ci-dessus). Il fait
  `min-height: 100svh` : la zone blanche du haut (`.footer-white`) absorbe la hauteur
  restante, donc à fond de page seul le footer est visible (la section contact a disparu).
  Pilules arrondies (radius 14 px, nom seul) empilées à gauche (`.footer-case`), et à
  droite le bloc « Un projet ? » + logo (`.footer-cta`, décoratif — logo noir inversé en
  blanc ; au survol, le logo recule et se redresse d'un coup sec, effet tampon). Les
  pilules mènent aux sections via `data-scroll-to` (défilement Lenis) et passent en blanc au
  survol. En bas : ligne légale © + email.
- **Depth-map** : voir `docs/depth-map.md` (guide complet, en attente de ton go).

## Notes

- `prefers-reduced-motion` respecté partout (shader figé, pas de scrub).
- Sans JS : contenu visible, overlay d'intro masqué (`<noscript>` + failsafe).
- Canvas hero en pause hors écran / onglet caché (perf).
