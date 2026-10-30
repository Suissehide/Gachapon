// Capsule astrale : la nébuleuse est échantillonnée en espace objet (direction
// depuis le centre de la sphère) — pas de couture d'UV, et les deux coques
// (hémisphères séparés) partagent le même matériau sans se raccorder à la main.
varying vec3 vObj;
varying vec3 vNormal;
varying vec3 vViewPos;

void main() {
  vObj = position;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
