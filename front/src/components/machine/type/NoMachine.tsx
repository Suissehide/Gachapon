export function NoMachine() {
  return (
    <div className="relative flex h-[320px] w-[320px] items-center justify-center">
      {/* Rings */}
      <div className="absolute h-36 w-36 rounded-full border-2 border-primary/10 [animation:spin_25s_linear_infinite]" />
      <div className="absolute h-56 w-56 rounded-full border border-primary/7 [animation:spin_40s_linear_infinite_reverse]" />
      <div className="absolute h-72 w-72 rounded-full border border-secondary/5 [animation:spin_60s_linear_infinite]" />
      {/* Subtle dashes on outer ring */}
      <div
        className="absolute h-[300px] w-[300px] rounded-full"
        style={{
          border: '1px dashed',
          borderColor: 'color-mix(in srgb, var(--primary) 8%, transparent)',
          animation: 'spin 80s linear infinite reverse',
        }}
      />
      {/* Central mystery orb */}
      <div className="glow-pulse relative flex h-28 w-28 items-center justify-center rounded-full border border-primary/15 bg-linear-to-br from-primary/8 to-secondary/8">
        <span className="font-display text-5xl font-black text-primary/20 select-none">
          ?
        </span>
      </div>
    </div>
  )
}
