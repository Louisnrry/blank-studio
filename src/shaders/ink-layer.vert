// Feuille d'encre : un plan texturé (PNG d'encre) légèrement ondulé
// dans la profondeur, pour que la matière ne soit jamais parfaitement plane.
uniform float uTime;
uniform float uSeed;
uniform float uDisp;

varying vec2 vUv;

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

void main() {
  vUv = uv;

  vec3 p = position;
  // Relief : la feuille enfle et se creuse lentement.
  float n = vnoise(position.xy * 2.2 + uSeed * 3.0 + uTime * 0.05);
  p.z += (n - 0.5) * uDisp;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
