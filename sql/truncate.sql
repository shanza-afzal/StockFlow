-- Clears all transactional data from the SQLite dev database (dev.db)
-- without dropping tables. Run with: sqlite3 prisma/dev.db < sql/truncate.sql

PRAGMA foreign_keys = OFF;

DELETE FROM "BillItem";
DELETE FROM "Bill";
DELETE FROM "AmountEntry";
DELETE FROM "Item";
DELETE FROM "Account";

-- Reset autoincrement counters so new rows start back at id 1
DELETE FROM sqlite_sequence WHERE name IN ('BillItem', 'Bill', 'AmountEntry', 'Item', 'Account');

-- Keep the Settings row (company name/currency/address/phone) but reset
-- the bill/JV numbering so the next Sale/Purchase/Amount Entry starts at 1
UPDATE "Settings" SET "nextSaleNo" = 1, "nextPurchNo" = 1, "nextJvNo" = 1;

PRAGMA foreign_keys = ON;
