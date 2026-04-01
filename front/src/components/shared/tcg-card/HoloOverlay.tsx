import holoTexture from '../../../assets/data/holo.png'
import sparklesGif from '../../../assets/data/sparkles.gif'

type Props = {
  active: boolean
}

export function HoloOverlay({ active }: Props) {
  return (
    <>
      {/* Base: subtle darkening so color-dodge is visible on light card backgrounds */}
      <div
        className={`pointer-events-none absolute inset-0 z-[2] bg-[#0a0a1a] mix-blend-multiply transition-opacity duration-100 ${
          active ? 'opacity-[0.15]' : 'opacity-[0.18]'
        }`}
      />

      {/* Prismatic gradient — idle: hue cycles infinitely + circular spatial drift, hover: mouse-driven via CSS vars */}
      <div
        className={`pointer-events-none absolute inset-0 z-[3] mix-blend-color-dodge [background-size:300%_300%] ${
          active
            ? '[animation:none] opacity-[0.88] [filter:brightness(0.66)_contrast(1.33)]'
            : 'opacity-[0.85] [animation:holoColor_5s_linear_infinite,holoDrift_12s_linear_infinite]'
        }`}
        style={{
          backgroundImage:
            'linear-gradient(115deg, transparent 0%, rgb(0,231,255) 25%, transparent 47%, transparent 53%, rgb(255,0,231) 75%, transparent 100%)',
          ...(active
            ? { backgroundPosition: 'calc(var(--holo-lp, 50) * 1%) calc(var(--holo-tp, 50) * 1%)' }
            : {}),
        }}
      />

      {/* Sparkles + holo texture + rainbow — idle: offset hue cycle + counter-drift, hover: mouse-driven via CSS vars */}
      <div
        className={`pointer-events-none absolute inset-0 z-[4] mix-blend-color-dodge bg-blend-overlay [background-size:160%] ${
          active
            ? '[animation:none] [filter:brightness(1)_contrast(1)]'
            : 'opacity-[0.7] [animation:holoColorReverse_7s_linear_infinite,holoSweep_25s_linear_infinite]'
        }`}
        style={{
          backgroundImage: `url('${sparklesGif}'), url('${holoTexture}'), linear-gradient(125deg, rgba(255,0,132,0.31) 15%, rgba(252,164,0,0.25) 30%, rgba(255,255,0,0.19) 40%, rgba(0,255,138,0.13) 60%, rgba(0,207,255,0.25) 70%, rgba(204,76,250,0.31) 85%)`,
          ...(active
            ? {
                backgroundPosition: 'calc(var(--holo-px, 50) * 1%) calc(var(--holo-py, 50) * 1%)',
                opacity: 'var(--holo-opc, 0.5)' as unknown as number,
              }
            : {}),
        }}
      />
    </>
  )
}
