-- Clears all transactional data from a PostgreSQL database created with
-- sql/schema.sql, without dropping tables. Run this in your Postgres
-- SQL editor (Supabase/Neon/etc.) or via psql.

TRUNCATE TABLE "BillItem", "Bill", "AmountEntry", "Item", "Account"
  RESTART IDENTITY CASCADE;

-- Keep the Settings row (company name/currency/address/phone) but reset
-- the bill numbering so the next Sale/Purchase bill starts at 1
UPDATE "Settings" SET "nextSaleNo" = 1, "nextPurchNo" = 1;
