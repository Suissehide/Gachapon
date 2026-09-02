-- Renomme les 5 slots d'accessoires vers des pièces portables par un humain.
--
-- Écrite à la main, contrairement à la règle habituelle du dépôt : Prisma ne
-- sait pas détecter un renommage de valeur d'enum. `prisma migrate dev`
-- proposait de SUPPRIMER [ACCESSORY, SAP, EMBER, PRISM, MONOLITH] puis de
-- recréer les nouvelles, ce qui échoue dès qu'une ligne les utilise (et en
-- détruirait le contenu si elle passait). `ALTER TYPE ... RENAME VALUE` fait
-- le travail sans toucher une seule ligne : les Equipment et UserEquipment
-- existants conservent leur slot.
--
-- ACCESSORY -> RING    (Anneau)
-- SAP       -> AMULET  (Amulette,  PV,        tour NATURE)
-- EMBER     -> GLOVES  (Gants,     critDmg,   tour FEU)
-- PRISM     -> BOOTS   (Bottes,    critRate,  tour EAU)
-- MONOLITH  -> BELT    (Ceinture,  armorPen,  tour TERRE)

ALTER TYPE "EquipmentSlot" RENAME VALUE 'ACCESSORY' TO 'RING';
ALTER TYPE "EquipmentSlot" RENAME VALUE 'SAP' TO 'AMULET';
ALTER TYPE "EquipmentSlot" RENAME VALUE 'EMBER' TO 'GLOVES';
ALTER TYPE "EquipmentSlot" RENAME VALUE 'PRISM' TO 'BOOTS';
ALTER TYPE "EquipmentSlot" RENAME VALUE 'MONOLITH' TO 'BELT';
