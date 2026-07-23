import type { LucideIcon } from 'lucide-react'
import { CircleOff, Cog, GripVertical } from 'lucide-react'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'

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
export const MACHINE_REGISTRY: MachineDefinition[] = [
  {
    id: 'none',
    name: 'Sans machine',
    component: null,
    price: 0,
    icon: CircleOff,
    description: 'Tirage direct sans animation',
  },
  {
    id: 'gashapon',
    name: 'Gashapon',
    component: GashaponMachine as ForwardRefExoticComponent<
      RefAttributes<MachineHandle>
    >,
    price: 500,
    icon: Cog,
    description: 'La machine à capsules classique',
  },
  {
    id: 'claw',
    name: 'Claw Machine',
    component: ClawMachine as ForwardRefExoticComponent<
      RefAttributes<MachineHandle>
    >,
    price: 1500,
    icon: GripVertical,
    description: 'La pince à grappins',
  },
]

export function getMachineById(id: string): MachineDefinition | undefined {
  return MACHINE_REGISTRY.find((m) => m.id === id)
}
