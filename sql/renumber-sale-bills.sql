-- Renumbers every sale bill so each bill date starts again at 1 (in the order the bills were
-- created). Safe to re-run. Purchase bills are not touched.
UPDATE "Bill" b
SET "billNo" = r.n
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "date"::date ORDER BY id) AS n
  FROM "Bill"
  WHERE type = 'SALE'
) r
WHERE b.id = r.id AND b."billNo" <> r.n;
