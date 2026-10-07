#!/usr/bin/env python3
"""Aligne la colonne Passif du classeur sur les libellés de passives.ts.

Le format de la colonne est `Libellé français (CLÉ)`. La clé sert
d'appariement ; une clé listée dans CLES_RENOMMEES est remplacée par la
nouvelle avant de chercher son libellé, et une carte listée dans
CARTES_REASSIGNEES (par ID) reçoit un autre passif.

Usage : python3 back/scripts/relabel-passives.py [--apply]
"""
import re
import shutil
import sys
from pathlib import Path

import openpyxl

XLSX = Path('/Volumes/Elements/Gachapon/tcg_kit.xlsx')
COPIE = XLSX.with_name('tcg_kit.relabeled.xlsx')

NOUVEAUX_LIBELLES = {
    'CRIT': 'Précision',
    'HAMPER': 'Entrave',
    'MOMENTUM': 'Élan',
    'TAUNT': 'Provocation',
    'GUARDIAN': 'Garde du corps',
    'HUNT': 'Marque du chasseur',
    'VIGOR': 'Second souffle',
    'HASTE': 'Célérité',
    'FORTIFY': 'Fortification',
    'EMPOWER': 'Puissance',
}

# 2026-10-07 : famille jauge / vitesse (migration 20261007120100).
CLES_RENOMMEES = {
    'PIERCE': 'HAMPER',
    'BLOODLUST': 'MOMENTUM',
    # 2026-10-07 : famille provocation / ciblage (migration 20261007120200).
    'VAMPIRISM': 'TAUNT',
}

# Cartes qui changent de passif (migration 20261007120200).
CARTES_REASSIGNEES = {
    'DEM-030': 'TAUNT',
    'ORC-029': 'TAUNT',
    'DRA-027': 'GUARDIAN',
    'CEN-034': 'GUARDIAN',
    'MOR-031': 'HUNT',
    'SIR-035': 'HUNT',
}

apply = '--apply' in sys.argv
# La copie n'est écrite sur disque qu'en mode --apply : un essai à blanc
# charge l'original en lecture seule (jamais réécrit) pour que le message
# « copie non sauvegardée » soit vrai (même correctif que rebalance-cards.py).
if apply:
    shutil.copy(XLSX, COPIE)
    wb = openpyxl.load_workbook(COPIE, data_only=False)
else:
    wb = openpyxl.load_workbook(XLSX, data_only=False)
ws = wb['Production']
entetes = [c.value for c in ws[3]]
col_passif = entetes.index('Passif') + 1
col_id = entetes.index('ID') + 1

modifiees = 0
for ligne in range(4, ws.max_row + 1):
    cellule = ws.cell(row=ligne, column=col_passif)
    valeur = cellule.value
    if not valeur:
        continue
    correspondance = re.match(r'^(.*)\s*\(([A-Z_]+)\)$', str(valeur).strip())
    if not correspondance:
        print(f'  ligne {ligne} : format inattendu -> {valeur!r}')
        continue
    cle = CLES_RENOMMEES.get(correspondance.group(2), correspondance.group(2))
    cle = CARTES_REASSIGNEES.get(ws.cell(row=ligne, column=col_id).value, cle)
    libelle = NOUVEAUX_LIBELLES.get(cle, correspondance.group(1).strip())
    if cle in NOUVEAUX_LIBELLES or cle != correspondance.group(2):
        nouveau = f'{libelle} ({cle})'
        if nouveau != valeur:
            cellule.value = nouveau
            modifiees += 1

print(f'{modifiees} libellés mis à jour -> {COPIE}')
if apply:
    wb.save(COPIE)
else:
    print('  (essai à blanc, copie non sauvegardée)')
