import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type SkillNodeLevel = { nodeId: string; level: number; effect: number }
export type SkillEdge = { fromNodeId: string; toNodeId: string; minLevel: number }
export type SkillNode = {
  id: string
  branchId: string
  name: string
  description: string
  icon: string
  maxLevel: number
  effectType: string
  posX: number
  posY: number
  levels: SkillNodeLevel[]
  edgesFrom: SkillEdge[]
  edgesTo: SkillEdge[]
}
export type SkillBranch = {
  id: string
  name: string
  description: string
  icon: string
  color: string
  order: number
  nodes: SkillNode[]
}
export type SkillTreeState = {
  branches: SkillBranch[]
  userSkills: { userId: string; nodeId: string; level: number }[]
  skillPoints: number
  totalInvested: number
  resetCost: number
}
export type SkillConfig = { id: number; resetCostPerPoint: number }

export const SkillsApi = {
  getState: async (): Promise<SkillTreeState> => {
    const res = await fetchWithAuth(`${apiUrl}/skills`)
    if (!res.ok) handleHttpError(res, {}, "Erreur lors du chargement de l'arbre de compétences")
    return res.json()
  },

  invest: async (nodeId: string): Promise<{ nodeId: string; newLevel: number; skillPoints: number }> => {
    const res = await fetchWithAuth(`${apiUrl}/skills/${nodeId}/invest`, { method: 'POST' })
    if (!res.ok) handleHttpError(res, {}, "Erreur lors de l'investissement")
    return res.json()
  },

  reset: async (): Promise<{ skillPoints: number; dustSpent: number }> => {
    const res = await fetchWithAuth(`${apiUrl}/skills/reset`, { method: 'POST' })
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors du reset')
    return res.json()
  },

  // Admin
  adminGetTree: async (): Promise<SkillBranch[]> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/skills/tree`)
    if (!res.ok) handleHttpError(res, {}, "Erreur lors du chargement de l'arbre")
    return res.json()
  },

  adminGetConfig: async (): Promise<SkillConfig> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/skills/config`)
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors du chargement de la config')
    return res.json()
  },

  adminUpdateConfig: async (data: Partial<SkillConfig>): Promise<SkillConfig> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/skills/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la mise à jour de la config')
    return res.json()
  },

  adminCreateBranch: async (data: Omit<SkillBranch, 'id' | 'nodes'>): Promise<SkillBranch> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/skills/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la création de la branche')
    return res.json()
  },

  adminUpdateBranch: async (id: string, data: Partial<SkillBranch>): Promise<SkillBranch> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/skills/branches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la mise à jour de la branche')
    return res.json()
  },

  adminDeleteBranch: async (id: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/skills/branches/${id}`, { method: 'DELETE' })
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la suppression de la branche')
  },

  adminCreateNode: async (data: Omit<SkillNode, 'id' | 'edgesFrom' | 'edgesTo'>): Promise<SkillNode> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/skills/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la création du nœud')
    return res.json()
  },

  adminUpdateNode: async (id: string, data: Partial<SkillNode>): Promise<SkillNode> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/skills/nodes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la mise à jour du nœud')
    return res.json()
  },

  adminDeleteNode: async (id: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/skills/nodes/${id}`, { method: 'DELETE' })
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la suppression du nœud')
  },

  adminCreateEdge: async (data: SkillEdge): Promise<SkillEdge> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/skills/edges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la création de la connexion')
    return res.json()
  },

  adminDeleteEdge: async (fromNodeId: string, toNodeId: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/skills/edges/${fromNodeId}/${toNodeId}`, {
      method: 'DELETE',
    })
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la suppression de la connexion')
  },
}
