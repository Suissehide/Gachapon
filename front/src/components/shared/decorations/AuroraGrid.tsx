// AuroraGrid — décor de fond partagé pour toutes les pages « Arcade clair »
// (profil, succès, classement, collection, …). Reprend la spec du handoff :
//   • Trois halos radiaux ambré / violet / rose ancrés en haut.
//   • Un quadrillage 32×32 px très discret masqué en ovale vers le haut.
//
// Le composant est `absolute inset-0 -z-10 pointer-events-none` pour pouvoir
// être posé directement à l'intérieur d'un parent `relative` (cf. PageShell).

export function AuroraGrid() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(40% 35% at 12% 4%, rgba(245,158,11,0.16), transparent 70%),
            radial-gradient(35% 30% at 90% 8%, rgba(139,92,246,0.13), transparent 70%),
            radial-gradient(45% 30% at 55% 0%, rgba(236,72,153,0.10), transparent 70%)
          `,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(27,23,38,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(27,23,38,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage:
            'radial-gradient(ellipse at 50% 12%, black 22%, transparent 60%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at 50% 12%, black 22%, transparent 60%)',
        }}
      />
    </div>
  )
}
