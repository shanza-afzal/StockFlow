import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma opens (CPU cores x 2 + 1) connections by default, which is more than a Supabase
// pooler allows (pool_size 15 in session mode). Once the pool is full every request fails and
// pages that load data show up empty, so cap it unless DATABASE_URL already sets a limit.
function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || /[?&]connection_limit=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=5`;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: databaseUrl() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
