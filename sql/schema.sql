-- Safi ERP — PostgreSQL schema
--
-- Matches prisma/schema.prisma exactly, so pointing DATABASE_URL at a database
-- created with this script works with the app as-is (after switching the
-- datasource provider in prisma/schema.prisma from "sqlite" to "postgresql").
--
-- Which page uses which table:
--   Dashboard               Bill, BillItem, Item, Account, AmountEntry (read)
--   Sale Bill               Bill + BillItem (write), Item, Account, Settings.nextSaleNo
--   Sale Bills Register     Bill + BillItem (read/delete)
--   Amount Entry            AmountEntry (read/write), Account
--   Stock                   Item (read/write), BillItem (movement in/out)
--   Cash                    AmountEntry (write: one side NULL = the cash side),
--                           Bill where mode = 'CASH' (read)
--   Ledger                  Account, Bill, AmountEntry (read)
--   Accounts                Account (read/write/delete)
--   Purchase Bill           Bill + BillItem (write), Item, Account, Settings.nextPurchNo
--   Purchase Bills Register Bill + BillItem (read/delete)
--   Sales Reports           Bill + BillItem where type = 'SALE'
--   Purchase Reports        Bill + BillItem where type = 'PURCHASE'
--   Progress Report         Bill, BillItem, AmountEntry, Account
--   Settings                Settings
--
-- Conventions the app relies on:
--   * Account.openingBalance  > 0 = udhar (they owe you), < 0 = advance (already paid).
--   * AmountEntry with exactly one of fromAccountId / toAccountId NULL is a cash
--     transaction: toAccountId NULL = cash in, fromAccountId NULL = cash out.
--     Both sides set = a transfer between two accounts (Amount Entry page).
--   * Bill.paidAmount equals Bill.total for cash bills; the difference is the due.

CREATE SCHEMA IF NOT EXISTS "public";

-- Enums -----------------------------------------------------------------

CREATE TYPE "AccountType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'BOTH', 'CAPITAL', 'EXPENSE');

CREATE TYPE "BillType" AS ENUM ('SALE', 'PURCHASE');

CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'CREDIT');

-- Tables ----------------------------------------------------------------

CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "purchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openingStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL DEFAULT 'BOTH',
    "phone" TEXT,
    "address" TEXT,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Bill" (
    "id" SERIAL NOT NULL,
    "billNo" INTEGER NOT NULL,
    "type" "BillType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "accountId" INTEGER,
    "total" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillItem" (
    "id" SERIAL NOT NULL,
    "billId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BillItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AmountEntry" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "fromAccountId" INTEGER,
    "toAccountId" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmountEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Settings" (
    "id" SERIAL NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'Safi ERP',
    "currency" TEXT NOT NULL DEFAULT 'Rs.',
    "address" TEXT,
    "phone" TEXT,
    "nextSaleNo" INTEGER NOT NULL DEFAULT 1,
    "nextPurchNo" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- Indexes ---------------------------------------------------------------

CREATE UNIQUE INDEX "Item_name_key" ON "Item"("name");

CREATE INDEX "Item_name_idx" ON "Item"("name");

CREATE INDEX "Account_name_idx" ON "Account"("name");

CREATE INDEX "Bill_type_date_idx" ON "Bill"("type", "date");

CREATE INDEX "Bill_accountId_idx" ON "Bill"("accountId");

CREATE INDEX "BillItem_billId_idx" ON "BillItem"("billId");

CREATE INDEX "BillItem_itemId_idx" ON "BillItem"("itemId");

CREATE INDEX "AmountEntry_date_idx" ON "AmountEntry"("date");

CREATE INDEX "AmountEntry_fromAccountId_idx" ON "AmountEntry"("fromAccountId");

CREATE INDEX "AmountEntry_toAccountId_idx" ON "AmountEntry"("toAccountId");

-- Foreign keys ----------------------------------------------------------

ALTER TABLE "Bill" ADD CONSTRAINT "Bill_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AmountEntry" ADD CONSTRAINT "AmountEntry_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AmountEntry" ADD CONSTRAINT "AmountEntry_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Starting data ---------------------------------------------------------

INSERT INTO "Settings" ("companyName", "currency", "nextSaleNo", "nextPurchNo")
VALUES ('Safi ERP', 'Rs.', 1, 1);
