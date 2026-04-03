import type { SkillBranch, SkillConfig, SkillEdge, SkillNode, SkillNodeLevel, UserSkill } from '../../../../../generated/client'
import type { UserUpgradeEffects } from '../../../domain/economy/economy.types'

export type SkillNodeWithLevelsAndEdges = SkillNode & {
  levels: SkillNodeLevel[]
  edgesFrom: SkillEdge[]
  edgesTo: SkillEdge[]
}

export type SkillBranchWithNodes = SkillBranch & {
  nodes: SkillNodeWithLevelsAndEdges[]
}

export interface ISkillTreeRepository {
  getEffectsForUser(userId: string): Promise<UserUpgradeEffects>
  getFullTree(): Promise<SkillBranchWithNodes[]>
  getUserSkills(userId: string): Promise<UserSkill[]>
  getSkillConfig(): Promise<SkillConfig>
  upsertUserSkillInTx(tx: any, userId: string, nodeId: string, level: number): Promise<UserSkill>
  deleteUserSkillsInTx(tx: any, userId: string): Promise<void>
  getTotalInvestedPoints(userId: string): Promise<number>
  // Admin CRUD
  createBranch(data: { name: string; description: string; icon: string; color: string; order: number }): Promise<SkillBranch>
  updateBranch(id: string, data: Partial<{ name: string; description: string; icon: string; color: string; order: number }>): Promise<SkillBranch>
  deleteBranch(id: string): Promise<void>
  createNode(data: { branchId: string; name: string; description: string; icon: string; maxLevel: number; effectType: string; posX: number; posY: number; levels: { level: number; effect: number }[] }): Promise<SkillNode>
  updateNode(id: string, data: Partial<{ name: string; description: string; icon: string; maxLevel: number; effectType: string; posX: number; posY: number; levels: { level: number; effect: number }[] }>): Promise<SkillNode>
  deleteNode(id: string): Promise<void>
  createEdge(fromNodeId: string, toNodeId: string, minLevel: number): Promise<SkillEdge>
  deleteEdge(fromNodeId: string, toNodeId: string): Promise<void>
  updateSkillConfig(data: Partial<{ resetCostPerPoint: number }>): Promise<SkillConfig>
}
