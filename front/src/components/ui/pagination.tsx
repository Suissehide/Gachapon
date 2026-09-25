import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '../../libs/utils.ts'
import { Button } from './button.tsx'

interface PaginationProps {
  /** Page affichée, base 1. */
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  className?: string
}

/**
 * Pagination précédent / suivant pour une liste paginée côté serveur. Ne
 * s'affiche pas quand tout tient sur une page : une barre qui ne mène nulle
 * part n'est que du bruit.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
}: PaginationProps) {
  const { t } = useTranslation('common')
  if (pageCount <= 1) {
    return null
  }
  return (
    <nav
      aria-label={t('pagination.ariaLabel')}
      className={cn('flex items-center justify-center gap-2', className)}
    >
      <Button
        variant="pill"
        size="pill"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label={t('pagination.previous')}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[88px] text-center font-mono text-[12px] tabular-nums text-text-light">
        {t('pagination.pageOf', { page, pageCount })}
      </span>
      <Button
        variant="pill"
        size="pill"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        aria-label={t('pagination.next')}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  )
}
