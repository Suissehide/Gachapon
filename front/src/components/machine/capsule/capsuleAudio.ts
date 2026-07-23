import { Howl, Howler } from 'howler'

// Moteur audio du tirage. Deux couches :
//  1. Fichiers réels via Howler s'ils existent dans /audio/gacha/ (voir le
//     README de ce dossier public) — chargés paresseusement à unlock().
//  2. Placeholders synthétisés en WebAudio quand un fichier manque, pour que
//     la séquence sonne dès aujourd'hui sans assets.
// Muet par défaut ; l'état vient de play.tsx (localStorage).

type FileCue =
  | 'clack'
  | 'sting'
  | 'inhale'
  | 'burst'
  | 'fanfare'
  | 'charge'
  | 'coin'
  | 'crank'
  | 'rattle'
  | 'dispense'

const FILE_SOURCES: Record<FileCue, string[]> = {
  clack: ['/audio/gacha/clack.webm', '/audio/gacha/clack.mp3'],
  charge: ['/audio/gacha/charge.webm', '/audio/gacha/charge.mp3'],
  sting: ['/audio/gacha/sting.webm', '/audio/gacha/sting.mp3'],
  inhale: ['/audio/gacha/inhale.webm', '/audio/gacha/inhale.mp3'],
  burst: ['/audio/gacha/burst.webm', '/audio/gacha/burst.mp3'],
  fanfare: ['/audio/gacha/fanfare.webm', '/audio/gacha/fanfare.mp3'],
  coin: ['/audio/gacha/coin.webm', '/audio/gacha/coin.mp3'],
  crank: ['/audio/gacha/crank.webm', '/audio/gacha/crank.mp3'],
  rattle: ['/audio/gacha/rattle.webm', '/audio/gacha/rattle.mp3'],
  dispense: ['/audio/gacha/dispense.webm', '/audio/gacha/dispense.mp3'],
}

// Gamme majeure étendue (demi-tons) pour stings et fanfares
const SCALE = [0, 4, 7, 12, 16, 19, 24, 28]

class CapsuleAudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private muted = true
  private howls = new Map<FileCue, Howl>()
  private filesTried = false
  private noiseBuffer: AudioBuffer | null = null
  private chargeNodes: {
    osc: OscillatorNode
    oscGain: GainNode
    noise: AudioBufferSourceNode
    noiseFilter: BiquadFilterNode
    noiseGain: GainNode
  } | null = null

  setMuted(muted: boolean) {
    this.muted = muted
    Howler.mute(muted)
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(
        muted ? 0 : 0.85,
        this.ctx.currentTime,
        0.02,
      )
    }
  }

  isMuted(): boolean {
    return this.muted
  }

  // À appeler sur un geste utilisateur (clic tirage) — crée/réveille le
  // contexte WebAudio et tente le chargement des fichiers réels une fois.
  unlock() {
    const ctx = this.ensureCtx()
    if (ctx?.state === 'suspended') {
      void ctx.resume()
    }
    if (!this.filesTried) {
      this.filesTried = true
      for (const [cue, src] of Object.entries(FILE_SOURCES) as [
        FileCue,
        string[],
      ][]) {
        const howl = new Howl({
          src,
          preload: true,
          loop: cue === 'charge',
          onloaderror: () => this.howls.delete(cue),
        })
        this.howls.set(cue, howl)
      }
    }
  }

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') {
      return null
    }
    if (!this.ctx) {
      const Ctor = window.AudioContext
      if (!Ctor) {
        return null
      }
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 0.85
      this.master.connect(this.ctx.destination)
    }
    return this.ctx
  }

  private fileHowl(cue: FileCue): Howl | null {
    const howl = this.howls.get(cue)
    return howl && howl.state() === 'loaded' ? howl : null
  }

  private getNoise(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const len = ctx.sampleRate
      this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate)
      const data = this.noiseBuffer.getChannelData(0)
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1
      }
    }
    return this.noiseBuffer
  }

  private playNoise(
    ctx: AudioContext,
    out: AudioNode,
    opts: {
      duration: number
      filterType: BiquadFilterType
      freqFrom: number
      freqTo?: number
      q?: number
      gain: number
      when?: number
    },
  ) {
    const t = ctx.currentTime + (opts.when ?? 0)
    const src = ctx.createBufferSource()
    src.buffer = this.getNoise(ctx)
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = opts.filterType
    filter.frequency.setValueAtTime(opts.freqFrom, t)
    if (opts.freqTo !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(1, opts.freqTo),
        t + opts.duration,
      )
    }
    filter.Q.value = opts.q ?? 1
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(opts.gain, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + opts.duration)
    src.connect(filter).connect(gain).connect(out)
    src.start(t)
    src.stop(t + opts.duration + 0.05)
  }

  private playTone(
    ctx: AudioContext,
    out: AudioNode,
    opts: {
      type: OscillatorType
      freq: number
      freqTo?: number
      duration: number
      gain: number
      when?: number
    },
  ) {
    const t = ctx.currentTime + (opts.when ?? 0)
    const osc = ctx.createOscillator()
    osc.type = opts.type
    osc.frequency.setValueAtTime(opts.freq, t)
    if (opts.freqTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, opts.freqTo),
        t + opts.duration,
      )
    }
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(opts.gain, t + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.001, t + opts.duration)
    osc.connect(gain).connect(out)
    osc.start(t)
    osc.stop(t + opts.duration + 0.05)
  }

  // Claquement mécanique d'un à-coup de shake
  clack() {
    if (this.muted) {
      return
    }
    const file = this.fileHowl('clack')
    if (file) {
      file.play()
      return
    }
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) {
      return
    }
    this.playNoise(ctx, this.master, {
      duration: 0.07,
      filterType: 'bandpass',
      freqFrom: 2100,
      q: 3,
      gain: 0.4,
    })
    this.playTone(ctx, this.master, {
      type: 'square',
      freq: 190,
      freqTo: 90,
      duration: 0.06,
      gain: 0.12,
    })
  }

  // Whir de charge — démarre au début de la vibration, piloté ensuite par
  // setChargeLevel(0..1) à chaque frame.
  startCharge() {
    if (this.muted) {
      return
    }
    const file = this.fileHowl('charge')
    if (file) {
      file.play()
      return
    }
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) {
      return
    }
    this.stopChargeNodes()
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 55
    const oscGain = ctx.createGain()
    oscGain.gain.value = 0.0001
    osc.connect(oscGain).connect(this.master)
    osc.start()

    const noise = ctx.createBufferSource()
    noise.buffer = this.getNoise(ctx)
    noise.loop = true
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 420
    noiseFilter.Q.value = 1.4
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.0001
    noise.connect(noiseFilter).connect(noiseGain).connect(this.master)
    noise.start()

    this.chargeNodes = { osc, oscGain, noise, noiseFilter, noiseGain }
  }

  setChargeLevel(level: number) {
    const nodes = this.chargeNodes
    const ctx = this.ctx
    if (!nodes || !ctx) {
      return
    }
    const t = ctx.currentTime
    nodes.osc.frequency.setTargetAtTime(55 + level * 270, t, 0.05)
    nodes.oscGain.gain.setTargetAtTime(0.02 + level * 0.11, t, 0.05)
    nodes.noiseFilter.frequency.setTargetAtTime(420 + level * 2200, t, 0.05)
    nodes.noiseGain.gain.setTargetAtTime(0.015 + level * 0.1, t, 0.05)
  }

  stopCharge() {
    const file = this.fileHowl('charge')
    if (file) {
      file.stop()
    }
    this.stopChargeNodes()
  }

  private stopChargeNodes() {
    const nodes = this.chargeNodes
    const ctx = this.ctx
    if (!nodes || !ctx) {
      return
    }
    const t = ctx.currentTime
    nodes.oscGain.gain.setTargetAtTime(0.0001, t, 0.05)
    nodes.noiseGain.gain.setTargetAtTime(0.0001, t, 0.05)
    nodes.osc.stop(t + 0.3)
    nodes.noise.stop(t + 0.3)
    this.chargeNodes = null
  }

  // Sting de tease — « c'est de l'or ?! ». Plus le palier est haut, plus
  // l'arpège est long et brillant.
  sting(tier: number) {
    if (this.muted) {
      return
    }
    const file = this.fileHowl('sting')
    if (file) {
      file.play()
      return
    }
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) {
      return
    }
    const notes = SCALE.slice(0, Math.min(1 + tier, SCALE.length))
    const base = 659.25 // E5
    notes.forEach((semi, i) => {
      const freq = base * 2 ** (semi / 12)
      this.playTone(ctx, this.master as GainNode, {
        type: 'sine',
        freq,
        duration: 0.4,
        gain: 0.1 + tier * 0.012,
        when: i * 0.055,
      })
      this.playTone(ctx, this.master as GainNode, {
        type: 'triangle',
        freq: freq * 2,
        duration: 0.25,
        gain: 0.03,
        when: i * 0.055,
      })
    })
  }

  // Aspiration juste avant l'explosion
  inhale() {
    if (this.muted) {
      return
    }
    const file = this.fileHowl('inhale')
    if (file) {
      file.play()
      return
    }
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) {
      return
    }
    this.playNoise(ctx, this.master, {
      duration: 0.35,
      filterType: 'lowpass',
      freqFrom: 3400,
      freqTo: 140,
      gain: 0.22,
    })
    this.playTone(ctx, this.master, {
      type: 'sine',
      freq: 330,
      freqTo: 62,
      duration: 0.32,
      gain: 0.1,
    })
  }

  // Explosion de la capsule + fanfare par palier
  burst(tier: number) {
    if (this.muted) {
      return
    }
    const ctx = this.ensureCtx()
    const fileBurst = this.fileHowl('burst')
    if (fileBurst) {
      fileBurst.play()
    } else if (ctx && this.master) {
      this.playNoise(ctx, this.master, {
        duration: 0.45,
        filterType: 'highpass',
        freqFrom: 260,
        gain: 0.5,
      })
      // Thud d'impact
      this.playTone(ctx, this.master, {
        type: 'sine',
        freq: 150,
        freqTo: 40,
        duration: 0.38,
        gain: 0.5,
      })
      if (tier >= 3) {
        this.playNoise(ctx, this.master, {
          duration: 0.3,
          filterType: 'bandpass',
          freqFrom: 6200,
          q: 2,
          gain: 0.18,
        })
      }
    }

    const fileFanfare = this.fileHowl('fanfare')
    if (fileFanfare) {
      fileFanfare.play()
      return
    }
    if (!ctx || !this.master) {
      return
    }
    const notes = SCALE.slice(0, Math.min(2 + tier, SCALE.length))
    const base = 523.25 // C5
    notes.forEach((semi, i) => {
      const freq = base * 2 ** (semi / 12)
      this.playTone(ctx, this.master as GainNode, {
        type: 'triangle',
        freq,
        duration: 0.55,
        gain: 0.12 + tier * 0.015,
        when: 0.14 + i * 0.08,
      })
      this.playTone(ctx, this.master as GainNode, {
        type: 'sine',
        freq: freq * 2,
        duration: 0.4,
        gain: 0.04,
        when: 0.14 + i * 0.08,
      })
    })
  }

  // ── Cues machine (phase machine-anim) ────────────────────────────────────

  // Pièce insérée : deux tintements métalliques + petit choc dans la fente
  coin() {
    if (this.muted) {
      return
    }
    const file = this.fileHowl('coin')
    if (file) {
      file.play()
      return
    }
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) {
      return
    }
    this.playTone(ctx, this.master, {
      type: 'triangle',
      freq: 2400,
      duration: 0.09,
      gain: 0.12,
    })
    this.playTone(ctx, this.master, {
      type: 'triangle',
      freq: 3100,
      duration: 0.12,
      gain: 0.09,
      when: 0.07,
    })
    this.playNoise(ctx, this.master, {
      duration: 0.08,
      filterType: 'bandpass',
      freqFrom: 1500,
      q: 2,
      gain: 0.18,
      when: 0.22,
    })
  }

  // Cran du crank : clac mécanique plus grave que le clack de capsule
  crank() {
    if (this.muted) {
      return
    }
    const file = this.fileHowl('crank')
    if (file) {
      file.play()
      return
    }
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) {
      return
    }
    this.playNoise(ctx, this.master, {
      duration: 0.09,
      filterType: 'bandpass',
      freqFrom: 900,
      q: 2.5,
      gain: 0.42,
    })
    this.playTone(ctx, this.master, {
      type: 'square',
      freq: 130,
      freqTo: 70,
      duration: 0.07,
      gain: 0.14,
    })
  }

  // Brassage des capsules : rafale de petits chocs plastiques
  rattle() {
    if (this.muted) {
      return
    }
    const file = this.fileHowl('rattle')
    if (file) {
      file.play()
      return
    }
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) {
      return
    }
    for (let i = 0; i < 7; i++) {
      this.playNoise(ctx, this.master, {
        duration: 0.05,
        filterType: 'bandpass',
        freqFrom: 1400 + Math.random() * 1400,
        q: 3,
        gain: 0.14 + Math.random() * 0.1,
        when: i * 0.09 + Math.random() * 0.04,
      })
    }
  }

  // Capsule éjectée : trappe + thud d'arrivée
  dispense() {
    if (this.muted) {
      return
    }
    const file = this.fileHowl('dispense')
    if (file) {
      file.play()
      return
    }
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) {
      return
    }
    this.playNoise(ctx, this.master, {
      duration: 0.1,
      filterType: 'bandpass',
      freqFrom: 700,
      q: 1.5,
      gain: 0.3,
    })
    this.playTone(ctx, this.master, {
      type: 'sine',
      freq: 220,
      freqTo: 70,
      duration: 0.22,
      gain: 0.3,
      when: 0.12,
    })
  }

  // Coupe tout ce qui boucle (démontage de la scène / abandon du tirage)
  stopAll() {
    this.stopCharge()
  }
}

export const capsuleAudio = new CapsuleAudioEngine()
