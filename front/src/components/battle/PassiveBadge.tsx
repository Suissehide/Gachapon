const PASSIVE_LABELS: Record<string, string> = {
  VAMPIRISM: 'Vampirisme',
  AEGIS: 'Égide',
  BANNER: 'Bannière',
  RIPOSTE: 'Riposte',
  REBIRTH: 'Renaissance',
  EXECUTION: 'Exécution',
  VIGOR: 'Vigueur',
  HASTE: 'Célérité',
  FORTIFY: 'Fortification',
  EMPOWER: 'Puissance',
  BULWARK: 'Bouclier',
  FURY: 'Furie',
  CRIT: 'Précision',
  PIERCE: 'Perce-armure',
  NEMESIS: 'Vengeance',
  RAMPART: 'Rempart',
  REGEN: 'Régénération',
  BLESSING: 'Bénédiction',
  SANCTUARY: 'Sanctuaire',
  BURN: 'Brûlure',
  POISON: 'Poison',
  BLOODLUST: 'Soif de sang',
}

type Props = {
  passiveKey: string
}

export function PassiveBadge({ passiveKey }: Props) {
  const label = PASSIVE_LABELS[passiveKey] ?? passiveKey
  return (
    <span className="pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 animate-[floatUp_900ms_ease-out_forwards] rounded-full border border-amber-400/40 bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">
      ✨ {label}
    </span>
  )
}
