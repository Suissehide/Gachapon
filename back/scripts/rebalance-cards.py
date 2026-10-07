#!/usr/bin/env python3
"""Relève PV / ATQ / DEF des cartes selon leur ARCHÉTYPE.

Pourquoi : l'équipement en % multiplie la stat de base de la carte. Tant que
les rôles se ressemblaient (Tank commun : 7 de DEF, Mage : 4 — 6,5 % contre
3,8 % de réduction de dégâts), le % ne valait rien et la DEF n'était le
métier de personne. Chaque archétype prend donc un multiplicateur par stat,
et la DEF un second facteur par rareté : sans lui, la DEF de base croissant
déjà ×6 de commune à légendaire face à une référence de mitigation fixe
(100), un Tank légendaire dépasserait 65 % de réduction.

Cibles de réduction de dégâts (DEF de base seule) : Tank 25 % (commun) à
52 % (légendaire), Mage 6 % à 15 %.

Une seule passe, sur les quatre sources ensemble :
  - le classeur (source de vérité), sauvegardé avant d'être réécrit ;
  - cards-data.json (projection gitignorée, lue par import-cards.mjs) ;
  - les Humains de src/main/domain/content/cards.definitions.ts ;
  - une migration de données pour les cartes déjà en base (le déploiement
    ne seede jamais), reconnues par leur image `<dossier>/<ID>.png`.

La sauvegarde du classeur sert aussi de verrou : si elle existe, la passe a
déjà eu lieu et le script refuse de multiplier une seconde fois.

Usage : python3 back/scripts/rebalance-cards.py [--apply]
Sans --apply, affiche seulement ce qui changerait.
"""
import json
import math
import re
import shutil
import statistics
import sys
from collections import defaultdict
from pathlib import Path

import openpyxl

XLSX = Path('/Volumes/Elements/Gachapon/tcg_kit.xlsx')
SAUVEGARDE = XLSX.with_name('tcg_kit.avant-stats-roles-2026-10-07.xlsx')
SCRIPTS = Path(__file__).resolve().parent
JSON_PATH = SCRIPTS / 'import-cards' / 'cards-data.json'
HUMAINS_TS = SCRIPTS.parent / 'src/main/domain/content/cards.definitions.ts'
MIGRATION = (
    SCRIPTS.parent
    / 'prisma/migrations/20261007130000_stats_cartes_par_role/migration.sql'
)

# (PV, ATQ, DEF) par archétype.
ROLE = {
    'Tank': (1.5, 1.0, 3.0),
    'Soutien': (1.3, 1.05, 2.2),
    'Combattant': (1.3, 1.2, 2.0),
    'Équilibré': (1.2, 1.2, 1.7),
    'Tireur': (1.0, 1.4, 1.2),
    'Assassin': (1.0, 1.4, 1.2),
    'Mage': (0.95, 1.5, 1.0),
}
# Second facteur de DEF, décroissant avec la rareté (voir l'en-tête).
DEF_RARETE = {
    'Commun': 1.6,
    'Uncommun': 1.45,
    'Rare': 1.3,
    'Épique': 1.15,
    'Légendaire': 1.0,
}

apply = '--apply' in sys.argv


def arrondi(x: float) -> int:
    """Arrondi au supérieur à la moitié, comme Math.round en JS."""
    return math.floor(x + 0.5)


if apply and SAUVEGARDE.exists():
    raise SystemExit(f'✗ {SAUVEGARDE.name} existe : la passe a déjà eu lieu.')

# --- classeur -------------------------------------------------------------
# data_only=False : la feuille contient des formules vivantes (VLOOKUP vers
# Recettes) qu'un chargement en mode valeurs écraserait.
wb = openpyxl.load_workbook(XLSX, data_only=False)
ws = wb['Production']
entetes = [c.value for c in ws[3]]
col = {nom: i + 1 for i, nom in enumerate(entetes)}

nouvelles: dict[str, tuple[int, int, int]] = {}
par_rarete = defaultdict(list)
for ligne in range(4, ws.max_row + 1):
    ident = ws.cell(row=ligne, column=col['ID']).value
    if not ident or ws.cell(row=ligne, column=col['Famille']).value == 'Boss':
        continue
    cellules = [ws.cell(row=ligne, column=col[k]) for k in ('PV', 'ATQ', 'DEF')]
    if not all(isinstance(c.value, (int, float)) for c in cellules):
        continue  # ligne en cours d'édition
    role = ws.cell(row=ligne, column=col['Archétype']).value
    rarete = ws.cell(row=ligne, column=col['Rareté']).value
    if role not in ROLE or rarete not in DEF_RARETE:
        raise SystemExit(f'✗ {ident} : archétype {role!r} / rareté {rarete!r} inconnus')
    m_pv, m_atk, m_def = ROLE[role]
    valeurs = (
        arrondi(cellules[0].value * m_pv),
        arrondi(cellules[1].value * m_atk),
        arrondi(cellules[2].value * m_def * DEF_RARETE[rarete]),
    )
    for c, v in zip(cellules, valeurs):
        c.value = v
    nouvelles[ident] = valeurs
    vit = ws.cell(row=ligne, column=col['VIT']).value
    par_rarete[rarete].append((*valeurs, vit))

print(f'classeur : {len(nouvelles)} cartes')
for rarete, cartes in par_rarete.items():
    med = [round(statistics.median(c[i] for c in cartes)) for i in range(4)]
    print(f'  médiane {rarete:<11} PV/ATQ/DEF/VIT = {med}  (RARITY_BASE)')
if apply:
    shutil.copy(XLSX, SAUVEGARDE)
    wb.save(XLSX)
    print(f'  sauvegarde -> {SAUVEGARDE.name}')

# --- cards-data.json ------------------------------------------------------
donnees = json.loads(JSON_PATH.read_text())
n = 0
for cartes in donnees.values():
    for c in cartes:
        if c['id'] not in nouvelles:
            raise SystemExit(f'✗ {c["id"]} : absent du classeur')
        c['hp'], c['atk'], c['def'] = nouvelles[c['id']]
        n += 1
print(f'cards-data.json : {n} cartes')
if apply:
    JSON_PATH.write_text(json.dumps(donnees, ensure_ascii=False, indent=2) + '\n')

# --- Humains (cards.definitions.ts) ---------------------------------------
source = HUMAINS_TS.read_text()
BLOC = re.compile(
    r"(id: '(HUM-\d{3})',.*?baseHp: )\d+(,\s*baseAtk: )\d+(,\s*baseDef: )\d+",
    re.S,
)


def remplace(m: re.Match) -> str:
    pv, atk, df = nouvelles[m.group(2)]
    return f'{m.group(1)}{pv}{m.group(3)}{atk}{m.group(4)}{df}'


source, h = BLOC.subn(remplace, source)
print(f'cards.definitions.ts : {h} Humains')
if apply:
    HUMAINS_TS.write_text(source)

# --- migration ------------------------------------------------------------
lignes = ',\n'.join(
    f"  ('{ident}', {pv}, {atk}, {df})"
    for ident, (pv, atk, df) in sorted(nouvelles.items())
)
sql = f"""-- Stats de base des cartes relevées par ARCHÉTYPE (scripts/rebalance-cards.py).
--
-- L'équipement en % multiplie la stat de base : tant que les rôles se
-- ressemblaient, il ne valait rien face au plat, et la DEF n'était le métier
-- de personne (Tank commun 7 de DEF, Mage 4). Chaque archétype prend un
-- multiplicateur par stat (Tank PV x1,5 DEF x3, Mage ATQ x1,5...), la DEF un
-- second facteur décroissant avec la rareté (x1,6 commune -> x1 légendaire).
--
-- Migration de DONNÉES : le déploiement ne seede jamais. Les cartes sont
-- reconnues par leur image (`<dossier>/<ID>.png`, voir import-cards.mjs) ;
-- une carte pas encore importée est simplement ignorée, et l'import la créera
-- avec les nouvelles valeurs (cards-data.json). Valeurs absolues : idempotent.
-- La vitesse n'est pas touchée.

UPDATE "Card" c
SET "baseHp" = v.hp, "baseAtk" = v.atk, "baseDef" = v.def
FROM (VALUES
{lignes}
) AS v(id, hp, atk, def)
WHERE c."imageUrl" LIKE '%/' || v.id || '.png';
"""
if apply:
    MIGRATION.parent.mkdir(parents=True, exist_ok=True)
    MIGRATION.write_text(sql)
    print(f'migration -> {MIGRATION.relative_to(SCRIPTS.parent)}')
else:
    print('(essai à blanc, rien écrit)')
