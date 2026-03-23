require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local", override: true });

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error("DATABASE_URL not set"); process.exit(1); }

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log("🌱 Seeding MedSpa Inventory...");

  const adminHash = bcrypt.hashSync("admin1234", 12);
  const managerHash = bcrypt.hashSync("manager1234", 12);
  const providerHash = bcrypt.hashSync("provider1234", 12);
  const deskHash = bcrypt.hashSync("desk1234", 12);

  const admin = await prisma.user.upsert({ where: { email: "owner@medspa.com" }, update: {}, create: { email: "owner@medspa.com", name: "Spa Owner", passwordHash: adminHash, role: "ADMIN" } });
  const manager = await prisma.user.upsert({ where: { email: "manager@medspa.com" }, update: {}, create: { email: "manager@medspa.com", name: "Sara Chen", passwordHash: managerHash, role: "MANAGER" } });
  const drNicole = await prisma.user.upsert({ where: { email: "dr.nicole@medspa.com" }, update: {}, create: { email: "dr.nicole@medspa.com", name: "Dr. Nicole Rivera", passwordHash: providerHash, role: "PROVIDER" } });
  const erin = await prisma.user.upsert({ where: { email: "erin@medspa.com" }, update: {}, create: { email: "erin@medspa.com", name: "Erin Walsh", passwordHash: providerHash, role: "PROVIDER" } });
  const front = await prisma.user.upsert({ where: { email: "front@medspa.com" }, update: {}, create: { email: "front@medspa.com", name: "Lily Park", passwordHash: deskHash, role: "FRONT_DESK" } });
  console.log("✅ Users created");

  const products = [
    { name: "Botox 100u Vial", category: "BOTOX", brand: "Allergan", sku: "BTX-100", unitType: "VIAL", costPerUnit: 620, reorderThreshold: 5, currentQuantity: 18, expirationDate: new Date("2026-08-15"), notes: "Refrigerate. Use within 24h of opening." },
    { name: "Dysport 300u Vial", category: "BOTOX", brand: "Galderma", sku: "DYS-300", unitType: "VIAL", costPerUnit: 540, reorderThreshold: 3, currentQuantity: 9, expirationDate: new Date("2026-06-30") },
    { name: "Xeomin 100u Vial", category: "BOTOX", brand: "Merz", sku: "XMN-100", unitType: "VIAL", costPerUnit: 590, reorderThreshold: 2, currentQuantity: 4, expirationDate: new Date("2026-12-01") },
    { name: "Juvederm Ultra XC 1mL", category: "FILLER", brand: "Allergan", sku: "JVD-ULT", unitType: "SYRINGE", costPerUnit: 195, reorderThreshold: 4, currentQuantity: 12, expirationDate: new Date("2026-10-01") },
    { name: "Juvederm Voluma XC 1mL", category: "FILLER", brand: "Allergan", sku: "JVD-VLM", unitType: "SYRINGE", costPerUnit: 240, reorderThreshold: 3, currentQuantity: 7, expirationDate: new Date("2026-09-15") },
    { name: "Restylane Lyft 1mL", category: "FILLER", brand: "Galderma", sku: "RST-LYT", unitType: "SYRINGE", costPerUnit: 215, reorderThreshold: 3, currentQuantity: 5, expirationDate: new Date("2027-01-20") },
    { name: "Restylane Kysse 1mL", category: "FILLER", brand: "Galderma", sku: "RST-KSS", unitType: "SYRINGE", costPerUnit: 205, reorderThreshold: 3, currentQuantity: 8, expirationDate: new Date("2026-11-10") },
    { name: "Belotero Soft 1mL", category: "FILLER", brand: "Merz", sku: "BLT-SCU", unitType: "SYRINGE", costPerUnit: 185, reorderThreshold: 2, currentQuantity: 3, expirationDate: new Date("2026-07-01") },
    { name: "ZO Skin Health Exfoliating Cleanser", category: "SKINCARE", brand: "ZO Skin Health", sku: "ZO-CLNSR", unitType: "BOTTLE", costPerUnit: 38, sellingPrice: 68, reorderThreshold: 8, currentQuantity: 24 },
    { name: "SkinMedica TNS Advanced+ Serum", category: "SKINCARE", brand: "SkinMedica", sku: "SKMD-TNS", unitType: "BOTTLE", costPerUnit: 145, sellingPrice: 295, reorderThreshold: 3, currentQuantity: 6 },
    { name: "iS Clinical Active Serum", category: "SKINCARE", brand: "iS Clinical", sku: "ISC-ACT", unitType: "BOTTLE", costPerUnit: 78, sellingPrice: 150, reorderThreshold: 4, currentQuantity: 9 },
    { name: "SkinBetter Alto Defense Serum", category: "SKINCARE", brand: "SkinBetter Science", sku: "SB-ALTO", unitType: "BOTTLE", costPerUnit: 95, sellingPrice: 185, reorderThreshold: 3, currentQuantity: 7 },
    { name: "EltaMD UV Clear SPF 46", category: "RETAIL", brand: "EltaMD", sku: "RTL-SPF50", unitType: "BOTTLE", costPerUnit: 22, sellingPrice: 39, reorderThreshold: 10, currentQuantity: 32 },
    { name: "CeraVe Moisturizing Cream 16oz", category: "RETAIL", brand: "CeraVe", sku: "RTL-CERAVE", unitType: "BOTTLE", costPerUnit: 11, sellingPrice: 19, reorderThreshold: 12, currentQuantity: 28 },
    { name: "ZO Skin Health Renewal Cream", category: "RETAIL", brand: "ZO Skin Health", sku: "RTL-ECREAM", unitType: "BOTTLE", costPerUnit: 68, sellingPrice: 132, reorderThreshold: 5, currentQuantity: 14 },
    { name: "Syringes 1mL 30G x 0.5in (Box/100)", category: "SUPPLIES", brand: null, sku: "SUP-30G", unitType: "BOX", costPerUnit: 28, reorderThreshold: 5, currentQuantity: 22 },
    { name: "Bacteriostatic Saline 30mL Vial", category: "SUPPLIES", brand: null, sku: "SUP-SALINE", unitType: "VIAL", costPerUnit: 9, reorderThreshold: 10, currentQuantity: 25 },
    { name: "Alcohol Swabs (Box/200)", category: "SUPPLIES", brand: null, sku: "SUP-ALCSW", unitType: "BOX", costPerUnit: 8, reorderThreshold: 10, currentQuantity: 3 },
    { name: "Nitrile Gloves Medium (Box/100)", category: "SUPPLIES", brand: null, sku: "SUP-GLVS", unitType: "BOX", costPerUnit: 12, reorderThreshold: 8, currentQuantity: 18 },
  ];

  for (const p of products) {
    await prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: p });
  }
  console.log(`✅ ${products.length} products created`);

  const botox = await prisma.product.findUnique({ where: { sku: "BTX-100" } });
  const jvdUlt = await prisma.product.findUnique({ where: { sku: "JVD-ULT" } });
  const tns = await prisma.product.findUnique({ where: { sku: "SKMD-TNS" } });
  const spf = await prisma.product.findUnique({ where: { sku: "RTL-SPF50" } });

  if (botox && jvdUlt && tns && spf) {
    await prisma.transaction.createMany({
      data: [
        { productId: botox.id, transactionType: "USE", quantity: 2, unitType: "VIAL", quantityBefore: 20, quantityAfter: 18, loggedById: drNicole.id, performedById: drNicole.id, clientName: "Sarah M.", createdAt: new Date(Date.now() - 1*3600000) },
        { productId: jvdUlt.id, transactionType: "USE", quantity: 1, unitType: "SYRINGE", quantityBefore: 13, quantityAfter: 12, loggedById: drNicole.id, performedById: drNicole.id, clientName: "Sarah M.", createdAt: new Date(Date.now() - 1*3600000) },
        { productId: botox.id, transactionType: "USE", quantity: 1, unitType: "VIAL", quantityBefore: 21, quantityAfter: 20, loggedById: erin.id, performedById: erin.id, clientName: "Lisa T.", createdAt: new Date(Date.now() - 5*3600000) },
        { productId: tns.id, transactionType: "SELL", quantity: 1, unitType: "BOTTLE", quantityBefore: 7, quantityAfter: 6, loggedById: front.id, performedById: front.id, clientName: "Janet B.", createdAt: new Date(Date.now() - 24*3600000) },
        { productId: spf.id, transactionType: "SELL", quantity: 2, unitType: "BOTTLE", quantityBefore: 34, quantityAfter: 32, loggedById: front.id, performedById: front.id, clientName: "Amanda R.", createdAt: new Date(Date.now() - 24*3600000) },
        { productId: botox.id, transactionType: "WASTE", quantity: 1, unitType: "VIAL", quantityBefore: 22, quantityAfter: 21, loggedById: drNicole.id, performedById: drNicole.id, wasteReason: "CONTAMINATED", notes: "Vial dropped, sterility compromised.", createdAt: new Date(Date.now() - 48*3600000) },
        { productId: botox.id, transactionType: "RECEIVE", quantity: 10, unitType: "VIAL", quantityBefore: 8, quantityAfter: 18, loggedById: manager.id, performedById: manager.id, notes: "Monthly order from Allergan.", createdAt: new Date(Date.now() - 72*3600000) },
      ],
    });
    console.log("✅ Transactions created");
  }

  console.log("\n🎉 Done! Login credentials:");
  console.log("  Admin:      owner@medspa.com    / admin1234");
  console.log("  Manager:    manager@medspa.com   / manager1234");
  console.log("  Provider:   dr.nicole@medspa.com / provider1234");
  console.log("  Provider:   erin@medspa.com      / provider1234");
  console.log("  Front Desk: front@medspa.com     / desk1234");
}

main().catch(console.error).finally(() => prisma.$disconnect());
