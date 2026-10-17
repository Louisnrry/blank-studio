// Encre hybride : la matière vient des textures d'encre, le MOUVEMENT
// vient d'un champ de vitesse procédural. C'est lui qui donne l'effet
// « encre dans l'eau » : les textures sont advectées dans des tourbillons.
//
//   uMode 0 → front qui descend depuis le haut  (les filets entrent par en haut)
//   uMode 1 → croissance radiale depuis une origine (le nuage pousse)
//
// Un voile d'encre diluée (uHaze) nappe par-dessus et remplit les blancs :
// même sans texture (uPure = 1) le calque produit de l'encre.
varying vec2 vUv;

uniform sampler2D uMap;
uniform float uTime;
uniform float uGrow;    // 0..1 poussée du calque
uniform float uSeed;
uniform float uSoft;    // douceur du front
uniform float uWobble;  // amplitude de l'érosion du front
uniform float uOpacity;
uniform float uMode;
uniform vec2  uOrigin;  // origine de la croissance radiale (UV)
uniform float uReach;   // portée radiale (UV)
uniform vec2  uFront;   // y de début / fin du front descendant (UV)
uniform vec3  uTint;
uniform float uGain;    // densité de l'encre
uniform float uGamma;
// --- encre dans l'eau ---
uniform float uFlow;       // amplitude d'advection des tourbillons
uniform float uFlowScale;  // fréquence du champ de vitesse
uniform float uFlowSpeed;  // vitesse d'évolution du champ
uniform float uHaze;       // voile d'encre diluée
uniform float uHazeThresh;
uniform float uPure;       // 1 = pas de texture, uniquement le voile procédural
uniform float uVein;       // modulation d'alpha : casse les aplats, donne de la matière
uniform float uSway;       // courant : oscillation lente et ample de tout le calque

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// Deux octaves : assez riche pour un champ fluide, deux fois moins cher que trois.
float fbm2(vec2 p) {
  return 0.66 * vnoise(p) + 0.34 * vnoise(p * 2.13 + 7.7);
}

// Champ de vitesse : deux bruits croisés et dérivants → tourbillons.
// uSeed décale le champ pour que chaque calque tourbillonne différemment.
vec2 flowField(vec2 p, float t) {
  float n1 = fbm2(p + vec2(t * 0.25, -t * 0.12));
  float n2 = fbm2(p.yx * 1.17 + vec2(-t * 0.2, t * 0.16) + 11.3);
  return vec2(n1, n2) - 0.5;
}

void main() {
  // Le champ de vitesse advecte la texture : c'est le cœur du mouvement.
  vec2 f = flowField(vUv * uFlowScale + uSeed * 2.7, uTime * uFlowSpeed);

  // Courant : tout le calque ondule lentement, comme un volume d'eau remué.
  // Bounded (sin/cos) : la texture ne dérive jamais hors du plan.
  vec2 current = vec2(
    sin(uTime * 0.38 + uSeed * 1.7),
    cos(uTime * 0.29 + uSeed * 2.3)
  ) * uSway;

  vec2 uv = vUv + f * uFlow + current;

  float a = 0.0;
  if (uPure < 0.5) {
    a = texture2D(uMap, uv).a;
    a = pow(clamp(a * uGain, 0.0, 1.0), uGamma);
  }

  // Sortie précoce : rien ici et pas de voile → on ne calcule pas la suite.
  if (a < 0.003 && uHaze < 0.001 && uPure < 0.5) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Voile procédural : encre diluée, animée par le même champ de vitesse.
  // Attention : un smoothstep pur tombe à ZÉRO dans les poches de bruit
  // faible, et ces poches font plusieurs centaines de pixels — c'est
  // exactement ce qui laissait un trou blanc au centre. D'où le plancher :
  // le voile ne descend jamais sous 40 % de sa densité, il n'y a donc
  // plus aucune zone laissée totalement vierge.
  float haze = 0.0;
  if (uHaze > 0.001 || uPure > 0.5) {
    float h = fbm2(vUv * 1.9 + f * 2.6 + vec2(0.0, uTime * 0.06));
    haze = uHaze * (0.4 + 0.6 * smoothstep(uHazeThresh, uHazeThresh + 0.3, h));
  }

  // Front de poussée, érodé par le bruit.
  float wob = (vnoise(vUv * 3.1 + uSeed * 5.0) - 0.5) * uWobble;
  float m;
  if (uMode < 0.5) {
    // Front descendant : révélé au-dessus du front (l'encre coule du haut).
    float front = mix(uFront.x, uFront.y, uGrow);
    m = smoothstep(front - uSoft, front, vUv.y + wob);
  } else {
    // Croissance radiale : révélé sous le rayon courant.
    float rad = uGrow * uReach;
    m = 1.0 - smoothstep(rad - uSoft, rad, distance(vUv, uOrigin) + wob * 0.6);
  }

  // Veines de densité : la même famille de bruit module l'alpha d'encre.
  // C'est ce qui empêche les zones d'alpha homogène du PNG de se lire comme
  // des aplats gris à bords nets. La fréquence est volontairement haute :
  // il faut plusieurs veines à l'intérieur d'une même plaque, sinon on ne
  // fait que la teinter uniformément et la silhouette reste lisible.
  float vein = 1.0;
  if (uVein > 0.001) {
    float v = fbm2(vUv * 7.5 + f * 1.9 + uSeed * 1.7 + vec2(0.0, uTime * 0.04));
    vein = mix(1.0, 0.34 + 1.32 * v, uVein);
  }

  float ink = max(a, haze) * vein;
  gl_FragColor = vec4(uTint, clamp(ink * m * uOpacity, 0.0, 1.0));
}
