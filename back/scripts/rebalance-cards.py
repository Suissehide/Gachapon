#!/usr/bin/env python3
"""Rééchelonne DEF (x2.5) et ATQ (x1.25) des cartes non-Boss.

Applique la même transformation au classeur (source de vérité) et à
cards-data.json (sous-ensemble déjà importé), appariés par identifiant.
Travaille sur une copie du classeur : ne remplace jamais l'original.

Usage : python3 back/scripts/rebalance-cards.py [--apply]
Sans --apply, affiche seulement ce qui changerait.
"""
import json
import math
import shutil
import sys
from pathlib import Path

import openpyxl

XLSX = Path('/Volumes/Elements/Gachapon/tcg_kit.xlsx')
COPIE = XLSX.with_name('tcg_kit.rebalanced.xlsx')
JSON_PATH = Path(__file__).resolve().parent / 'import-cards' / 'cards-data.json'

MULT_DEF = 2.5
MULT_ATK = 1.25

apply = '--apply' in sys.argv


def arrondi(x: float) -> int:
    """Arrondi au supérieur à la moitié, comme Math.round en JS.

    `round()` de Python fait un arrondi bancaire : round(12.5) == 12, alors que
    Math.round(12.5) === 13. Les stats passent par les deux langages (ce script
    et le seed TypeScript), il faut donc la même règle des deux côtés.
    """
    return math.floor(x + 0.5)

# --- classeur -------------------------------------------------------------
# data_only=False : la feuille contient des formules vivantes (colonne G
# "Prompt complet (auto)" avec des VLOOKUP vers Recettes, colonne H "Chemin
# Save Image"). Charger en mode valeurs les écraserait par leur résultat.
shutil.copy(XLSX, COPIE)
wb = openpyxl.load_workbook(COPIE, data_only=False)
ws = wb['Production']

entetes = [c.value for c in ws[3]]
col = {nom: i + 1 for i, nom in enumerate(entetes)}
modifiees = 0
for ligne in range(4, ws.max_row + 1):
    ident = ws.cell(row=ligne, column=col['ID']).value
    famille = ws.cell(row=ligne, column=col['Famille']).value
    if not ident or famille == 'Boss':
        continue
    c_def = ws.cell(row=ligne, column=col['DEF'])
    c_atk = ws.cell(row=ligne, column=col['ATQ'])
    if not isinstance(c_def.value, (int, float)):
        continue
    c_def.value = arrondi(c_def.value * MULT_DEF)
    c_atk.value = arrondi(c_atk.value * MULT_ATK)
    modifiees += 1

print(f'classeur : {modifiees} cartes rééchelonnées -> {COPIE}')
if apply:
    wb.save(COPIE)
else:
    print('  (essai à blanc, copie non sauvegardée)')

# --- cards-data.json ------------------------------------------------------
donnees = json.loads(JSON_PATH.read_text())
n = 0
for _famille, cartes in donnees.items():
    for c in cartes:
        c['def'] = arrondi(c['def'] * MULT_DEF)
        c['atk'] = arrondi(c['atk'] * MULT_ATK)
        n += 1
print(f'cards-data.json : {n} cartes rééchelonnées')
if apply:
    JSON_PATH.write_text(json.dumps(donnees, ensure_ascii=False, indent=2) + '\n')
