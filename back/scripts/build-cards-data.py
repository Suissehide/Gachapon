#!/usr/bin/env python3
"""Régénère `import-cards/cards-data.json` depuis le classeur tcg_kit.

Le classeur (onglet Production) est la source de vérité des cartes ; le JSON
n'en est qu'une projection, consommée par import-cards.mjs. Il est gitignoré :
ce script est la seule façon reproductible de le refabriquer.

Correspondance famille -> dossier de stockage -> onglet : `families.json`.

Usage : python3 back/scripts/build-cards-data.py [--apply] [--only slug,slug]
Sans --apply, affiche seulement ce qui changerait (aucune écriture).
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

import openpyxl

XLSX = Path('/Volumes/Elements/Gachapon/tcg_kit.xlsx')
ART_ROOT = Path('/Volumes/Elements/Gachapon/cards_final')
SCRIPTS = Path(__file__).resolve().parent
FAMILIES_PATH = SCRIPTS / 'families.json'
JSON_PATH = SCRIPTS / 'import-cards' / 'cards-data.json'
PASSIVES_TS = SCRIPTS.parent / 'src/main/domain/combat/passives.ts'

RARETES = {
    'Commun': 'COMMON',
    # Le classeur écrit « Uncommun » (sic) ; corriger la colonne casserait
    # l'appariement avec les autres scripts qui la lisent.
    'Uncommun': 'UNCOMMON',
    'Rare': 'RARE',
    'Épique': 'EPIC',
    'Légendaire': 'LEGENDARY',
}

# dropWeight imposé par rareté (spec rééquilibrage 2026-07-20). import-cards.mjs
# applique le même barème et ignore le champ ; on l'écrit pour que le JSON soit
# lisible seul, pas pour qu'il fasse foi.
DROP_WEIGHT = {'COMMON': 85, 'UNCOMMON': 38, 'RARE': 16, 'EPIC': 8, 'LEGENDARY': 2}

# Les colonnes Élément et Passif sont au format « Libellé (CLÉ) » ; la clé fait foi.
CLE_ENTRE_PARENTHESES = re.compile(r'\(([A-Z_]+)\)\s*$')
SUFFIXE_PNG = re.compile(r'_\d{5}_(?=\.png$)', re.I)


def cle(valeur, colonne, ident):
    """Extrait la CLÉ de « Libellé (CLÉ) ». Une cellule vide vaut None."""
    if valeur is None or str(valeur).strip() == '':
        return None
    trouve = CLE_ENTRE_PARENTHESES.search(str(valeur).strip())
    if not trouve:
        raise SystemExit(f'✗ {ident} : colonne {colonne} illisible -> {valeur!r}')
    return trouve.group(1)


def passifs_valides() -> set[str]:
    """Clés du type PassiveKey (passives.ts), pour refuser un passif inventé."""
    source = PASSIVES_TS.read_text(encoding='utf-8')
    union = source.split('export type PassiveKey =', 1)[1].split('export ', 1)[0]
    return set(re.findall(r"'([A-Z_]+)'", union))


def ids_avec_image(dossier: str) -> set[str] | None:
    """IDs qui ont un PNG dans cards_final (None si le disque n'est pas monté).

    Même règle que cards-webp.py : `sans_signature/` est prioritaire, et les
    sous-dossiers d'un dossier de race sont parcourus (types de monstres).
    """
    racine = ART_ROOT / dossier
    if not racine.is_dir():
        return None
    base = racine / 'sans_signature' if (racine / 'sans_signature').is_dir() else racine

    def parcours(rep: Path):
        for p in rep.iterdir():
            if p.name.startswith('.'):
                continue
            if p.is_file() and p.suffix.lower() == '.png':
                yield SUFFIXE_PNG.sub('', p.name)[:-4]
            elif p.is_dir() and p.name != 'sans_signature' and rep is base:
                yield from parcours(p)

    return set(parcours(base))


def main() -> None:
    apply = '--apply' in sys.argv
    seulement = None
    for a in sys.argv:
        if a.startswith('--only='):
            seulement = set(a.split('=', 1)[1].split(','))

    familles = {
        slug: f
        for slug, f in json.loads(FAMILIES_PATH.read_text(encoding='utf-8')).items()
        if not slug.startswith('_') and f.get('sheet')
    }
    par_onglet = {f['sheet']: (slug, f) for slug, f in familles.items()}
    passifs = passifs_valides()

    wb = openpyxl.load_workbook(XLSX, data_only=True, read_only=True)
    ws = wb['Production']
    entetes = [c.value for c in ws[3]]
    col = {nom: i for i, nom in enumerate(entetes)}

    cartes: dict[str, list[dict]] = {}
    ignorees = Counter()
    for ligne in ws.iter_rows(min_row=4, values_only=True):
        ident = ligne[col['ID']]
        onglet = ligne[col['Famille']]
        if not ident:
            continue
        if onglet not in par_onglet:
            # Boss : bestiaire de campagne, pas une famille collectionnable.
            ignorees[onglet] += 1
            continue
        slug, _ = par_onglet[onglet]
        if seulement and slug not in seulement:
            continue
        rarete = RARETES.get(ligne[col['Rareté']])
        if not rarete:
            raise SystemExit(f'✗ {ident} : rareté inconnue -> {ligne[col["Rareté"]]!r}')
        passif = cle(ligne[col['Passif']], 'Passif', ident)
        if passif and passif not in passifs:
            raise SystemExit(f'✗ {ident} : passif absent de passives.ts -> {passif}')
        cartes.setdefault(onglet, []).append({
            'id': ident,
            'name': ligne[col['Nom de la carte']],
            'rarity': rarete,
            'hp': ligne[col['PV']],
            'atk': ligne[col['ATQ']],
            'def': ligne[col['DEF']],
            'spd': ligne[col['VIT']],
            'passiveKey': passif,
            'folder': slug,
            'dropWeight': DROP_WEIGHT[rarete],
            'element': cle(ligne[col['Élément']], 'Élément', ident),
        })

    # Ordre de families.json plutôt que celui du classeur : deux régénérations
    # produisent le même fichier même si des lignes sont réordonnées.
    ordonne = {f['sheet']: cartes[f['sheet']] for f in familles.values() if f['sheet'] in cartes}

    ancien = json.loads(JSON_PATH.read_text(encoding='utf-8')) if JSON_PATH.exists() else {}
    total = 0
    for onglet, liste in ordonne.items():
        avant = {c['id']: c for c in ancien.get(onglet, [])}
        nouveaux = [c['id'] for c in liste if c['id'] not in avant]
        modifiees = [c['id'] for c in liste if c['id'] in avant and avant[c['id']] != c]
        disparues = [i for i in avant if i not in {c['id'] for c in liste}]
        sans_image = None
        images = ids_avec_image(familles[liste[0]['folder']]['dir'])
        if images is not None:
            sans_image = [c['id'] for c in liste if c['id'] not in images]
        etat = f'{onglet:16s} {len(liste):3d} cartes'
        if nouveaux:
            etat += f'  +{len(nouveaux)}'
        if modifiees:
            etat += f'  ~{len(modifiees)}'
        if disparues:
            etat += f'  -{len(disparues)} ({",".join(disparues)})'
        if sans_image:
            etat += f'  ⚠ sans image : {",".join(sans_image)}'
        print(etat)
        total += len(liste)

    if ignorees:
        print(f'\nLignes hors familles collectionnables : {dict(ignorees)}')

    if apply:
        JSON_PATH.write_text(
            json.dumps(ordonne, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
        )
        print(f'\n{total} cartes écrites dans {JSON_PATH}')
    else:
        print(f'\n{total} cartes — essai à blanc, {JSON_PATH.name} non réécrit (--apply pour écrire)')


if __name__ == '__main__':
    main()
