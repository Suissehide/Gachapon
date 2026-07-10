import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Coins, Layers, LogOut, Sparkles, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useCombatPoints } from '../../queries/useCombatPoints.ts'
import { useTokenBalance } from '../../queries/useGacha.ts'
import type { AuthUser } from '../../stores/auth.store'
import { useAuthStore } from '../../stores/auth.store'
import { NotificationDot } from '../notifications/NotificationDot.tsx'
import { NotificationsBadge } from '../notifications/NotificationsBadge.tsx'
import { RewardsBadge } from '../rewards/RewardsBadge.tsx'
import { Button } from '../ui/button.tsx'
import {
  CapsuleIcon,
  MobileMenuShell,
  MobileNavLink,
  useMobileMenu,
} from './MobileMenu.tsx'

const navItemsBeforeProfile = [
  { to: '/play', label: 'Jouer' },
  { to: '/collection', label: 'Collection' },
  { to: '/campaign', label: 'Campagne' },
  { to: '/skills', label: 'Compétences' },
] as const

const navItemsAfterProfile = [
  { to: '/shop', label: 'Boutique' },
  { to: '/leaderboard', label: 'Classement' },
  { to: '/team', label: 'Équipes' },
] as const

const navItems = [...navItemsBeforeProfile, ...navItemsAfterProfile]

const tabClass =
  'relative whitespace-nowrap px-[18px] pt-[15px] pb-[14px] text-[15.5px] font-semibold text-text-light/70 transition-colors hover:text-text [&.active]:text-primary-dark [&.active>span]:bg-linear-to-r [&.active>span]:from-primary [&.active>span]:to-secondary'

export function Navbar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { menuOpen, setMenuOpen, closeMenu } = useMobileMenu()

  const handleLogout = async () => {
    await logout()
    await navigate({ to: '/' })
  }

  return (
    <>
      <nav className="fixed top-0 z-50 w-full border-b border-border bg-background">
        {/* Mobile / tablet bar — single compact row */}
        <div className="flex h-16 items-center justify-between gap-3 px-6 lg:hidden">
          <BrandLink onClick={closeMenu} compact />
          <div className="flex items-center gap-2">
            {user && (
              <>
                <NotificationsBadge />
                <RewardsBadge
                  pendingRewardsCount={user.pendingRewardsCount ?? 0}
                />
              </>
            )}
            <button
              type="button"
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <CapsuleIcon open={menuOpen} />
            </button>
          </div>
        </div>

        {/* Desktop — two-row design */}
        <div className="hidden lg:flex lg:flex-col">
          {/* Row 1 — brand · resources · divider · account */}
          <div className="flex h-[60px] items-center gap-[22px] px-[26px]">
            <BrandLink />
            <div className="flex-1" />
            {user && (
              <>
                <div className="flex items-center gap-2">
                  <TokensPill />
                  <Wallet user={user} />
                  <Energy />
                </div>
                <span aria-hidden className="h-[30px] w-px bg-text/[0.12]" />
                <div className="flex items-center gap-2">
                  <NotificationsBadge />
                  <RewardsBadge
                    pendingRewardsCount={user.pendingRewardsCount ?? 0}
                  />
                </div>
              </>
            )}
          </div>

          {/* Row 2 — navigation tabs + logout */}
          <div className="flex items-stretch justify-between border-t border-text/[0.07] px-[26px]">
            <nav className="flex items-stretch gap-[2px]">
              {navItemsBeforeProfile.map((item) => (
                <Link key={item.label} to={item.to} className={tabClass}>
                  <span className="relative">
                    {item.label}
                    {item.to === '/skills' && (
                      <NotificationDot
                        count={user?.skillPoints ?? 0}
                        className="-right-2 -top-2"
                      />
                    )}
                  </span>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-3 bottom-0 left-3 h-[3px] rounded-t-[3px] bg-transparent"
                  />
                </Link>
              ))}
              {user && (
                <Link
                  to="/profile/$username"
                  params={{ username: user.username }}
                  className={tabClass}
                >
                  Mon profil
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-3 bottom-0 left-3 h-[3px] rounded-t-[3px] bg-transparent"
                  />
                </Link>
              )}
              {navItemsAfterProfile.map((item) => (
                <Link key={item.label} to={item.to} className={tabClass}>
                  {item.label}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-3 bottom-0 left-3 h-[3px] rounded-t-[3px] bg-transparent"
                  />
                </Link>
              ))}
            </nav>
            {user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void handleLogout()}
                aria-label="Déconnexion"
                title="Déconnexion"
                className="my-2 h-10 w-10 self-center rounded-[11px] text-text-light/40 hover:bg-text/[0.06] hover:text-destructive"
              >
                <LogOut className="h-[19px] w-[19px]" />
              </Button>
            )}
          </div>
        </div>
      </nav>

      <MobileMenuShell id="mobile-menu" open={menuOpen} onClose={closeMenu}>
        {navItems.map((item, i) => (
          <MobileNavLink
            key={item.to}
            to={item.to}
            label={item.label}
            index={i}
            open={menuOpen}
            onClick={closeMenu}
            badgeCount={
              item.to === '/skills' ? (user?.skillPoints ?? 0) : undefined
            }
          />
        ))}

        {user && (
          <div
            className={`mt-1 flex items-center justify-between border-t border-border/60 pt-1 transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDelay: `${navItems.length * 45 + 120}ms` }}
          >
            <Link
              to="/profile/$username"
              params={{ username: user.username }}
              className="px-2 py-3 text-3xl font-semibold uppercase tracking-wide text-text-light transition-colors hover:text-text"
              onClick={closeMenu}
            >
              {user.username}
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                void handleLogout()
                closeMenu()
              }}
              title="Déconnexion"
              className="rounded-full p-2 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-7 w-7 font-semibold text-text-light" />
            </Button>
          </div>
        )}
      </MobileMenuShell>
    </>
  )
}

function BrandLink({
  onClick,
  compact = false,
}: {
  onClick?: () => void
  compact?: boolean
}) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className={`flex shrink-0 items-center font-display font-extrabold tracking-[-0.02em] whitespace-nowrap ${
        compact ? 'text-xl' : 'text-[24px]'
      }`}
    >
      <span className="text-primary">Gach</span>
      <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
        apon
      </span>
    </Link>
  )
}

function Wallet({ user }: { user: AuthUser }) {
  const fmt = (n: number) => n.toLocaleString('fr-FR')
  return (
    <div className="flex items-center gap-2">
      <CoinPill
        title={`${fmt(user.dust)} poussière`}
        icon={<Sparkles size={15} strokeWidth={1.8} />}
        value={fmt(user.dust)}
        bgClassName="bg-[#e0f2fe]"
        borderClassName="border-[#7dd3fc]"
        iconColorClassName="text-[#0284c7]"
        textColorClassName="text-[#075985]"
        shadowClassName="shadow-[0_2px_6px_rgba(2,132,199,0.1)]"
      />
      <CoinPill
        title={`${fmt(user.gold)} or`}
        icon={<Coins size={15} strokeWidth={1.8} />}
        value={fmt(user.gold)}
        bgClassName="bg-[#fef9c3]"
        borderClassName="border-[#fde047]"
        iconColorClassName="text-[#ca8a04]"
        textColorClassName="text-[#854d0e]"
        shadowClassName="shadow-[0_2px_6px_rgba(202,138,4,0.1)]"
      />
    </div>
  )
}

// Formate un décompte en secondes : "m:ss" en dessous d'une heure, "h:mm:ss" au-delà
function formatCountdown(secondsLeft: number): string {
  const h = Math.floor(secondsLeft / 3600)
  const m = Math.floor((secondsLeft % 3600) / 60)
  const s = secondsLeft % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

function TokensPill() {
  const balance = useTokenBalance()
  // 1s tick for live regen countdown
  const [, setNow] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setNow((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const data = balance.data
  if (!data) {
    return null
  }

  const isFull = data.tokens >= data.maxStock
  const next = data.nextTokenAt ? new Date(data.nextTokenAt) : null
  const secondsLeft = next
    ? Math.max(0, Math.round((next.getTime() - Date.now()) / 1000))
    : 0
  const timer = !isFull && secondsLeft > 0 ? formatCountdown(secondsLeft) : null

  return (
    <Link
      to="/play"
      title={`Jetons gacha — ${data.tokens}/${data.maxStock}${timer ? ` · prochain dans ${timer}` : ''}`}
      className="relative inline-flex items-center gap-2 whitespace-nowrap rounded-[13px] border border-[#fdba74] bg-[#ffedd5] py-2 pr-3 pl-[11px] shadow-[0_2px_6px_rgba(234,88,12,0.1)]"
    >
      <span className="flex text-[#ea580c]">
        <Layers size={15} strokeWidth={1.8} />
      </span>
      <span className="font-display text-[15px] font-extrabold tabular-nums text-[#9a3412]">
        {data.tokens}
        <span className="text-[12px] font-bold text-[#9a3412]/50">
          /{data.maxStock}
        </span>
      </span>
      {timer && (
        <span className="font-mono text-[11px] tracking-[0.04em] text-[#9a3412]/60">
          {timer}
        </span>
      )}
    </Link>
  )
}

function CoinPill({
  icon,
  value,
  title,
  bgClassName,
  borderClassName,
  iconColorClassName,
  textColorClassName,
  shadowClassName,
}: {
  icon: React.ReactNode
  value: string
  title: string
  bgClassName: string
  borderClassName: string
  iconColorClassName: string
  textColorClassName: string
  shadowClassName: string
}) {
  return (
    <Link
      to="/shop"
      title={title}
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-[13px] border px-3 py-2 ${bgClassName} ${borderClassName} ${shadowClassName}`}
    >
      <span className={`flex ${iconColorClassName}`}>{icon}</span>
      <b
        className={`font-display text-[15px] font-extrabold tabular-nums ${textColorClassName}`}
      >
        {value}
      </b>
    </Link>
  )
}

function Energy() {
  const points = useCombatPoints()
  // 1s tick to keep the regen countdown live
  const [, setNow] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setNow((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const data = points.data
  if (!data) {
    return null
  }

  const isFull = data.combatPoints >= data.maxStock
  const next = data.nextCombatPointAt ? new Date(data.nextCombatPointAt) : null
  const secondsLeft = next
    ? Math.max(0, Math.round((next.getTime() - Date.now()) / 1000))
    : 0
  const timer = !isFull && secondsLeft > 0 ? formatCountdown(secondsLeft) : null

  return (
    <Link
      to="/campaign"
      title={`Points de combat — ${data.combatPoints}/${data.maxStock}${timer ? ` · prochain dans ${timer}` : ''}`}
      className="relative inline-flex items-center gap-2 whitespace-nowrap rounded-[13px] border border-[#ddd0ff] bg-[#f3efff] py-2 pr-3 pl-[11px] shadow-[0_2px_6px_rgba(139,92,246,0.1)]"
    >
      <span className="flex text-[#7c3aed]">
        <Zap size={15} strokeWidth={1.8} />
      </span>
      <span className="font-display text-[15px] font-extrabold tabular-nums text-[#5b21b6]">
        {data.combatPoints}
        <span className="text-[12px] font-bold text-[#5b21b6]/50">
          /{data.maxStock}
        </span>
      </span>
      {timer && (
        <span className="font-mono text-[11px] tracking-[0.04em] text-[#5b21b6]/60">
          {timer}
        </span>
      )}
      <span
        aria-hidden
        className="ml-[2px] flex h-5 w-5 items-center justify-center rounded-[7px] bg-linear-to-br from-accent to-[#7c3aed] text-white"
      >
        <ArrowRight size={14} strokeWidth={2.5} />
      </span>
    </Link>
  )
}
