import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import {
  branchIdParamSchema,
  createBranchSchema,
  createEdgeSchema,
  createNodeSchema,
  edgeParamSchema,
  nodeIdParamSchema,
  updateBranchSchema,
  updateConfigSchema,
  updateNodeSchema,
} from '../../schemas/admin-skills.schema'

export const adminSkillsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { adminSkillTreeDomain } = fastify.iocContainer

  // Tree & config
  fastify.get('/skills/tree', {}, () => adminSkillTreeDomain.getTree())
  fastify.get('/skills/config', {}, () => adminSkillTreeDomain.getConfig())
  fastify.put('/skills/config', { schema: { body: updateConfigSchema } }, (req) =>
    adminSkillTreeDomain.updateConfig(req.body))

  // Branches
  fastify.post('/skills/branches', { schema: { body: createBranchSchema } }, (req) =>
    adminSkillTreeDomain.createBranch(req.body))
  fastify.put('/skills/branches/:id', { schema: { params: branchIdParamSchema, body: updateBranchSchema } }, (req) =>
    adminSkillTreeDomain.updateBranch(req.params.id, req.body))
  fastify.delete('/skills/branches/:id', { schema: { params: branchIdParamSchema } }, (req) =>
    adminSkillTreeDomain.deleteBranch(req.params.id))

  // Nodes
  fastify.post('/skills/nodes', { schema: { body: createNodeSchema } }, (req) =>
    adminSkillTreeDomain.createNode(req.body))
  fastify.put('/skills/nodes/:id', { schema: { params: nodeIdParamSchema, body: updateNodeSchema } }, (req) =>
    adminSkillTreeDomain.updateNode(req.params.id, req.body))
  fastify.delete('/skills/nodes/:id', { schema: { params: nodeIdParamSchema } }, (req) =>
    adminSkillTreeDomain.deleteNode(req.params.id))

  // Edges
  fastify.post('/skills/edges', { schema: { body: createEdgeSchema } }, (req) =>
    adminSkillTreeDomain.createEdge(req.body.fromNodeId, req.body.toNodeId, req.body.minLevel))
  fastify.delete('/skills/edges/:fromNodeId/:toNodeId', { schema: { params: edgeParamSchema } }, (req) =>
    adminSkillTreeDomain.deleteEdge(req.params.fromNodeId, req.params.toNodeId))
}
