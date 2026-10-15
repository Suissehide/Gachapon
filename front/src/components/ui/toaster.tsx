import { Check, Info, Shrimp, TriangleAlert, X } from 'lucide-react'

import { TOAST_SEVERITY } from '../../constants/ui.constant.ts'
import { useToast } from '../../hooks/useToast.ts'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastIcon,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast.tsx'

export function Toaster() {
  const { toasts } = useToast()

  function getVariantFromSeverity(severity?: string) {
    switch (severity) {
      case TOAST_SEVERITY.SUCCESS:
        return 'success'
      case TOAST_SEVERITY.ERROR:
        return 'destructive'
      case TOAST_SEVERITY.WARNING:
        return 'warning'
      case TOAST_SEVERITY.INFO:
        return 'info'
      default:
        return 'default'
    }
  }

  function getIconFromSeverity(severity?: string) {
    switch (severity) {
      case TOAST_SEVERITY.SUCCESS:
        return <Check strokeWidth={2.5} className="h-4 w-4" />
      case TOAST_SEVERITY.ERROR:
        return <X strokeWidth={2.5} className="h-4 w-4" />
      case TOAST_SEVERITY.WARNING:
        return <TriangleAlert strokeWidth={2.25} className="h-4 w-4" />
      case TOAST_SEVERITY.INFO:
        return <Info strokeWidth={2.25} className="h-4 w-4" />
      default:
        return <Shrimp strokeWidth={2.25} className="h-4 w-4" />
    }
  }

  return (
    <ToastProvider>
      {toasts.map(({ id, title, message, severity, action, ...props }) => (
        <Toast key={id} {...props}>
          <ToastIcon variant={getVariantFromSeverity(severity)}>
            {getIconFromSeverity(severity)}
          </ToastIcon>
          <div className="min-w-0 flex-1 self-center">
            {title && <ToastTitle>{title}</ToastTitle>}
            {message && <ToastDescription>{message}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
