/**
 * One-time demo data cleanup script.
 * Removes all demo products, transactions, audit logs, and demo users.
 * Keeps: owner@medspa.com (your real admin account).
 *
 * Usage:
 *   node prisma/cleanup.js
 */

require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local", override: true });

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error("DATABASE_URL not set"); process.exit(1); }

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const KEEP_EMAIL = "owner@medspa.com";

async function main() {
  console.log("🧹 Cleaning demo data from MedSpa Inventory...\n");

  // 1. Delete all transactions (references products + users)
  const txDeleted = await prisma.transaction.deleteMany({});
  console.log(`✅ Deleted ${txDeleted.count} transaction(s)`);

  // 2. Delete all audit logs (references users)
  const auditDeleted = await prisma.auditLog.deleteMany({});
  console.log(`✅ Deleted ${auditDeleted.count} audit log entry/entries`);

  // 3. Delete all products
  const prodDeleted = await prisma.product.deleteMany({});
  console.log(`✅ Deleted ${prodDeleted.count} product(s)`);

  // 4. Delete demo users — keep only the real admin
  const usersDeleted = await prisma.user.deleteMany({
    where: { email: { not: KEEP_EMAIL } },
  });
  console.log(`✅ Deleted ${usersDeleted.count} demo user(s) (kept: ${KEEP_EMAIL})`);

  // 5. Confirm what remains
  const remaining = await prisma.user.findMany({ select: { email: true, name: true, role: true } });
  console.log("\n📋 Remaining users:");
  remaining.forEach((u) => console.log(`   ${u.role.padEnd(12)} ${u.email}  (${u.name})`));

  console.log("\n🎉 Database is clean and ready for real data entry.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
