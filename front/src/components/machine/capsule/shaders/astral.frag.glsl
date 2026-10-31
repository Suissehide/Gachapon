// Capsule astrale (maquette capsule-astrale-v3) :
//   dessus (y > 0) : nébuleuse de jour — ciel, voile doré, nuages lumineux ;
//   dessous (y < 0) : nébuleuse de nuit — violet, rose, bleu sur fond profond ;
//   étoiles qui scintillent des deux côtés, nuages qui dérivent lentement.
// Volontairement bon marché (~24 capsules dans le globe) : bruit de valeur 3D
// à 3 octaves, un seul niveau d'étoiles par grille hachée, éclairage factice.
uniform vec3 uDaySky;
uniform vec3 uDayHaze;
uniform vec3 uDayCloud;
uniform vec3 uDayEmber;
uniform vec3 uNightDeep;
uniform vec3 uNightViolet;
uniform vec3 uNightPink;
uniform vec3 uNightBlue;
uniform vec3 uGold;
// Temps figé à 0 en reduced motion : ni dérive ni scintillement
uniform float uTime;
// Émissif ajouté par-dessus (lueur de la capsule distribuée, teinte du palier)
uniform vec3 uGlow;
uniform float uOpacity;

varying vec3 vObj;
varying vec3 vNormal;
varying vec3 vViewPos;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
      mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x),
      f.y
    ),
    mix(
      mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
      mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0)), f.x),
      f.y
    ),
    f.z
  );
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

// Étoiles : une étoile possible par cellule d'une grille 3D posée sur la
// direction ; `density` = part des cellules allumées. Scintillement 0.25 → 1
// (comme l'opacité de la maquette), phase propre à chaque étoile.
float stars(vec3 d, float scale, float density) {
  vec3 p = d * scale;
  vec3 cell = floor(p);
  float h = hash(cell);
  if (h > density) {
    return 0.0;
  }
  vec3 jitter = vec3(hash(cell + 11.0), hash(cell + 23.0), hash(cell + 37.0)) - 0.5;
  float dist = length(fract(p) - 0.5 - jitter * 0.5);
  float core = 1.0 - smoothstep(0.0, 0.14, dist);
  float twinkle = 0.25 + 0.75 * (0.5 + 0.5 * sin(uTime * 3.5 + h * 60.0));
  return core * twinkle;
}

// Tache de nébuleuse : bruit seuillé, renvoie un masque doux 0..1
float nebula(vec3 p, float lo, float hi) {
  return smoothstep(lo, hi, fbm(p));
}

void main() {
  vec3 d = normalize(vObj);
  // Dérive lente en aller-retour (~25 s), comme `drift` de la maquette
  vec3 drift = vec3(sin(uTime * 0.25) * 0.25, sin(uTime * 0.19) * 0.08, cos(uTime * 0.23) * 0.25);
  vec3 q = d * 2.4 + drift;

  vec3 col;
  float star;
  if (d.y >= 0.0) {
    // Jour : voile doré près de la bande → ciel en haut
    col = mix(uDayHaze, mix(uDaySky, uDayCloud, 0.35), smoothstep(0.0, 0.35, d.y));
    col = mix(col, uDaySky, smoothstep(0.35, 0.95, d.y));
    col = mix(col, uGold, nebula(q + vec3(5.2), 0.5, 0.75) * 0.6);
    col = mix(col, uDayEmber, nebula(q + vec3(9.7), 0.55, 0.8) * 0.45 * (1.0 - d.y));
    col = mix(col, uDayCloud, nebula(q * 1.3, 0.45, 0.72) * 0.6);
    star = stars(d, 9.0, 0.12);
    col += star * uDayCloud * 1.4;
  } else {
    // Nuit : indigo près de la bande → fond très sombre en bas
    float depth = -d.y;
    col = mix(mix(uNightDeep, uNightBlue, 0.18), uNightDeep * 0.35, smoothstep(0.0, 0.9, depth));
    col = mix(col, uNightViolet, nebula(q, 0.42, 0.72) * 0.75);
    col = mix(col, uNightPink, nebula(q + vec3(3.1), 0.5, 0.78) * 0.5);
    col = mix(col, uNightBlue, nebula(q + vec3(7.4), 0.55, 0.8) * 0.35);
    star = stars(d, 11.0, 0.18);
    col += star * mix(vec3(1.0), uNightViolet, 0.15) * 1.6;
  }

  // Éclairage factice : capsule « auto-lumineuse », juste un modelé doux,
  // le reflet brillant de la maquette (haut-gauche) et un liseré doré.
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 v = normalize(-vViewPos);
  vec3 l = normalize(vec3(-0.5, 0.7, 0.6));
  float diffuse = 0.72 + 0.28 * max(dot(n, l), 0.0);
  float spec = pow(max(dot(reflect(-l, n), v), 0.0), 48.0) * 0.7;
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.35;

  col = col * diffuse + spec + rim * uGold + uGlow;
  // Intérieur de la coque (visible à l'ouverture) : assombri
  if (!gl_FrontFacing) {
    col *= 0.45;
  }

  gl_FragColor = vec4(col, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
