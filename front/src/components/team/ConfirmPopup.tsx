import type React from 'react'
import { useTranslation } from 'react-i18next'

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
  // ReactNode so callers can pass formatted blocks (chips, lists, icons),
  // not just plain text.
  description: React.ReactNode
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
  confirmLabel,
  onConfirm,
}: ConfirmPopupProps) {
  const { t } = useTranslation('team')
  return (
    <Popup open={open} onOpenChange={onOpenChange}>
      <PopupContent>
        <PopupHeader>
          <PopupTitle icon={icon}>{title}</PopupTitle>
        </PopupHeader>
        <PopupBody>
          {typeof description === 'string' ? (
            <p className="text-sm text-text-light">{description}</p>
          ) : (
            description
          )}
        </PopupBody>
        <PopupFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmLabel ?? t('actions.confirm')}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
