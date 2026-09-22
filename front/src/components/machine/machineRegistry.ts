import type { LucideIcon } from 'lucide-react'
import { CircleOff, Cog, GripVertical } from 'lucide-react'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'

import i18n from '../../i18n/index.ts'
import { ClawMachine } from './type/ClawMachine'
import { GashaponMachine } from './type/GashaponMachine'

export type MachineHandle = {
  startAnimation: () => Promise<void>
}

export type MachineDefinition = {
  id: string
  name: string
  component: ForwardRefExoticComponent<RefAttributes<MachineHandle>> | null
  price: number
  icon: LucideIcon
  description: string
}

// 'none' is always available (free), no animation
// Libellés résolus une fois au chargement du module : sûr ici parce que
// `useLocale().switchTo` fait toujours un rechargement dur de la page (voir
// `i18n/useLocale.ts`), donc ce module est réévalué à chaque changement de
// langue. Même motif que `constants/card.constant.ts` et `libs/rarity.ts`.
export const MACHINE_REGISTRY: MachineDefinition[] = [
  {
    id: 'none',
    name: i18n.t('machine:registry.none.name'),
    component: null,
    price: 0,
    icon: CircleOff,
    description: i18n.t('machine:registry.none.description'),
  },
  {
    id: 'gashapon',
    name: i18n.t('machine:registry.gashapon.name'),
    component: GashaponMachine as ForwardRefExoticComponent<
      RefAttributes<MachineHandle>
    >,
    price: 500,
    icon: Cog,
    description: i18n.t('machine:registry.gashapon.description'),
  },
  {
    id: 'claw',
    name: i18n.t('machine:registry.claw.name'),
    component: ClawMachine as ForwardRefExoticComponent<
      RefAttributes<MachineHandle>
    >,
    price: 1500,
    icon: GripVertical,
    description: i18n.t('machine:registry.claw.description'),
  },
]

export function getMachineById(id: string): MachineDefinition | undefined {
  return MACHINE_REGISTRY.find((m) => m.id === id)
}
