#!/usr/bin/env python3
"""
Génère les variantes WebP des cartes (320 / 640 / 1248 px de large) à partir des
PNG masters, dans une arborescence prête à pousser sur MinIO (`cards/<slug>/`).

Convention côté front (TcgCardFace) : pour `cards/<slug>/XXX-001.png`, les
variantes sont `cards/<slug>/XXX-001-320.webp`, `-640.webp`, `-1248.webp`.

Usage :
  python3 cards-webp.py <racine_cards_final> <dossier_sortie> [--with-png] [--only slug,slug]

  --with-png  copie aussi le PNG master renommé (sans suffixe `_0000x_`) — utile
              pour les races pas encore en ligne.
  --only      ne traite que ces slugs.

Puis (client mc, alias `qwetle`) :
  mc cp -r --attr "Cache-Control=public,max-age=31536000,immutable" <sortie>/cards/ qwetle/gachapon/cards/
  mc cp -r --attr "Cache-Control=public,max-age=31536000,immutable" <sortie>/cards/ qwetle/gachapon/staging/cards/
"""
import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

WIDTHS = (320, 640, 1248)
QUALITY = 82

# dossier local -> slug MinIO, depuis families.json (source unique partagée avec
# build-cards-data.py et import-cards.mjs — un slug qui diverge d'un script à
# l'autre envoie les variantes à côté des PNG et personne ne s'en aperçoit).
# Le sous-dossier sans_signature/ est préféré s'il existe ; Monstres/ contient
# un sous-dossier par type (Basilics, Boss, …), tout est aplati dans
# `cards/monsters/` comme en ligne.
FAMILIES = json.loads((Path(__file__).resolve().parent / 'families.json').read_text(encoding='utf-8'))
FOLDERS = {f['dir']: slug for slug, f in FAMILIES.items() if not slug.startswith('_')}

SUFFIX = re.compile(r'_\d{5}_(?=\.png$)', re.I)


def card_id(filename: str) -> str:
    return SUFFIX.sub('', filename)[:-4]


def source_pngs(folder: Path):
    """PNG d'un dossier de race : `sans_signature/` s'il existe, sinon le dossier
    lui-même ; les sous-dossiers (types de monstres) sont parcourus de la même
    façon, un niveau plus bas."""
    base = folder / 'sans_signature' if (folder / 'sans_signature').is_dir() else folder
    for p in base.iterdir():
        if p.name.startswith('.'):
            continue
        if p.is_file() and p.suffix.lower() == '.png':
            yield p
        elif p.is_dir() and p.name != 'sans_signature' and base is folder:
            yield from source_pngs(p)


def convert(src: Path, dst_dir: Path, cid: str, with_png: bool) -> None:
    im = Image.open(src).convert('RGB')
    w, h = im.size
    for target in WIDTHS:
        out = dst_dir / f'{cid}-{target}.webp'
        if out.exists():
            continue
        r = im if target >= w else im.resize((target, round(h * target / w)), Image.LANCZOS)
        r.save(out, 'WEBP', quality=QUALITY, method=6)
    if with_png:
        out = dst_dir / f'{cid}.png'
        if not out.exists():
            shutil.copy2(src, out)


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(args) != 2:
        print(__doc__)
        sys.exit(1)
    root, out_root = Path(args[0]), Path(args[1]) / 'cards'
    with_png = '--with-png' in sys.argv
    only = None
    for a in sys.argv:
        if a.startswith('--only='):
            only = set(a.split('=', 1)[1].split(','))

    total = 0
    for folder, slug in FOLDERS.items():
        if only and slug not in only:
            continue
        src_dir = root / folder
        if not src_dir.is_dir():
            print(f'!! {folder}: dossier absent, ignoré')
            continue
        files = sorted(source_pngs(src_dir))
        if not files:
            print(f'!! {folder}: aucun PNG, ignoré')
            continue
        dst_dir = out_root / slug
        dst_dir.mkdir(parents=True, exist_ok=True)
        for p in files:
            convert(p, dst_dir, card_id(p.name), with_png)
        total += len(files)
        print(f'{folder:14s} -> {slug:10s} {len(files):3d} cartes  (source: {folder})')
    print(f'\n{total} cartes, variantes {WIDTHS} dans {out_root}')


if __name__ == '__main__':
    main()
