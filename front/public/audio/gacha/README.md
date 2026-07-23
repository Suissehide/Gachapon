# Sons du tirage gacha

Le moteur audio (`src/components/machine/capsule/capsuleAudio.ts`) cherche ici
des fichiers réels et retombe sur des placeholders synthétisés (WebAudio) pour
chaque fichier manquant. Déposer les assets suivants pour remplacer les synths :

| Fichier | Rôle | Durée conseillée |
|---|---|---|
| `clack.webm` / `clack.mp3` | Claquement mécanique d'un à-coup de shake | ~0.1 s |
| `charge.webm` / `charge.mp3` | Whir de charge (bouclé pendant la vibration) | 1–2 s loop |
| `sting.webm` / `sting.mp3` | Sting de tease quand la rareté s'annonce | ~0.5 s |
| `inhale.webm` / `inhale.mp3` | Aspiration juste avant l'explosion | ~0.35 s |
| `burst.webm` / `burst.mp3` | Explosion de la capsule + thud | ~0.6 s |
| `fanfare.webm` / `fanfare.mp3` | Fanfare de reveal | ~1 s |
| `coin.webm` / `coin.mp3` | Pièce insérée dans la fente (machine) | ~0.3 s |
| `crank.webm` / `crank.mp3` | Cran du bouton rotatif (machine) | ~0.1 s |
| `rattle.webm` / `rattle.mp3` | Brassage des capsules dans le globe | ~0.7 s |
| `dispense.webm` / `dispense.mp3` | Trappe + capsule éjectée | ~0.4 s |

`webm` est tenté d'abord, `mp3` en secours. Les fichiers sont chargés au
premier clic de tirage ; des 404 en console sont normaux tant qu'ils manquent.
