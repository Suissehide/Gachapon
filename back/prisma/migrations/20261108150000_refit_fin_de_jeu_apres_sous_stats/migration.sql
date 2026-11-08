-- Refit du contenu de fin de jeu après le réalignement des sous-stats plates
-- et de la vitesse, et le vol de vie divisé par deux : étages 11 à 20 des
-- quatre tours (FLOOR_SCALE, tower.definitions.ts) et étages 16-1 à 20-10 de
-- la campagne (NORMAL_HP_ANCHORS, BOSS_GEAR_COMPENSATION,
-- campaign.definitions.ts). Seuls les ennemis changent : butin, sprites et
-- ordre sont inchangés, le contenu figé (campagne 1-15, tours 1-10) n'est pas
-- touché. Migration de DONNÉES générée depuis les définitions.

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":53799,"baseAtk":9006,"baseDef":410,"baseSpd":122,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wyverns/WYVN-009","element":"FIRE"},{"baseHp":53799,"baseAtk":9006,"baseDef":410,"baseSpd":122,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/kobolds/KOBO-002","element":"FIRE"},{"baseHp":53799,"baseAtk":9006,"baseDef":410,"baseSpd":122,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/elementals/ELEM-008","element":"FIRE"}]'::jsonb
WHERE element = 'FIRE'::"CardElement" AND "index" = 11;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":59519,"baseAtk":9964,"baseDef":410,"baseSpd":124,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/kobolds/KOBO-003","element":"FIRE"},{"baseHp":59519,"baseAtk":9964,"baseDef":410,"baseSpd":124,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/elementals/ELEM-009","element":"FIRE"},{"baseHp":59519,"baseAtk":9964,"baseDef":410,"baseSpd":124,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/minotaurs/MINO-009","element":"FIRE"}]'::jsonb
WHERE element = 'FIRE'::"CardElement" AND "index" = 12;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":65830,"baseAtk":11020,"baseDef":410,"baseSpd":126,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/elementals/ELEM-010","element":"FIRE"},{"baseHp":65830,"baseAtk":11020,"baseDef":410,"baseSpd":126,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/minotaurs/MINO-010","element":"FIRE"},{"baseHp":65830,"baseAtk":11020,"baseDef":410,"baseSpd":126,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wyverns/WYVN-010","element":"FIRE"}]'::jsonb
WHERE element = 'FIRE'::"CardElement" AND "index" = 13;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":72822,"baseAtk":12190,"baseDef":410,"baseSpd":129,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/minotaurs/MINO-011","element":"FIRE"},{"baseHp":72822,"baseAtk":12190,"baseDef":410,"baseSpd":129,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wyverns/WYVN-011","element":"FIRE"},{"baseHp":72822,"baseAtk":12190,"baseDef":410,"baseSpd":129,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/kobolds/KOBO-004","element":"FIRE"}]'::jsonb
WHERE element = 'FIRE'::"CardElement" AND "index" = 14;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":80585,"baseAtk":13490,"baseDef":410,"baseSpd":131,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wyverns/WYVN-012","element":"FIRE"},{"baseHp":80585,"baseAtk":13490,"baseDef":410,"baseSpd":131,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/kobolds/KOBO-005","element":"FIRE"},{"baseHp":80585,"baseAtk":13490,"baseDef":410,"baseSpd":131,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/elementals/ELEM-011","element":"FIRE"}]'::jsonb
WHERE element = 'FIRE'::"CardElement" AND "index" = 15;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":89166,"baseAtk":14926,"baseDef":410,"baseSpd":133,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/kobolds/KOBO-006","element":"FIRE"},{"baseHp":89166,"baseAtk":14926,"baseDef":410,"baseSpd":133,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/elementals/ELEM-012","element":"FIRE"},{"baseHp":89166,"baseAtk":14926,"baseDef":410,"baseSpd":133,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/minotaurs/MINO-012","element":"FIRE"}]'::jsonb
WHERE element = 'FIRE'::"CardElement" AND "index" = 16;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":98654,"baseAtk":16515,"baseDef":410,"baseSpd":135,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/elementals/ELEM-013","element":"FIRE"},{"baseHp":98654,"baseAtk":16515,"baseDef":410,"baseSpd":135,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/minotaurs/MINO-013","element":"FIRE"},{"baseHp":98654,"baseAtk":16515,"baseDef":410,"baseSpd":135,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wyverns/WYVN-013","element":"FIRE"}]'::jsonb
WHERE element = 'FIRE'::"CardElement" AND "index" = 17;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":109142,"baseAtk":18270,"baseDef":410,"baseSpd":137,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/minotaurs/MINO-001","element":"FIRE"},{"baseHp":109142,"baseAtk":18270,"baseDef":410,"baseSpd":137,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wyverns/WYVN-014","element":"FIRE"},{"baseHp":109142,"baseAtk":18270,"baseDef":410,"baseSpd":137,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/kobolds/KOBO-001","element":"FIRE"}]'::jsonb
WHERE element = 'FIRE'::"CardElement" AND "index" = 18;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":120719,"baseAtk":20208,"baseDef":410,"baseSpd":139,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wyverns/WYVN-015","element":"FIRE"},{"baseHp":120719,"baseAtk":20208,"baseDef":410,"baseSpd":139,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/kobolds/KOBO-002","element":"FIRE"},{"baseHp":120719,"baseAtk":20208,"baseDef":410,"baseSpd":139,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/elementals/ELEM-014","element":"FIRE"}]'::jsonb
WHERE element = 'FIRE'::"CardElement" AND "index" = 19;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":133567,"baseAtk":22359,"baseDef":410,"baseSpd":141,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/kobolds/KOBO-003","element":"FIRE"},{"baseHp":133567,"baseAtk":22359,"baseDef":410,"baseSpd":141,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/elementals/ELEM-015","element":"FIRE"},{"baseHp":133567,"baseAtk":22359,"baseDef":410,"baseSpd":141,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/minotaurs/MINO-002","element":"FIRE"}]'::jsonb
WHERE element = 'FIRE'::"CardElement" AND "index" = 20;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":53799,"baseAtk":9006,"baseDef":410,"baseSpd":122,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-011","element":"WATER"},{"baseHp":53799,"baseAtk":9006,"baseDef":410,"baseSpd":122,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-002","element":"WATER"},{"baseHp":53799,"baseAtk":9006,"baseDef":410,"baseSpd":122,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-001","element":"WATER"}]'::jsonb
WHERE element = 'WATER'::"CardElement" AND "index" = 11;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":59519,"baseAtk":9964,"baseDef":410,"baseSpd":124,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-003","element":"WATER"},{"baseHp":59519,"baseAtk":9964,"baseDef":410,"baseSpd":124,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-002","element":"WATER"},{"baseHp":59519,"baseAtk":9964,"baseDef":410,"baseSpd":124,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-012","element":"WATER"}]'::jsonb
WHERE element = 'WATER'::"CardElement" AND "index" = 12;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":65830,"baseAtk":11020,"baseDef":410,"baseSpd":126,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-003","element":"WATER"},{"baseHp":65830,"baseAtk":11020,"baseDef":410,"baseSpd":126,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-001","element":"WATER"},{"baseHp":65830,"baseAtk":11020,"baseDef":410,"baseSpd":126,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-004","element":"WATER"}]'::jsonb
WHERE element = 'WATER'::"CardElement" AND "index" = 13;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":72822,"baseAtk":12190,"baseDef":410,"baseSpd":129,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-002","element":"WATER"},{"baseHp":72822,"baseAtk":12190,"baseDef":410,"baseSpd":129,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-005","element":"WATER"},{"baseHp":72822,"baseAtk":12190,"baseDef":410,"baseSpd":129,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-004","element":"WATER"}]'::jsonb
WHERE element = 'WATER'::"CardElement" AND "index" = 14;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":80585,"baseAtk":13490,"baseDef":410,"baseSpd":131,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-006","element":"WATER"},{"baseHp":80585,"baseAtk":13490,"baseDef":410,"baseSpd":131,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-005","element":"WATER"},{"baseHp":80585,"baseAtk":13490,"baseDef":410,"baseSpd":131,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-003","element":"WATER"}]'::jsonb
WHERE element = 'WATER'::"CardElement" AND "index" = 15;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":89166,"baseAtk":14926,"baseDef":410,"baseSpd":133,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-001","element":"WATER"},{"baseHp":89166,"baseAtk":14926,"baseDef":410,"baseSpd":133,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-004","element":"WATER"},{"baseHp":89166,"baseAtk":14926,"baseDef":410,"baseSpd":133,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-007","element":"WATER"}]'::jsonb
WHERE element = 'WATER'::"CardElement" AND "index" = 16;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":98654,"baseAtk":16515,"baseDef":410,"baseSpd":135,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-005","element":"WATER"},{"baseHp":98654,"baseAtk":16515,"baseDef":410,"baseSpd":135,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-008","element":"WATER"},{"baseHp":98654,"baseAtk":16515,"baseDef":410,"baseSpd":135,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-002","element":"WATER"}]'::jsonb
WHERE element = 'WATER'::"CardElement" AND "index" = 17;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":109142,"baseAtk":18270,"baseDef":410,"baseSpd":137,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-009","element":"WATER"},{"baseHp":109142,"baseAtk":18270,"baseDef":410,"baseSpd":137,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-003","element":"WATER"},{"baseHp":109142,"baseAtk":18270,"baseDef":410,"baseSpd":137,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-006","element":"WATER"}]'::jsonb
WHERE element = 'WATER'::"CardElement" AND "index" = 18;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":120719,"baseAtk":20208,"baseDef":410,"baseSpd":139,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-004","element":"WATER"},{"baseHp":120719,"baseAtk":20208,"baseDef":410,"baseSpd":139,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-007","element":"WATER"},{"baseHp":120719,"baseAtk":20208,"baseDef":410,"baseSpd":139,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-001","element":"WATER"}]'::jsonb
WHERE element = 'WATER'::"CardElement" AND "index" = 19;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":133567,"baseAtk":22359,"baseDef":410,"baseSpd":141,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-008","element":"WATER"},{"baseHp":133567,"baseAtk":22359,"baseDef":410,"baseSpd":141,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-002","element":"WATER"},{"baseHp":133567,"baseAtk":22359,"baseDef":410,"baseSpd":141,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-005","element":"WATER"}]'::jsonb
WHERE element = 'WATER'::"CardElement" AND "index" = 20;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":53799,"baseAtk":9006,"baseDef":410,"baseSpd":122,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-002","element":"NATURE"},{"baseHp":53799,"baseAtk":9006,"baseDef":410,"baseSpd":122,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-002","element":"NATURE"},{"baseHp":53799,"baseAtk":9006,"baseDef":410,"baseSpd":122,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-011","element":"NATURE"}]'::jsonb
WHERE element = 'NATURE'::"CardElement" AND "index" = 11;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":59519,"baseAtk":9964,"baseDef":410,"baseSpd":124,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-003","element":"NATURE"},{"baseHp":59519,"baseAtk":9964,"baseDef":410,"baseSpd":124,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-012","element":"NATURE"},{"baseHp":59519,"baseAtk":9964,"baseDef":410,"baseSpd":124,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-003","element":"NATURE"}]'::jsonb
WHERE element = 'NATURE'::"CardElement" AND "index" = 12;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":65830,"baseAtk":11020,"baseDef":410,"baseSpd":126,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-013","element":"NATURE"},{"baseHp":65830,"baseAtk":11020,"baseDef":410,"baseSpd":126,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-001","element":"NATURE"},{"baseHp":65830,"baseAtk":11020,"baseDef":410,"baseSpd":126,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-001","element":"NATURE"}]'::jsonb
WHERE element = 'NATURE'::"CardElement" AND "index" = 13;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":72822,"baseAtk":12190,"baseDef":410,"baseSpd":129,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-002","element":"NATURE"},{"baseHp":72822,"baseAtk":12190,"baseDef":410,"baseSpd":129,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-002","element":"NATURE"},{"baseHp":72822,"baseAtk":12190,"baseDef":410,"baseSpd":129,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-001","element":"NATURE"}]'::jsonb
WHERE element = 'NATURE'::"CardElement" AND "index" = 14;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":80585,"baseAtk":13490,"baseDef":410,"baseSpd":131,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-003","element":"NATURE"},{"baseHp":80585,"baseAtk":13490,"baseDef":410,"baseSpd":131,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-002","element":"NATURE"},{"baseHp":80585,"baseAtk":13490,"baseDef":410,"baseSpd":131,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-003","element":"NATURE"}]'::jsonb
WHERE element = 'NATURE'::"CardElement" AND "index" = 15;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":89166,"baseAtk":14926,"baseDef":410,"baseSpd":133,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-003","element":"NATURE"},{"baseHp":89166,"baseAtk":14926,"baseDef":410,"baseSpd":133,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-001","element":"NATURE"},{"baseHp":89166,"baseAtk":14926,"baseDef":410,"baseSpd":133,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-001","element":"NATURE"}]'::jsonb
WHERE element = 'NATURE'::"CardElement" AND "index" = 16;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":98654,"baseAtk":16515,"baseDef":410,"baseSpd":135,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-002","element":"NATURE"},{"baseHp":98654,"baseAtk":16515,"baseDef":410,"baseSpd":135,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-002","element":"NATURE"},{"baseHp":98654,"baseAtk":16515,"baseDef":410,"baseSpd":135,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-004","element":"NATURE"}]'::jsonb
WHERE element = 'NATURE'::"CardElement" AND "index" = 17;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":109142,"baseAtk":18270,"baseDef":410,"baseSpd":137,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-003","element":"NATURE"},{"baseHp":109142,"baseAtk":18270,"baseDef":410,"baseSpd":137,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-005","element":"NATURE"},{"baseHp":109142,"baseAtk":18270,"baseDef":410,"baseSpd":137,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-003","element":"NATURE"}]'::jsonb
WHERE element = 'NATURE'::"CardElement" AND "index" = 18;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":120719,"baseAtk":20208,"baseDef":410,"baseSpd":139,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-006","element":"NATURE"},{"baseHp":120719,"baseAtk":20208,"baseDef":410,"baseSpd":139,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-001","element":"NATURE"},{"baseHp":120719,"baseAtk":20208,"baseDef":410,"baseSpd":139,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-001","element":"NATURE"}]'::jsonb
WHERE element = 'NATURE'::"CardElement" AND "index" = 19;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":133567,"baseAtk":22359,"baseDef":410,"baseSpd":141,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-002","element":"NATURE"},{"baseHp":133567,"baseAtk":22359,"baseDef":410,"baseSpd":141,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-002","element":"NATURE"},{"baseHp":133567,"baseAtk":22359,"baseDef":410,"baseSpd":141,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-007","element":"NATURE"}]'::jsonb
WHERE element = 'NATURE'::"CardElement" AND "index" = 20;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":53799,"baseAtk":9006,"baseDef":410,"baseSpd":122,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-003","element":"EARTH"},{"baseHp":53799,"baseAtk":9006,"baseDef":410,"baseSpd":122,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-004","element":"EARTH"},{"baseHp":53799,"baseAtk":9006,"baseDef":410,"baseSpd":122,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-005","element":"EARTH"}]'::jsonb
WHERE element = 'EARTH'::"CardElement" AND "index" = 11;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":59519,"baseAtk":9964,"baseDef":410,"baseSpd":124,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-006","element":"EARTH"},{"baseHp":59519,"baseAtk":9964,"baseDef":410,"baseSpd":124,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-007","element":"EARTH"},{"baseHp":59519,"baseAtk":9964,"baseDef":410,"baseSpd":124,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-001","element":"EARTH"}]'::jsonb
WHERE element = 'EARTH'::"CardElement" AND "index" = 12;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":65830,"baseAtk":11020,"baseDef":410,"baseSpd":126,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-002","element":"EARTH"},{"baseHp":65830,"baseAtk":11020,"baseDef":410,"baseSpd":126,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-003","element":"EARTH"},{"baseHp":65830,"baseAtk":11020,"baseDef":410,"baseSpd":126,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-004","element":"EARTH"}]'::jsonb
WHERE element = 'EARTH'::"CardElement" AND "index" = 13;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":72822,"baseAtk":12190,"baseDef":410,"baseSpd":129,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-005","element":"EARTH"},{"baseHp":72822,"baseAtk":12190,"baseDef":410,"baseSpd":129,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-006","element":"EARTH"},{"baseHp":72822,"baseAtk":12190,"baseDef":410,"baseSpd":129,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-007","element":"EARTH"}]'::jsonb
WHERE element = 'EARTH'::"CardElement" AND "index" = 14;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":80585,"baseAtk":13490,"baseDef":410,"baseSpd":131,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-001","element":"EARTH"},{"baseHp":80585,"baseAtk":13490,"baseDef":410,"baseSpd":131,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-002","element":"EARTH"},{"baseHp":80585,"baseAtk":13490,"baseDef":410,"baseSpd":131,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-003","element":"EARTH"}]'::jsonb
WHERE element = 'EARTH'::"CardElement" AND "index" = 15;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":89166,"baseAtk":14926,"baseDef":410,"baseSpd":133,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-004","element":"EARTH"},{"baseHp":89166,"baseAtk":14926,"baseDef":410,"baseSpd":133,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-005","element":"EARTH"},{"baseHp":89166,"baseAtk":14926,"baseDef":410,"baseSpd":133,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-006","element":"EARTH"}]'::jsonb
WHERE element = 'EARTH'::"CardElement" AND "index" = 16;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":98654,"baseAtk":16515,"baseDef":410,"baseSpd":135,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-007","element":"EARTH"},{"baseHp":98654,"baseAtk":16515,"baseDef":410,"baseSpd":135,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-001","element":"EARTH"},{"baseHp":98654,"baseAtk":16515,"baseDef":410,"baseSpd":135,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-002","element":"EARTH"}]'::jsonb
WHERE element = 'EARTH'::"CardElement" AND "index" = 17;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":109142,"baseAtk":18270,"baseDef":410,"baseSpd":137,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-003","element":"EARTH"},{"baseHp":109142,"baseAtk":18270,"baseDef":410,"baseSpd":137,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-004","element":"EARTH"},{"baseHp":109142,"baseAtk":18270,"baseDef":410,"baseSpd":137,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-005","element":"EARTH"}]'::jsonb
WHERE element = 'EARTH'::"CardElement" AND "index" = 18;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":120719,"baseAtk":20208,"baseDef":410,"baseSpd":139,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-006","element":"EARTH"},{"baseHp":120719,"baseAtk":20208,"baseDef":410,"baseSpd":139,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-007","element":"EARTH"},{"baseHp":120719,"baseAtk":20208,"baseDef":410,"baseSpd":139,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-001","element":"EARTH"}]'::jsonb
WHERE element = 'EARTH'::"CardElement" AND "index" = 19;

UPDATE "TowerFloor" SET "enemyTeam" = '[{"baseHp":133567,"baseAtk":22359,"baseDef":410,"baseSpd":141,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-002","element":"EARTH"},{"baseHp":133567,"baseAtk":22359,"baseDef":410,"baseSpd":141,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-003","element":"EARTH"},{"baseHp":133567,"baseAtk":22359,"baseDef":410,"baseSpd":141,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-004","element":"EARTH"}]'::jsonb
WHERE element = 'EARTH'::"CardElement" AND "index" = 20;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":38799,"baseAtk":6495,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-002","element":"WATER"},{"baseHp":38799,"baseAtk":6495,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wisps/WISP-004","element":"LIGHT"},{"baseHp":38799,"baseAtk":6495,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/kobolds/KOBO-004","element":"FIRE"}]'::jsonb
WHERE chapter = 16 AND "index" = 1;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":41080,"baseAtk":6877,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wisps/WISP-005","element":"LIGHT"},{"baseHp":41080,"baseAtk":6877,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/kobolds/KOBO-005","element":"FIRE"},{"baseHp":41080,"baseAtk":6877,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-003","element":"WATER"}]'::jsonb
WHERE chapter = 16 AND "index" = 2;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":41979,"baseAtk":7027,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/kobolds/KOBO-006","element":"FIRE"},{"baseHp":41979,"baseAtk":7027,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-004","element":"WATER"},{"baseHp":41979,"baseAtk":7027,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wisps/WISP-006","element":"LIGHT"}]'::jsonb
WHERE chapter = 16 AND "index" = 3;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":42496,"baseAtk":7114,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-005","element":"WATER"},{"baseHp":42496,"baseAtk":7114,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wisps/WISP-007","element":"LIGHT"},{"baseHp":42496,"baseAtk":7114,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/kobolds/KOBO-001","element":"FIRE"}]'::jsonb
WHERE chapter = 16 AND "index" = 4;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":43000,"baseAtk":7198,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wisps/WISP-008","element":"LIGHT"},{"baseHp":43000,"baseAtk":7198,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/kobolds/KOBO-002","element":"FIRE"},{"baseHp":43000,"baseAtk":7198,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-001","element":"WATER"}]'::jsonb
WHERE chapter = 16 AND "index" = 5;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":45256,"baseAtk":7576,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/kobolds/KOBO-003","element":"FIRE"},{"baseHp":45256,"baseAtk":7576,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-002","element":"WATER"},{"baseHp":45256,"baseAtk":7576,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wisps/WISP-009","element":"LIGHT"}]'::jsonb
WHERE chapter = 16 AND "index" = 6;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":45301,"baseAtk":7583,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-003","element":"WATER"},{"baseHp":45301,"baseAtk":7583,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wisps/WISP-010","element":"LIGHT"},{"baseHp":45301,"baseAtk":7583,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/kobolds/KOBO-004","element":"FIRE"}]'::jsonb
WHERE chapter = 16 AND "index" = 7;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":45347,"baseAtk":7591,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wisps/WISP-011","element":"LIGHT"},{"baseHp":45347,"baseAtk":7591,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/kobolds/KOBO-005","element":"FIRE"},{"baseHp":45347,"baseAtk":7591,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-004","element":"WATER"}]'::jsonb
WHERE chapter = 16 AND "index" = 8;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":45491,"baseAtk":7615,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/kobolds/KOBO-006","element":"FIRE"},{"baseHp":45491,"baseAtk":7615,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/hydras/HYDRA-005","element":"WATER"},{"baseHp":45491,"baseAtk":7615,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wisps/WISP-001","element":"LIGHT"}]'::jsonb
WHERE chapter = 16 AND "index" = 9;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":131174,"baseAtk":6757,"baseDef":453,"baseSpd":102,"level":1,"palier":1,"attackPattern":"AOE_3","appearance":"monsters/bosses/BOSS-001","element":"DARK"}]'::jsonb
WHERE chapter = 16 AND "index" = 10;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":47134,"baseAtk":7890,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-004","element":"EARTH"},{"baseHp":47134,"baseAtk":7890,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/gnolls/GNOL-001","element":"DARK"},{"baseHp":47134,"baseAtk":7890,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-001","element":"NATURE"}]'::jsonb
WHERE chapter = 17 AND "index" = 1;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":47563,"baseAtk":7962,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/gnolls/GNOL-002","element":"DARK"},{"baseHp":47563,"baseAtk":7962,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-002","element":"NATURE"},{"baseHp":47563,"baseAtk":7962,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-005","element":"EARTH"}]'::jsonb
WHERE chapter = 17 AND "index" = 2;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":47612,"baseAtk":7970,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-003","element":"NATURE"},{"baseHp":47612,"baseAtk":7970,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-006","element":"EARTH"},{"baseHp":47612,"baseAtk":7970,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/gnolls/GNOL-003","element":"DARK"}]'::jsonb
WHERE chapter = 17 AND "index" = 3;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":51207,"baseAtk":8572,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-007","element":"EARTH"},{"baseHp":51207,"baseAtk":8572,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/gnolls/GNOL-004","element":"DARK"},{"baseHp":51207,"baseAtk":8572,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-001","element":"NATURE"}]'::jsonb
WHERE chapter = 17 AND "index" = 4;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":51258,"baseAtk":8581,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/gnolls/GNOL-005","element":"DARK"},{"baseHp":51258,"baseAtk":8581,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-002","element":"NATURE"},{"baseHp":51258,"baseAtk":8581,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-001","element":"EARTH"}]'::jsonb
WHERE chapter = 17 AND "index" = 5;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":51861,"baseAtk":8682,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-003","element":"NATURE"},{"baseHp":51861,"baseAtk":8682,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-002","element":"EARTH"},{"baseHp":51861,"baseAtk":8682,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/gnolls/GNOL-006","element":"DARK"}]'::jsonb
WHERE chapter = 17 AND "index" = 6;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":51930,"baseAtk":8693,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-003","element":"EARTH"},{"baseHp":51930,"baseAtk":8693,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/gnolls/GNOL-007","element":"DARK"},{"baseHp":51930,"baseAtk":8693,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-001","element":"NATURE"}]'::jsonb
WHERE chapter = 17 AND "index" = 7;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":53884,"baseAtk":9020,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/gnolls/GNOL-008","element":"DARK"},{"baseHp":53884,"baseAtk":9020,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-002","element":"NATURE"},{"baseHp":53884,"baseAtk":9020,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-004","element":"EARTH"}]'::jsonb
WHERE chapter = 17 AND "index" = 8;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":53938,"baseAtk":9029,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mushrooms/MYCO-003","element":"NATURE"},{"baseHp":53938,"baseAtk":9029,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-005","element":"EARTH"},{"baseHp":53938,"baseAtk":9029,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/gnolls/GNOL-009","element":"DARK"}]'::jsonb
WHERE chapter = 17 AND "index" = 9;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":151220,"baseAtk":7789,"baseDef":453,"baseSpd":102,"level":1,"palier":1,"attackPattern":"AOE_3","appearance":"monsters/bosses/BOSS-002","element":"LIGHT"}]'::jsonb
WHERE chapter = 17 AND "index" = 10;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":54010,"baseAtk":9041,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wyverns/WYVN-015","element":"FIRE"},{"baseHp":54010,"baseAtk":9041,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-001","element":"NATURE"},{"baseHp":54010,"baseAtk":9041,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-001","element":"WATER"}]'::jsonb
WHERE chapter = 18 AND "index" = 1;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":57021,"baseAtk":9545,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-002","element":"NATURE"},{"baseHp":57021,"baseAtk":9545,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-002","element":"WATER"},{"baseHp":57021,"baseAtk":9545,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wyverns/WYVN-016","element":"FIRE"}]'::jsonb
WHERE chapter = 18 AND "index" = 2;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":57078,"baseAtk":9555,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-003","element":"WATER"},{"baseHp":57078,"baseAtk":9555,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wyverns/WYVN-017","element":"FIRE"},{"baseHp":57078,"baseAtk":9555,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-003","element":"NATURE"}]'::jsonb
WHERE chapter = 18 AND "index" = 3;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":57382,"baseAtk":9606,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wyverns/WYVN-018","element":"FIRE"},{"baseHp":57382,"baseAtk":9606,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-001","element":"NATURE"},{"baseHp":57382,"baseAtk":9606,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-004","element":"WATER"}]'::jsonb
WHERE chapter = 18 AND "index" = 4;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":64171,"baseAtk":10742,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-002","element":"NATURE"},{"baseHp":64171,"baseAtk":10742,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-005","element":"WATER"},{"baseHp":64171,"baseAtk":10742,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wyverns/WYVN-001","element":"FIRE"}]'::jsonb
WHERE chapter = 18 AND "index" = 5;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":64236,"baseAtk":10753,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-006","element":"WATER"},{"baseHp":64236,"baseAtk":10753,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wyverns/WYVN-002","element":"FIRE"},{"baseHp":64236,"baseAtk":10753,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-003","element":"NATURE"}]'::jsonb
WHERE chapter = 18 AND "index" = 6;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":64300,"baseAtk":10764,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wyverns/WYVN-003","element":"FIRE"},{"baseHp":64300,"baseAtk":10764,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-001","element":"NATURE"},{"baseHp":64300,"baseAtk":10764,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-007","element":"WATER"}]'::jsonb
WHERE chapter = 18 AND "index" = 7;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":65902,"baseAtk":11032,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-002","element":"NATURE"},{"baseHp":65902,"baseAtk":11032,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-008","element":"WATER"},{"baseHp":65902,"baseAtk":11032,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wyverns/WYVN-004","element":"FIRE"}]'::jsonb
WHERE chapter = 18 AND "index" = 8;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":73290,"baseAtk":12269,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/slimes/SLIME-009","element":"WATER"},{"baseHp":73290,"baseAtk":12269,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wyverns/WYVN-005","element":"FIRE"},{"baseHp":73290,"baseAtk":12269,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/mimics/MIMC-003","element":"NATURE"}]'::jsonb
WHERE chapter = 18 AND "index" = 9;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":276320,"baseAtk":14233,"baseDef":453,"baseSpd":102,"level":1,"palier":1,"attackPattern":"AOE_3","appearance":"monsters/bosses/BOSS-003","element":"EARTH"}]'::jsonb
WHERE chapter = 18 AND "index" = 10;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":73817,"baseAtk":12357,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-006","element":"DARK"},{"baseHp":73817,"baseAtk":12357,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-006","element":"EARTH"},{"baseHp":73817,"baseAtk":12357,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-002","element":"NATURE"}]'::jsonb
WHERE chapter = 19 AND "index" = 1;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":73952,"baseAtk":12380,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-007","element":"EARTH"},{"baseHp":73952,"baseAtk":12380,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-003","element":"NATURE"},{"baseHp":73952,"baseAtk":12380,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-007","element":"DARK"}]'::jsonb
WHERE chapter = 19 AND "index" = 2;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":83055,"baseAtk":13903,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-004","element":"NATURE"},{"baseHp":83055,"baseAtk":13903,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-008","element":"DARK"},{"baseHp":83055,"baseAtk":13903,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-001","element":"EARTH"}]'::jsonb
WHERE chapter = 19 AND "index" = 3;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":83138,"baseAtk":13917,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-009","element":"DARK"},{"baseHp":83138,"baseAtk":13917,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-002","element":"EARTH"},{"baseHp":83138,"baseAtk":13917,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-005","element":"NATURE"}]'::jsonb
WHERE chapter = 19 AND "index" = 4;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":85031,"baseAtk":14234,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-003","element":"EARTH"},{"baseHp":85031,"baseAtk":14234,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-006","element":"NATURE"},{"baseHp":85031,"baseAtk":14234,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-010","element":"DARK"}]'::jsonb
WHERE chapter = 19 AND "index" = 5;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":85194,"baseAtk":14262,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-007","element":"NATURE"},{"baseHp":85194,"baseAtk":14262,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-001","element":"DARK"},{"baseHp":85194,"baseAtk":14262,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-004","element":"EARTH"}]'::jsonb
WHERE chapter = 19 AND "index" = 6;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":94040,"baseAtk":15742,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-002","element":"DARK"},{"baseHp":94040,"baseAtk":15742,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-005","element":"EARTH"},{"baseHp":94040,"baseAtk":15742,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-008","element":"NATURE"}]'::jsonb
WHERE chapter = 19 AND "index" = 7;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":94134,"baseAtk":15758,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-006","element":"EARTH"},{"baseHp":94134,"baseAtk":15758,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-009","element":"NATURE"},{"baseHp":94134,"baseAtk":15758,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-003","element":"DARK"}]'::jsonb
WHERE chapter = 19 AND "index" = 8;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":95784,"baseAtk":16034,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/wolves/WOLF-010","element":"NATURE"},{"baseHp":95784,"baseAtk":16034,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-004","element":"DARK"},{"baseHp":95784,"baseAtk":16034,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/basilisks/BSLK-007","element":"EARTH"}]'::jsonb
WHERE chapter = 19 AND "index" = 9;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":370510,"baseAtk":19084,"baseDef":453,"baseSpd":102,"level":1,"palier":1,"attackPattern":"AOE_3","appearance":"monsters/bosses/BOSS-004","element":"WATER"}]'::jsonb
WHERE chapter = 19 AND "index" = 10;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":103253,"baseAtk":17285,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-005","element":"WATER"},{"baseHp":103253,"baseAtk":17285,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-005","element":"DARK"},{"baseHp":103253,"baseAtk":17285,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/elementals/ELEM-012","element":"FIRE"}]'::jsonb
WHERE chapter = 20 AND "index" = 1;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":103450,"baseAtk":17318,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-006","element":"DARK"},{"baseHp":103450,"baseAtk":17318,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/elementals/ELEM-013","element":"FIRE"},{"baseHp":103450,"baseAtk":17318,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-006","element":"WATER"}]'::jsonb
WHERE chapter = 20 AND "index" = 2;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":103556,"baseAtk":17335,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/elementals/ELEM-014","element":"FIRE"},{"baseHp":103556,"baseAtk":17335,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-007","element":"WATER"},{"baseHp":103556,"baseAtk":17335,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-007","element":"DARK"}]'::jsonb
WHERE chapter = 20 AND "index" = 3;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":103684,"baseAtk":17357,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-008","element":"WATER"},{"baseHp":103684,"baseAtk":17357,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-008","element":"DARK"},{"baseHp":103684,"baseAtk":17357,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/elementals/ELEM-015","element":"FIRE"}]'::jsonb
WHERE chapter = 20 AND "index" = 4;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":111745,"baseAtk":18706,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-009","element":"DARK"},{"baseHp":111745,"baseAtk":18706,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/elementals/ELEM-016","element":"FIRE"},{"baseHp":111745,"baseAtk":18706,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-009","element":"WATER"}]'::jsonb
WHERE chapter = 20 AND "index" = 5;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":112995,"baseAtk":18915,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/elementals/ELEM-001","element":"FIRE"},{"baseHp":112995,"baseAtk":18915,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-010","element":"WATER"},{"baseHp":112995,"baseAtk":18915,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-010","element":"DARK"}]'::jsonb
WHERE chapter = 20 AND "index" = 6;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":113124,"baseAtk":18937,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-011","element":"WATER"},{"baseHp":113124,"baseAtk":18937,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-001","element":"DARK"},{"baseHp":113124,"baseAtk":18937,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/elementals/ELEM-002","element":"FIRE"}]'::jsonb
WHERE chapter = 20 AND "index" = 7;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":114387,"baseAtk":19148,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-002","element":"DARK"},{"baseHp":114387,"baseAtk":19148,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/elementals/ELEM-003","element":"FIRE"},{"baseHp":114387,"baseAtk":19148,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-012","element":"WATER"}]'::jsonb
WHERE chapter = 20 AND "index" = 8;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":124423,"baseAtk":20829,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/elementals/ELEM-004","element":"FIRE"},{"baseHp":124423,"baseAtk":20829,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/krakens/KRAK-001","element":"WATER"},{"baseHp":124423,"baseAtk":20829,"baseDef":398,"baseSpd":102,"level":1,"palier":1,"attackPattern":"BASIC","appearance":"monsters/specters/SPEC-003","element":"DARK"}]'::jsonb
WHERE chapter = 20 AND "index" = 9;

UPDATE "CampaignStage" SET "enemyTeam" = '[{"baseHp":479880,"baseAtk":24718,"baseDef":453,"baseSpd":102,"level":1,"palier":1,"attackPattern":"AOE_3","appearance":"monsters/bosses/BOSS-005","element":"NATURE"}]'::jsonb
WHERE chapter = 20 AND "index" = 10;
