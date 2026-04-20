import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
    const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
    const dbPath = dbUrl.replace(/^file:/, "");
    const adapter = new PrismaPg(dbPath);
    return new PrismaClient({ adapter } as never);
}

export const prisma = createPrismaClient();
