// front/src/components/profile/arcade/ArcadeBackground.tsx
export function ArcadeBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 18% 22%, rgba(251, 191, 36, 0.18), transparent 55%),
            radial-gradient(circle at 80% 12%, rgba(139, 92, 246, 0.14), transparent 55%),
            radial-gradient(circle at 50% 90%, rgba(236, 72, 153, 0.10), transparent 55%)
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-[.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(27,23,38,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(27,23,38,.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
        }}
      />
    </div>
  )
}
