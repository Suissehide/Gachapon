-- Two hidden achievements ('Arc-en-ciel' and 'Pactole') still carried the '???'
-- placeholder as their real description: the localize_achievement_strings
-- migration only patched 'first_pull'. The '???' masking is meant for LOCKED
-- hidden achievements only — once unlocked the DB description is shown verbatim,
-- so these read as having no description even after being validated.

UPDATE "Achievement" SET description = 'Obtenir une carte commune, peu commune, rare et épique dans la même journée.' WHERE key = 'rainbow_day';
UPDATE "Achievement" SET description = 'Atteindre 10 000 de poussière.'                                             WHERE key = 'dust_hoarder';
