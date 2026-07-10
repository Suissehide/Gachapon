import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { SkillsApi } from '../api/skills.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'
import { useAuthStore } from '../stores/auth.store.ts'

const SKILLS_KEY = ['skills'] as const
const ADMIN_SKILLS_KEY = ['admin', 'skills'] as const

export const useSkillTree = () => {
  const query = useQuery({ queryKey: SKILLS_KEY, queryFn: SkillsApi.getState })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useInvestSkill = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (nodeId: string) => SkillsApi.invest(nodeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SKILLS_KEY })
      void useAuthStore.getState().fetchMe()
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de l'investissement",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useInvestBatch = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (allocations: { nodeId: string; levels: number }[]) =>
      SkillsApi.investBatch(allocations),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SKILLS_KEY })
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      void useAuthStore.getState().fetchMe()
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de l'enregistrement",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useResetSkills = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: SkillsApi.reset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SKILLS_KEY })
      void useAuthStore.getState().fetchMe()
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la réinitialisation',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useAdminSkillTree = () => {
  const query = useQuery({
    queryKey: ADMIN_SKILLS_KEY,
    queryFn: SkillsApi.adminGetTree,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useAdminSkillConfig = () => {
  const query = useQuery({
    queryKey: [...ADMIN_SKILLS_KEY, 'config'],
    queryFn: SkillsApi.adminGetConfig,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useAdminUpdateConfig = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: SkillsApi.adminUpdateConfig,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_SKILLS_KEY })
      qc.invalidateQueries({ queryKey: SKILLS_KEY })
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la mise à jour',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useAdminCreateBranch = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: SkillsApi.adminCreateBranch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_SKILLS_KEY })
      qc.invalidateQueries({ queryKey: SKILLS_KEY })
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la création',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useAdminDeleteBranch = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: SkillsApi.adminDeleteBranch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_SKILLS_KEY })
      qc.invalidateQueries({ queryKey: SKILLS_KEY })
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la suppression',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useAdminUpdateBranch = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Parameters<typeof SkillsApi.adminUpdateBranch>[1]
    }) => SkillsApi.adminUpdateBranch(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_SKILLS_KEY })
      qc.invalidateQueries({ queryKey: SKILLS_KEY })
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la mise à jour',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useAdminCreateNode = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: SkillsApi.adminCreateNode,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_SKILLS_KEY })
      qc.invalidateQueries({ queryKey: SKILLS_KEY })
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la création',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useAdminUpdateNode = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Parameters<typeof SkillsApi.adminUpdateNode>[1]
    }) => SkillsApi.adminUpdateNode(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_SKILLS_KEY })
      qc.invalidateQueries({ queryKey: SKILLS_KEY })
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la mise à jour',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useAdminDeleteNode = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: SkillsApi.adminDeleteNode,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_SKILLS_KEY })
      qc.invalidateQueries({ queryKey: SKILLS_KEY })
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la suppression',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useAdminCreateEdge = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: SkillsApi.adminCreateEdge,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_SKILLS_KEY })
      qc.invalidateQueries({ queryKey: SKILLS_KEY })
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la création',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useAdminDeleteEdge = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({
      fromNodeId,
      toNodeId,
    }: {
      fromNodeId: string
      toNodeId: string
    }) => SkillsApi.adminDeleteEdge(fromNodeId, toNodeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_SKILLS_KEY })
      qc.invalidateQueries({ queryKey: SKILLS_KEY })
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la suppression',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}
