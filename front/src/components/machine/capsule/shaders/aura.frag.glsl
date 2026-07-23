// Aura-tease derrière la capsule : halo respirant + rayons rotatifs +
// cyclage de teinte prismatique pour les hauts paliers. Rendu en additif.
uniform vec3 uColor;
uniform vec3 uColorOuter;
uniform float uTime;
uniform float uIntensity;
uniform float uRays;
uniform float uHueCycle;
uniform float uContract;

varying vec2 vUv;

vec3 hueShift(vec3 color, float a) {
  const vec3 k = vec3(0.57735);
  float c = cos(a);
  return color * c + cross(k, color) * sin(a) + k * dot(k, color) * (1.0 - c);
}

void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float ang = atan(p.y, p.x);

  // Halo central, contracté pendant l'inhale (la lumière est aspirée)
  float halo = exp(-r * (2.6 + uContract * 6.0));
  float breathe = 0.85 + 0.15 * sin(uTime * 3.2);

  // Anneau discret qui se resserre avec l'inhale
  float ringR = 0.62 - uContract * 0.35;
  float ring = smoothstep(0.16, 0.0, abs(r - ringR)) * 0.3;

  // Rayons rotatifs (hauts paliers)
  float rays = pow(abs(sin(ang * 7.0 + uTime * 0.9)), 10.0)
    * smoothstep(1.15, 0.12, r);

  vec3 col = mix(uColorOuter, uColor, clamp(halo * 1.6, 0.0, 1.0));
  if (uHueCycle > 0.5) {
    col = hueShift(col, uTime * 2.0 + r * 4.0);
  }

  // Fondu global vers 0 bien avant le bord du plan — sans lui le halo se
  // coupe net et dessine un carré.
  float edge = smoothstep(1.0, 0.68, r);

  float a = (halo * breathe * uIntensity
    + rays * uRays * uIntensity * 0.55
    + ring * uIntensity) * edge;
  gl_FragColor = vec4(col, 1.0) * a;
}
