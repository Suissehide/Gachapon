// Pulse au sol : ondes concentriques teintées rareté sous la capsule.
uniform vec3 uColor;
uniform float uTime;
uniform float uIntensity;

varying vec2 vUv;

void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;

  float wave = fract(r * 1.7 - uTime * 0.55);
  float ring = pow(1.0 - abs(wave - 0.5) * 2.0, 7.0);
  float fade = smoothstep(1.0, 0.12, r);
  float glow = exp(-r * 2.8) * 0.7;

  float a = (ring * 0.45 + glow) * uIntensity * fade;
  gl_FragColor = vec4(uColor, 1.0) * a;
}
