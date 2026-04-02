import type { SkillBranchWithNodes } from '../../infra/orm/repositories/skill-tree.repository.interface'
import type { UserSkill } from '../../../../generated/client'

export type SkillTreeState = {
  branches: SkillBranchWithNodes[]
  userSkills: UserSkill[]
  skillPoints: number
  totalInvested: number
  resetCost: number
}

export type InvestResult = {
  nodeId: string
  newLevel: number
  skillPoints: number
}

export type ResetResult = {
  skillPoints: number
  dustSpent: number
}

export interface ISkillTreeDomain {
  getState(userId: string): Promise<SkillTreeState>
}

export interface ISkillInvestDomain {
  invest(userId: string, nodeId: string): Promise<InvestResult>
}

export interface ISkillResetDomain {
  reset(userId: string): Promise<ResetResult>
}
