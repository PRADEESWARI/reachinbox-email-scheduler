import { PrismaClient } from "@prisma/client";

// Single shared Prisma instance across the app (API process + worker process
// each get their own when they import this, which is correct - each is a
// separate Node process talking to the same Postgres).
export const prisma = new PrismaClient();
