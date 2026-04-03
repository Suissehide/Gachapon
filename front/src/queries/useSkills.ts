import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SkillsApi } from '../api/skills.api.ts'

const SKILLS_KEY = ['skills'] as const
const ADMIN_SKILLS_KEY = ['admin', 'skills'] as const

export const useSkillTree = () =>
  useQuery({ queryKey: SKILLS_KEY, queryFn: SkillsApi.getState })

export const useInvestSkill = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nodeId: string) => SkillsApi.invest(nodeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: SKILLS_KEY }),
  })
}

export const useResetSkills = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: SkillsApi.reset,
    onSuccess: () => qc.invalidateQueries({ queryKey: SKILLS_KEY }),
  })
}

export const useAdminSkillTree = () =>
  useQuery({ queryKey: ADMIN_SKILLS_KEY, queryFn: SkillsApi.adminGetTree })

export const useAdminSkillConfig = () =>
  useQuery({ queryKey: [...ADMIN_SKILLS_KEY, 'config'], queryFn: SkillsApi.adminGetConfig })

export const useAdminUpdateConfig = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: SkillsApi.adminUpdateConfig,
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_SKILLS_KEY }),
  })
}

export const useAdminCreateNode = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: SkillsApi.adminCreateNode,
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_SKILLS_KEY }),
  })
}

export const useAdminUpdateNode = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof SkillsApi.adminUpdateNode>[1] }) =>
      SkillsApi.adminUpdateNode(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_SKILLS_KEY }),
  })
}

export const useAdminDeleteNode = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: SkillsApi.adminDeleteNode,
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_SKILLS_KEY }),
  })
}

export const useAdminCreateEdge = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: SkillsApi.adminCreateEdge,
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_SKILLS_KEY }),
  })
}

export const useAdminDeleteEdge = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fromNodeId, toNodeId }: { fromNodeId: string; toNodeId: string }) =>
      SkillsApi.adminDeleteEdge(fromNodeId, toNodeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_SKILLS_KEY }),
  })
}
