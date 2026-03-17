// front/src/routes/_admin/admin.shop.tsx
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import { AdminDrawer } from '../../components/admin/AdminDrawer'
import { AdminTable } from '../../components/admin/AdminTable'
import { Button } from '../../components/ui/button'
import {
  type AdminShopItem,
  useAdminCreateShopItem,
  useAdminDeleteShopItem,
  useAdminShopItems,
  useAdminUpdateShopItem,
} from '../../queries/useAdminShop'

export const Route = createFileRoute('/_admin/admin/shop')({
  component: AdminShop,
})

function AdminShop() {
  const { data, isLoading } = useAdminShopItems()
  const updateItem = useAdminUpdateShopItem()
  const deleteItem = useAdminDeleteShopItem()
  const createItem = useAdminCreateShopItem()
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<AdminShopItem | null>(null)

  const [form, setForm] = useState({ name: '', description: '', type: 'TOKEN_PACK', dustCost: 0, value: '{}', isActive: true })

  const columns = [
    { key: 'name', header: 'Nom' },
    { key: 'type', header: 'Type' },
    { key: 'dustCost', header: 'Coût (dust)' },
    { key: 'isActive', header: 'Actif', render: (item: AdminShopItem) => (
      <button onClick={(e) => { e.stopPropagation(); updateItem.mutate({ id: item.id, isActive: !item.isActive }) }}
        className={`rounded-full px-2 py-0.5 text-xs font-bold ${item.isActive ? 'bg-green-500/20 text-green-400' : 'bg-border text-text-light'}`}>
        {item.isActive ? 'Actif' : 'Inactif'}
      </button>
    )},
    { key: 'actions', header: '', render: (item: AdminShopItem) => (
      <Button size="sm" variant="ghost" className="text-red-400"
        onClick={(e) => { e.stopPropagation(); deleteItem.mutate(item.id) }}>
        Supprimer
      </Button>
    )},
  ]

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-text">Boutique</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="mr-1 h-4 w-4" />Nouvel item</Button>
      </div>
      <AdminTable columns={columns} rows={data?.items ?? []} isLoading={isLoading} onRowClick={(item) => setEditItem(item)} />

      <AdminDrawer open={showCreate} onClose={() => setShowCreate(false)} title="Créer un item">
        <div className="space-y-3">
          {(['name', 'description'] as const).map((field) => (
            <input key={field} placeholder={field} value={form[field]}
              onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
          ))}
          <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text">
            {['TOKEN_PACK','BOOST','COSMETIC'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <input type="number" placeholder="Coût dust" value={form.dustCost}
            onChange={(e) => setForm(f => ({ ...f, dustCost: Number(e.target.value) }))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
          <textarea placeholder='Value JSON ex: {"tokens":3}' value={form.value}
            onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text font-mono" rows={3} />
          <Button className="w-full" onClick={() => {
            createItem.mutate({ ...form, value: JSON.parse(form.value) })
            setShowCreate(false)
          }}>Créer</Button>
        </div>
      </AdminDrawer>

      <AdminDrawer open={!!editItem} onClose={() => setEditItem(null)} title={editItem?.name ?? ''}>
        {editItem && (
          <div className="space-y-3">
            <input placeholder="Nom" defaultValue={editItem.name}
              onChange={(e) => setEditItem(s => s ? { ...s, name: e.target.value } : s)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
            <input placeholder="Description" defaultValue={editItem.description}
              onChange={(e) => setEditItem(s => s ? { ...s, description: e.target.value } : s)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
            <select value={editItem.type} onChange={(e) => setEditItem(s => s ? { ...s, type: e.target.value } : s)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text">
              {['TOKEN_PACK','BOOST','COSMETIC'].map((t) => <option key={t}>{t}</option>)}
            </select>
            <input type="number" value={editItem.dustCost}
              onChange={(e) => setEditItem(s => s ? { ...s, dustCost: Number(e.target.value) } : s)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => {
                updateItem.mutate({ id: editItem.id, name: editItem.name, description: editItem.description, type: editItem.type, dustCost: editItem.dustCost })
                setEditItem(null)
              }}>Sauvegarder</Button>
              <Button variant="ghost" className="flex-1 border border-red-500/30 text-red-400"
                onClick={() => { deleteItem.mutate(editItem.id); setEditItem(null) }}>
                Supprimer
              </Button>
            </div>
          </div>
        )}
      </AdminDrawer>
    </div>
  )
}
