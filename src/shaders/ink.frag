precision highp float;

varying vec2 vUv;

uniform float uTime;   // secondes
uniform vec2 uRes;     // résolution du canvas (px)
uniform vec2 uMouse;   // position souris 0..1 (origine bas-gauche)
uniform float uTheme;  // 0 = sombre, 1 = clair
uniform float uEnergy; // intensité du halo souris (0..1)

/* --- bruit de valeur + fbm (domaine warpé, style encre) --- */
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

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 st = uv;
  st.x *= aspect;

  vec2 m = uMouse;
  m.x *= aspect;

  float t = uTime * 0.05;

  // Double domain-warp : flux lent façon encre dans l'eau
  vec2 q = vec2(
    fbm(st * 1.4 + vec2(0.0, 0.0) + t),
    fbm(st * 1.4 + vec2(5.2, 1.3) - t)
  );
  vec2 r = vec2(
    fbm(st * 1.4 + 2.0 * q + vec2(1.7, 9.2) + 0.3 * t),
    fbm(st * 1.4 + 2.0 * q + vec2(8.3, 2.8) - 0.25 * t)
  );
  float ink = fbm(st * 1.6 + 2.2 * r);

  // Halo qui suit la souris : éclaircit et agite l'encre
  float d = distance(st, m);
  float halo = exp(-d * 3.0) * uEnergy;
  ink += halo * 0.18;

  // Palettes sombre / clair (mixées par uTheme pour la transition de thème)
  vec3 bgD   = vec3(0.039, 0.039, 0.043);
  vec3 inkD  = vec3(0.145, 0.150, 0.170);
  vec3 lineD = vec3(0.850, 0.860, 0.880);

  vec3 bgL   = vec3(0.956, 0.956, 0.945);
  vec3 inkL  = vec3(0.800, 0.800, 0.785);
  vec3 lineL = vec3(0.120, 0.120, 0.130);

  vec3 bg   = mix(bgD, bgL, uTheme);
  vec3 inkC = mix(inkD, inkL, uTheme);
  vec3 lineC = mix(lineD, lineL, uTheme);

  // Masse d'encre
  float mass = smoothstep(0.22, 0.88, ink);
  vec3 col = mix(bg, inkC, mass);

  // Filets fins (ridged) : veines d'encre
  float ridge = 1.0 - smoothstep(0.0, 0.09, abs(ink - 0.52));
  col = mix(col, lineC, ridge * 0.32);

  // Lumière du halo souris
  col += lineC * halo * 0.10;

  // Vignettage pour asseoir la typographie
  float vig = smoothstep(1.30, 0.30, distance(uv, vec2(0.5, 0.42)));
  col *= mix(0.72, 1.0, vig);

  // Grain cinéma subtil
  float grain = hash(uv * uRes * 0.5 + fract(uTime) * 7.13) - 0.5;
  col += grain * 0.035;

  gl_FragColor = vec4(col, 1.0);
}
