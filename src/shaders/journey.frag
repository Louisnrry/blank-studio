precision highp float;

varying vec2 vUv;

uniform float uProgress; // 0..1, scrubbadé par le scroll (réversible)
uniform float uTime;     // dérive permanente, même sans scroll
uniform vec2 uRes;

/* --- bruit de valeur + fbm --- */
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

// Version légère (3 octaves) pour l'érosion du front de naissance.
float fbm3(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.11;
    a *= 0.5;
  }
  return v;
}

/* ============================================================
   Encre volumétrique : UN seul cœur raymarché pseudo-3D.
   - Les champs de bruit sont échantillonnés une fois puis mélangés
     selon la profondeur z : fils ET nuages vivent dans le volume.
   - Accumulation Beer-Lambert (transmittance) + ombrage interne :
     volutes diluées grises, cœur dense noir, lumière venant du haut.
   ============================================================ */
void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 st = uv;
  st.x *= aspect;

  // Pas de palier : l'encre naît dès le relais (sortie de la landing).
  float t = uProgress;

  // Dérive permanente : l'encre vit même à l'arrêt.
  float tt = uTime * 0.045;

  // Champs échantillonnés une fois (coût unique, combinés en z ensuite).
  vec2 warp = vec2(
    fbm(st * 1.6 + vec2(0.0, tt) + 3.1),
    fbm(st * 1.6 + vec2(4.7, 1.9) - tt)
  );
  vec2 drift = vec2(tt * 0.6, -tt * 0.4);
  float base0 = fbm(st * 2.3 + warp * 1.1 + drift);
  float base1 = fbm(st * 2.3 + warp * 1.1 - drift + vec2(7.3, 2.9));
  float ero = fbm3(st * 3.0 + warp * 1.3);

  // Naissance : haut-centre (sortie de la flèche), front radial érodé.
  vec2 org = vec2(0.5 * aspect, 0.98);
  float spread = smoothstep(0.0, 0.55, t);
  float Rf = mix(0.0, 1.7, spread);
  float dOrg = distance(st, org);

  float filStage = smoothstep(0.0, 0.25, t);
  float filW = mix(0.010, 0.12, smoothstep(0.05, 0.70, t));

  // Nuage : descend du haut puis se dissipe en s'étalant.
  float cStage = smoothstep(0.36, 0.58, t);
  float dissip = smoothstep(0.58, 0.80, t);
  vec2 cc = vec2(mix(0.40, 0.55, cStage) * aspect, mix(1.25, 0.45, cStage));
  float R = mix(0.12, 0.70, cStage);

  float cover = smoothstep(0.05, 0.85, t);
  float thresh = mix(1.0, 0.24, cover);

  // --- Boucle volumétrique ---
  float T = 1.0; // transmittance (Beer-Lambert)
  float D = 0.0; // densité accumulée (ombrage)
  for (int i = 0; i < STEPS; i++) {
    float z = (float(i) + 0.5) / float(STEPS); // 0 avant → 1 arrière
    // Le volume varie en profondeur : mélange des champs selon z.
    float n = mix(base0, base1, z);
    float m = mix(base1, base0, z * z);

    // Fils 3D : crêtes fines qui s'épaississent avec t (→ nuages).
    float veins = (1.0 - smoothstep(0.0, filW, abs(n - 0.5)))
                * (1.0 - smoothstep(Rf - 0.28, Rf, dOrg + (ero - 0.5) * 0.5 * smoothstep(0.0, 0.25, spread)))
                * filStage;

    // Nuages : billows denses (couches arrière plus denses = profondeur).
    float cm = smoothstep(thresh, thresh + 0.14, m) * smoothstep(0.30, 0.62, t) * (0.5 + 0.5 * z);

    // Panache : masque descendant érodé, texturé par le volume.
    vec2 q = (vec2(st.x - cc.x, st.y - cc.y)) / vec2(R * (0.8 + dissip * 0.8), R * 1.2);
    float pm = (1.0 - smoothstep(0.45, 1.0, length(q) + (ero - 0.5) * (0.25 + dissip * 0.6)))
             * smoothstep(0.0, 0.10, cStage);
    float plume = pm * smoothstep(0.30, 0.70, n);

    float dens = veins * 0.85 + cm + plume * 1.1;
    float a = clamp(dens, 0.0, 1.5) * (2.4 / float(STEPS));
    D += a * T;
    T *= exp(-a * 1.8);
    if (T < 0.02) break;
  }

  float alpha = clamp(1.0 - T, 0.0, 1.0);
  // Ombrage volumétrique : volutes diluées grises, cœur dense noir.
  float tone = smoothstep(0.0, 0.9, D);
  vec3 inkC = mix(vec3(0.42, 0.42, 0.44), vec3(0.0235, 0.0235, 0.0275), tone);
  inkC *= 0.82 + 0.18 * uv.y; // lumière venant du haut

  vec3 col = mix(vec3(1.0), inkC, alpha);

  // Grain fin anti-banding.
  col += (hash(uv * uRes * 0.5 + fract(uTime) * 7.13) - 0.5) * 0.03;

  gl_FragColor = vec4(col, 1.0);
}
