-- Database schema (SQLite)
-- Generated from the live dev.db — this is the exact DDL Prisma applied.
-- Source of truth is prisma/schema.prisma; regenerate this file after
-- schema changes with: npx prisma db push  (then re-dump sqlite_master).

CREATE TABLE "Item" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "purchasePrice" REAL NOT NULL DEFAULT 0,
    "salePrice" REAL NOT NULL DEFAULT 0,
    "openingStock" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Item_name_key" ON "Item"("name");
CREATE INDEX "Item_name_idx" ON "Item"("name");

CREATE TABLE "Account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BOTH', -- CUSTOMER | SUPPLIER | BOTH | CAPITAL | EXPENSE
    "phone" TEXT,
    "address" TEXT,
    "openingBalance" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "Account_name_idx" ON "Account"("name");

CREATE TABLE "Bill" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "billNo" INTEGER NOT NULL,
    "type" TEXT NOT NULL,        -- SALE | PURCHASE
    "date" DATETIME NOT NULL,
    "mode" TEXT NOT NULL,        -- CASH | CREDIT
    "accountId" INTEGER,
    "total" REAL NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bill_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Bill_type_date_idx" ON "Bill"("type", "date");
CREATE INDEX "Bill_accountId_idx" ON "Bill"("accountId");

CREATE TABLE "BillItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "billId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "qty" REAL NOT NULL,
    "price" REAL NOT NULL,
    "costPrice" REAL NOT NULL DEFAULT 0, -- snapshot of Item.purchasePrice at sale time, drives Profit
    "subtotal" REAL NOT NULL,
    CONSTRAINT "BillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BillItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "BillItem_billId_idx" ON "BillItem"("billId");
CREATE INDEX "BillItem_itemId_idx" ON "BillItem"("itemId");

CREATE TABLE "AmountEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jvNo" INTEGER NOT NULL,       -- groups multiple legs into one Journal Voucher
    "date" DATETIME NOT NULL,
    "fromAccountId" INTEGER,       -- NULL = Cash
    "toAccountId" INTEGER,         -- NULL = Cash
    "amount" REAL NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AmountEntry_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AmountEntry_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AmountEntry_date_idx" ON "AmountEntry"("date");
CREATE INDEX "AmountEntry_jvNo_idx" ON "AmountEntry"("jvNo");
CREATE INDEX "AmountEntry_fromAccountId_idx" ON "AmountEntry"("fromAccountId");
CREATE INDEX "AmountEntry_toAccountId_idx" ON "AmountEntry"("toAccountId");

CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyName" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'Rs.',
    "address" TEXT,
    "phone" TEXT,
    "nextSaleNo" INTEGER NOT NULL DEFAULT 1,
    "nextPurchNo" INTEGER NOT NULL DEFAULT 1,
    "nextJvNo" INTEGER NOT NULL DEFAULT 1
);
