import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; };

function createPrismaClient() {
    const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
    const dbPath = dbUrl.replace(/^file:/, "");
    const adapter = new PrismaBetterSqlite3({ url: dbPath });
    return new PrismaClient({ adapter } as never);
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
