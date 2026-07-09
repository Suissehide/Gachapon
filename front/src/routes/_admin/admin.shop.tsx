import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import { CreateShopItemSheet } from '../../components/admin/shop/CreateShopItemSheet'
import { EditShopItemSheet } from '../../components/admin/shop/EditShopItemSheet'
import { useShopColumns } from '../../components/admin/shop/ShopColumns'
import { ReactTable } from '../../components/table/reactTable'
import { Button } from '../../components/ui/button'
import type { ShopCurrency } from '../../constants/shop.constant'
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

  const columns = useShopColumns(setEditItem)

  return (
    <div className="flex h-screen flex-col p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-text">Boutique</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Nouvel item
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-text-light">
            Chargement…
          </div>
        ) : (
          <ReactTable
            columns={columns}
            data={data?.items ?? []}
            filterId="admin-shop"
          />
        )}
      </div>

      <CreateShopItemSheet
        open={showCreate}
        onOpenChange={(o) => !o && setShowCreate(false)}
        onCreate={(item) => {
          createItem.mutate({
            ...item,
            currency: item.currency as ShopCurrency,
          })
          setShowCreate(false)
        }}
      />

      <EditShopItemSheet
        item={editItem}
        onOpenChange={(o) => !o && setEditItem(null)}
        onSave={(fields) => {
          if (editItem) {
            updateItem.mutate({
              id: editItem.id,
              ...fields,
              cost: fields.cost ?? 0,
              currency: fields.currency as ShopCurrency,
            })
          }
          setEditItem(null)
        }}
        onDelete={() => {
          if (editItem) {
            deleteItem.mutate(editItem.id)
          }
          setEditItem(null)
        }}
      />
    </div>
  )
}
