// ContributionsTable — « CONTRIBUTIONS », dernière section de la colonne
// droite de la fiche d'équipe. Reprend `docs/design_handoff_equipe/equipe.css`
// (`.tm-sechead`, `.tm-search`, `.tm-mem-head`, `.tm-mem`, `.tm-av`,
// `.tm-role`, `.tm-contrib-*`, `.tm-num`, `.tm-atk-dots`, `.tm-mem-more`) et
// la composition de `MemberTable` dans `equipe-parts.jsx`.
//
// Cette section n'est PAS dans un panneau blanc : la maquette pose l'en-tête
// et la recherche à même le fond crème, et chaque membre est sa propre carte
// blanche. C'est pour ça qu'on ne trouvera pas d'`ArcadeCard` ici, à la
// différence des deux blocs au-dessus.
//
// Source : `GET /teams/:id/members` (`useTeamMembers`), qui renvoie la table
// ENTIÈRE déjà triée par dégâts décroissants — d'où le « TRIÉ PAR DÉGÂTS »
// de l'en-tête, qui décrit le serveur et n'est pas un contrôle. La recherche
// et le « voir plus » sont donc purement locaux : aucune requête ne part
// quand on tape.
import { Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { Search, UserMinus, Users, UserX } from 'lucide-react'
import { type CSSProperties, useMemo, useState } from 'react'

import type {
  TeamMemberRoleLabel,
  TeamMemberRow,
} from '../../api/teamProgression.api.ts'
import { cn, foldForSearch, plural } from '../../libs/utils.ts'
import { useTeamMembers } from '../../queries/useTeamProgression.ts'
import { useRemoveMember } from '../../queries/useTeams.ts'
import { MemberAvatar } from '../shared/MemberAvatar.tsx'
import { Button } from '../ui/button.tsx'
import { Input } from '../ui/input.tsx'
import { listRowVariants } from '../ui/listRow.tsx'
import { SectionLabel } from '../ui/sectionHeading.tsx'
import { ConfirmPopup } from './ConfirmPopup.tsx'

/** Lignes visibles avant le pied « Voir les N autres membres ». */
const VISIBLE_ROWS = 9

/**
 * `useTeamMembers` découpe CÔTÉ CLIENT une réponse qui contient déjà tout
 * l'effectif — le serveur ne pagine pas. Une « page » plus grande que le
 * plafond d'équipe (`team.maxMembers`, 35 aujourd'hui) neutralise donc ce
 * découpage : la recherche et le pli « voir plus » doivent porter sur la
 * totalité, pas sur une page.
 */
const ALL_MEMBERS = 1000

const fr = (n: number) => n.toLocaleString('fr-FR')

/**
 * Teintes de `ROLE_COLOR` (handoff `equipe-data.jsx`), tokenisées dans
 * `_colors.css`. La clé est le libellé français servi par le serveur
 * (`roleLabel`), pas le rôle brut : « Recrue » n'existe QUE comme libellé —
 * c'est un MEMBER arrivé depuis moins de `team.recruitDays` jours.
 */
const ROLE_COLOR: Record<TeamMemberRoleLabel, string> = {
  Chef: 'var(--role-owner)',
  Officier: 'var(--role-admin)',
  Membre: 'var(--role-member)',
  Recrue: 'var(--role-recruit)',
}

/**
 * `lastSeenAt` est la dernière CONNEXION (`user.lastLoginAt`), pas la
 * dernière activité : impossible d'en tirer un « en ligne » honnête, une
 * session ouverte durant des jours sans nouvelle connexion. On affiche donc
 * la date relative, et on ne réserve la couleur verte de la maquette
 * (`.tm-mem-seen.on`) qu'au seul fait que la donnée soutient réellement :
 * s'être connecté aujourd'hui.
 */
function seenLabel(lastSeenAt: string | null): {
  text: string
  fresh: boolean
} {
  if (lastSeenAt === null) {
    return { text: 'jamais connecté', fresh: false }
  }
  const at = dayjs(lastSeenAt)
  if (at.isSame(dayjs(), 'day')) {
    return { text: "connecté aujourd'hui", fresh: true }
  }
  return { text: at.fromNow(), fresh: false }
}

/**
 * Grille commune à l'en-tête et aux lignes (`.tm-mem-head`, `.tm-mem`) :
 * 34px / 1.2fr / 108px / 1.6fr / 92px / 96px, gap 16px, plus une colonne
 * d'action de 36px quand le lecteur est le chef.
 *
 * Sous `md`, les quatre dernières cellules retombent sous l'identité
 * (`col-start-2`) au lieu de se comprimer : la colonne droite de la page
 * fait toute la largeur de l'écran en dessous de `lg`, et six colonnes ne
 * tiennent pas sur un téléphone.
 */
function rowGrid(withAction: boolean): string {
  return cn(
    'grid grid-cols-[34px_minmax(0,1fr)] items-center gap-x-4 gap-y-2',
    withAction
      ? 'md:grid-cols-[34px_minmax(150px,1.2fr)_108px_minmax(0,1.6fr)_92px_96px_36px]'
      : 'md:grid-cols-[34px_minmax(150px,1.2fr)_108px_minmax(0,1.6fr)_92px_96px]',
  )
}

/** Chaque cellule après l'identité : empilée sous le nom en dessous de `md`. */
const STACKED = 'col-start-2 md:col-start-auto'

function RemoveMemberButton({
  username,
  userId,
  onRemove,
}: {
  username: string
  userId: string
  onRemove: (userId: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
        onClick={() => setOpen(true)}
        title={`Exclure ${username}`}
        aria-label={`Exclure ${username} de l'équipe`}
      >
        <UserMinus className="h-4 w-4" />
      </Button>
      <ConfirmPopup
        open={open}
        onOpenChange={setOpen}
        icon={<UserX className="h-4 w-4" />}
        title="Exclure le membre"
        description={`Êtes-vous sûr de vouloir exclure ${username} de l'équipe ?`}
        confirmLabel="Exclure"
        onConfirm={() => onRemove(userId)}
      />
    </>
  )
}

/**
 * Barre de contribution. Un membre à zéro dégât reçoit une piste GRISE
 * PLEINE LARGEUR (`.tm-contrib-bar > div.zero`) et un tiret là où iraient
 * les chiffres — pas une piste vide, qui se lirait comme un rendu raté. Les
 * autres partent d'un plancher de 4 % pour rester visibles à 1 % du meilleur.
 */
function ContributionBar({
  damage,
  best,
  share,
}: {
  damage: number
  best: number
  share: number
}) {
  const zero = damage === 0
  const width = zero ? 100 : Math.max(4, Math.round((damage / best) * 100))

  return (
    <div>
      <div className="mb-[5px] flex justify-between gap-2 font-mono text-[10px] tabular-nums text-foreground/50">
        <span>{zero ? '—' : fr(damage)}</span>
        <span>{zero ? 'aucune attaque' : `${share} % du total`}</span>
      </div>
      <div className="h-[7px] overflow-hidden rounded-[4px] bg-foreground/7">
        <div
          className={cn(
            'h-full rounded-[4px]',
            zero
              ? 'bg-foreground/12'
              : 'bg-gradient-to-r from-primary to-destructive',
          )}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

/** `.tm-atk-dots` : une pastille par attaque quotidienne, allumée si restante. */
function AttackDots({ left, perDay }: { left: number; perDay: number }) {
  if (perDay <= 0) {
    return (
      <span className="font-mono text-[10px] tabular-nums text-foreground/45">
        —
      </span>
    )
  }
  return (
    // `role="img"` : la rangée de pastilles est UNE image de jauge, pas une
    // liste de puces. C'est ce rôle qui rend `aria-label` valide sur un
    // <span> et qui fait lire « 2 attaques restantes sur 2 » d'un bloc au
    // lieu d'annoncer deux éléments vides.
    <span
      role="img"
      className="flex gap-1"
      title={`${left} attaque${plural(left)} restante${plural(left)} sur ${perDay}`}
      aria-label={`${left} attaque${plural(left)} restante${plural(left)} sur ${perDay}`}
    >
      {Array.from({ length: perDay }, (_, i) => (
        <i
          // biome-ignore lint/suspicious/noArrayIndexKey: pastilles anonymes en nombre fixe, jamais réordonnées — l'index EST l'identité du cran
          key={i}
          className={cn(
            'h-2 w-2 rounded-full',
            i < left ? 'bg-primary' : 'bg-foreground/12',
          )}
        />
      ))}
    </span>
  )
}

function MemberRow({
  member,
  index,
  best,
  total,
  attacksPerDay,
  canRemove,
  onRemove,
}: {
  member: TeamMemberRow
  index: number
  best: number
  total: number
  attacksPerDay: number
  canRemove: boolean
  onRemove: (userId: string) => void
}) {
  const seen = seenLabel(member.lastSeenAt)
  const share = total > 0 ? Math.round((member.raidDamage / total) * 100) : 0
  // Le chef ne s'exclut pas lui-même et n'exclut pas… le chef : le serveur
  // refuse les deux, un bouton visible serait un mur.
  const removable = canRemove && !member.isMe && member.role !== 'OWNER'

  return (
    <li
      className={cn(
        rowGrid(canRemove),
        listRowVariants({ tone: member.isMe ? 'mine' : 'default' }),
      )}
    >
      <span className="text-center font-mono text-xs font-bold tabular-nums text-foreground/40">
        {member.rank}
      </span>

      <div className="flex min-w-0 items-center gap-[11px]">
        <MemberAvatar
          letter={member.user.username[0]?.toUpperCase() ?? '?'}
          index={index}
        />
        <div className="min-w-0">
          <Link
            to="/profile/$username"
            params={{ username: member.user.username }}
            className="block truncate text-[15px] font-bold text-text hover:text-primary-dark"
          >
            {member.user.username}
            {member.isMe && ' (moi)'}
          </Link>
          <div
            className={cn(
              'truncate text-[11px]',
              seen.fresh ? 'text-success' : 'text-foreground/45',
            )}
          >
            Niv. {member.level} · {seen.text}
          </div>
        </div>
      </div>

      <span
        className={cn(
          STACKED,
          'inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--rc)]',
        )}
        style={{ '--rc': ROLE_COLOR[member.roleLabel] } as CSSProperties}
      >
        <i className="h-1.5 w-1.5 rounded-full bg-[var(--rc)]" />
        {member.roleLabel}
      </span>

      <div className={cn(STACKED, 'min-w-0')}>
        <ContributionBar damage={member.raidDamage} best={best} share={share} />
      </div>

      <div className={cn(STACKED, 'md:text-right')}>
        <span className="block font-display text-lg font-extrabold tabular-nums text-text">
          {fr(member.weekPoints)}
        </span>
        <span className="block font-mono text-[9px] font-semibold tracking-[0.12em] text-foreground/45">
          PTS
        </span>
      </div>

      <div className={cn(STACKED, 'flex md:justify-end')}>
        <AttackDots left={member.raidAttacksLeft} perDay={attacksPerDay} />
      </div>

      {canRemove && (
        <div className={cn(STACKED, 'flex md:justify-end')}>
          {removable && (
            <RemoveMemberButton
              username={member.user.username}
              userId={member.userId}
              onRemove={onRemove}
            />
          )}
        </div>
      )}
    </li>
  )
}

/**
 * Corps de la table : en-tête de colonnes, lignes, pied « voir plus ».
 * Extrait du composant principal pour ne pas empiler dans une seule fonction
 * les quatre états de chargement et les deux états de pli — même parti pris
 * que `buildHistory` dans `WagersPanel`.
 */
function Roster({
  rows,
  best,
  totalDamage,
  attacksPerDay,
  isOwner,
  onRemove,
  searchTerm,
  hidden,
  expanded,
  onToggleExpanded,
}: {
  rows: TeamMemberRow[]
  best: number
  totalDamage: number
  attacksPerDay: number
  isOwner: boolean
  onRemove: (userId: string) => void
  /** Recherche en cours, déjà rognée. Vide = liste complète. */
  searchTerm: string
  hidden: number
  expanded: boolean
  onToggleExpanded: () => void
}) {
  if (rows.length === 0) {
    return (
      <p className="text-[12.5px] leading-[1.5] text-foreground/55">
        Aucun membre ne correspond à « {searchTerm} ».
      </p>
    )
  }

  return (
    <>
      {/* `.tm-mem-head` — masqué sous `md`, où les lignes s'empilent et où
          des en-têtes de colonnes ne désigneraient plus rien. */}
      <div
        className={cn(
          rowGrid(isOwner),
          'hidden px-[18px] pb-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/45 md:grid',
        )}
      >
        <span className="text-center">#</span>
        <span>Joueur</span>
        <span>Rôle</span>
        <span>Dégâts au raid</span>
        <span className="text-right">Pts hebdo</span>
        <span className="text-right">Attaques</span>
        {isOwner && <span />}
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            // La teinte de l'avatar suit le RANG servi par le serveur, pas la
            // position dans la liste filtrée : sans ça, taper une lettre
            // repeindrait tous les avatars.
            index={member.rank}
            best={best}
            total={totalDamage}
            attacksPerDay={attacksPerDay}
            canRemove={isOwner}
            onRemove={onRemove}
          />
        ))}
      </ul>

      {/* `.tm-mem-more` — la variante `dashed` du bouton porte déjà bordure
          pointillée, encre atténuée et survol ambré. Absent pendant une
          recherche : elle affiche déjà tous ses résultats. */}
      {searchTerm === '' && (hidden > 0 || expanded) && (
        <Button
          variant="dashed"
          onClick={onToggleExpanded}
          className="mt-2.5 h-auto w-full rounded-[14px] py-3 font-mono text-[11px] uppercase tracking-[0.12em]"
        >
          <Users className="h-3.5 w-3.5" />
          {expanded ? 'Réduire la liste' : `Voir les ${hidden} autres membres`}
        </Button>
      )}
    </>
  )
}

export function ContributionsTable({
  teamId,
  isOwner,
}: {
  teamId: string
  /** Le chef seul peut exclure : la colonne d'action n'existe que pour lui. */
  isOwner: boolean
}) {
  // Pagination serveur inutile : `useTeamMembers` reçoit la table entière.
  // On demande une page assez grande pour tout couvrir (plafond serveur :
  // `team.maxMembers`) et on découpe nous-mêmes, la recherche devant porter
  // sur la totalité de l'effectif et non sur la page affichée.
  const {
    members,
    total,
    attacksPerDay = 0,
    isLoading,
    isError,
  } = useTeamMembers(teamId, 1, ALL_MEMBERS)
  const { mutate: remove } = useRemoveMember(teamId)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(false)

  const filtered = useMemo(() => {
    const q = foldForSearch(search.trim())
    return q === ''
      ? members
      : members.filter((m) => foldForSearch(m.user.username).includes(q))
  }, [members, search])

  // Référence des barres et des parts : le meilleur score et la somme des
  // dégâts de TOUT l'effectif, jamais de la seule page visible — sinon les
  // pourcentages changeraient en dépliant la liste ou en tapant une lettre.
  const best = Math.max(1, ...members.map((m) => m.raidDamage))
  const totalDamage = members.reduce((sum, m) => sum + m.raidDamage, 0)

  // Une recherche affiche tous ses résultats : replier la liste filtrée
  // cacherait précisément ce qu'on cherche.
  const searching = search.trim() !== ''
  const shown =
    searching || expanded ? filtered : filtered.slice(0, VISIBLE_ROWS)
  const hidden = filtered.length - shown.length

  return (
    <section>
      {/* `.tm-sechead` */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <SectionLabel as="h2">Contributions</SectionLabel>
        <SectionLabel className="shrink-0">Trié par dégâts</SectionLabel>
      </div>

      {/* `.tm-search` : 12/16 de padding, radius 14, bordure 1,5 px. */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un membre…"
          aria-label="Rechercher un membre"
          className="h-auto rounded-[14px] border-[1.5px] py-3 pl-11 pr-4 text-sm"
        />
      </div>

      {isLoading ? (
        <p className="font-mono text-[10px] tracking-[0.06em] text-foreground/45">
          Chargement des membres…
        </p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          Impossible de charger les membres de l'équipe.
        </p>
      ) : total === 0 ? (
        <p className="text-[12.5px] leading-[1.5] text-foreground/55">
          Aucun membre à afficher pour l'instant.
        </p>
      ) : (
        <Roster
          rows={shown}
          best={best}
          totalDamage={totalDamage}
          attacksPerDay={attacksPerDay}
          isOwner={isOwner}
          onRemove={remove}
          searchTerm={search.trim()}
          hidden={hidden}
          expanded={expanded}
          onToggleExpanded={() => setExpanded((v) => !v)}
        />
      )}
    </section>
  )
}
