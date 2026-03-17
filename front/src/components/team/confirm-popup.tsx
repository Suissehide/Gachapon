import React from 'react'

import { Button } from '../ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'

interface ConfirmPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  icon?: React.ReactNode
  confirmLabel?: string
  onConfirm: () => void
}

export function ConfirmPopup({
  open,
  onOpenChange,
  title,
  description,
  icon,
  confirmLabel = 'Confirmer',
  onConfirm,
}: ConfirmPopupProps) {
  return (
    <Popup open={open} onOpenChange={onOpenChange}>
      <PopupContent>
        <PopupHeader>
          <PopupTitle icon={icon}>{title}</PopupTitle>
        </PopupHeader>
        <PopupBody>
          <p className="text-sm text-text-light">{description}</p>
        </PopupBody>
        <PopupFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
