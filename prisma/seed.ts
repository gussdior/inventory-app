import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding MedSpa Inventory database...");

  // ──────────────────────────────────────────────
  // Users
  // ──────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin1234", 12);
  const managerHash = await bcrypt.hash("manager1234", 12);
  const providerHash = await bcrypt.hash("provider1234", 12);
  const deskHash = await bcrypt.hash("desk1234", 12);

  const admin = await prisma.user.upsert({
    where: { email: "owner@medspa.com" },
    update: {},
    create: { email: "owner@medspa.com", name: "Spa Owner", passwordHash: adminHash, role: "ADMIN" },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@medspa.com" },
    update: {},
    create: { email: "manager@medspa.com", name: "Sara Chen", passwordHash: managerHash, role: "MANAGER" },
  });

  const dr_nicole = await prisma.user.upsert({
    where: { email: "dr.nicole@medspa.com" },
    update: {},
    create: { email: "dr.nicole@medspa.com", name: "Dr. Nicole Rivera", passwordHash: providerHash, role: "PROVIDER" },
  });

  const erin = await prisma.user.upsert({
    where: { email: "erin@medspa.com" },
    update: {},
    create: { email: "erin@medspa.com", name: "Erin Walsh", passwordHash: providerHash, role: "PROVIDER" },
  });

  const frontdesk = await prisma.user.upsert({
    where: { email: "front@medspa.com" },
    update: {},
    create: { email: "front@medspa.com", name: "Lily Park", passwordHash: deskHash, role: "FRONT_DESK" },
  });

  console.log("✅ Users created");

  // ──────────────────────────────────────────────
  // Products
  // ──────────────────────────────────────────────
  const products = await Promise.all([
    // BOTOX
    prisma.product.upsert({
      where: { sku: "BTX-100" },
      update: {},
      create: {
        name: "Botox 100u Vial", category: "BOTOX", brand: "Allergan",
        sku: "BTX-100", unitType: "VIAL", costPerUnit: 620,
        sellingPrice: null, reorderThreshold: 5, currentQuantity: 18,
        expirationDate: new Date("2026-08-15"),
        notes: "Refrigerate. Reconstitute with 2.5mL saline = 40u/mL. Use within 24h of opening.",
      },
    }),
    prisma.product.upsert({
      where: { sku: "DYS-300" },
      update: {},
      create: {
        name: "Dysport 300u Vial", category: "BOTOX", brand: "Galderma",
        sku: "DYS-300", unitType: "VIAL", costPerUnit: 540,
        sellingPrice: null, reorderThreshold: 3, currentQuantity: 9,
        expirationDate: new Date("2026-06-30"),
        notes: "Refrigerate. 1 Dysport unit ≠ 1 Botox unit. Dilution 1.5mL per 300u = 20u/0.1mL.",
      },
    }),
    prisma.product.upsert({
      where: { sku: "XMN-100" },
      update: {},
      create: {
        name: "Xeomin 100u Vial", category: "BOTOX", brand: "Merz",
        sku: "XMN-100", unitType: "VIAL", costPerUnit: 590,
        sellingPrice: null, reorderThreshold: 2, currentQuantity: 4,
        expirationDate: new Date("2026-12-01"),
        notes: "Refrigerate. Reconstitute with 2.5mL NS.",
      },
    }),

    // FILLERS
    prisma.product.upsert({
      where: { sku: "JVD-ULT" },
      update: {},
      create: {
        name: "Juvederm Ultra XC 1mL", category: "FILLER", brand: "Allergan",
        sku: "JVD-ULT", unitType: "SYRINGE", costPerUnit: 195,
        sellingPrice: null, reorderThreshold: 4, currentQuantity: 12,
        expirationDate: new Date("2026-10-01"),
        notes: "Refrigerate. Lidocaine included. For lips and perioral area.",
      },
    }),
    prisma.product.upsert({
      where: { sku: "JVD-VLM" },
      update: {},
      create: {
        name: "Juvederm Voluma XC 1mL", category: "FILLER", brand: "Allergan",
        sku: "JVD-VLM", unitType: "SYRINGE", costPerUnit: 240,
        sellingPrice: null, reorderThreshold: 3, currentQuantity: 7,
        expirationDate: new Date("2026-09-15"),
        notes: "For cheek augmentation and midface. Deep injection.",
      },
    }),
    prisma.product.upsert({
      where: { sku: "RST-LYT" },
      update: {},
      create: {
        name: "Restylane Lyft 1mL", category: "FILLER", brand: "Galderma",
        sku: "RST-LYT", unitType: "SYRINGE", costPerUnit: 215,
        sellingPrice: null, reorderThreshold: 3, currentQuantity: 5,
        expirationDate: new Date("2027-01-20"),
        notes: "Cheeks and hands. Lidocaine included.",
      },
    }),
    prisma.product.upsert({
      where: { sku: "RST-KSS" },
      update: {},
      create: {
        name: "Restylane Kysse 1mL", category: "FILLER", brand: "Galderma",
        sku: "RST-KSS", unitType: "SYRINGE", costPerUnit: 205,
        sellingPrice: null, reorderThreshold: 3, currentQuantity: 8,
        expirationDate: new Date("2026-11-10"),
        notes: "Lip augmentation and perioral lines.",
      },
    }),
    prisma.product.upsert({
      where: { sku: "BLT-SCU" },
      update: {},
      create: {
        name: "Belotero Soft 1mL", category: "FILLER", brand: "Merz",
        sku: "BLT-SCU", unitType: "SYRINGE", costPerUnit: 185,
        sellingPrice: null, reorderThreshold: 2, currentQuantity: 3,
        expirationDate: new Date("2026-07-01"),
        notes: "Fine lines and superficial injections.",
      },
    }),

    // SKINCARE - Clinical
    prisma.product.upsert({
      where: { sku: "ZO-CLNSR" },
      update: {},
      create: {
        name: "ZO Skin Health Exfoliating Cleanser", category: "SKINCARE", brand: "ZO Skin Health",
        sku: "ZO-CLNSR", unitType: "BOTTLE", costPerUnit: 38,
        sellingPrice: 68, reorderThreshold: 8, currentQuantity: 24,
        notes: "For treatment and retail use.",
      },
    }),
    prisma.product.upsert({
      where: { sku: "ZO-EXF" },
      update: {},
      create: {
        name: "ZO Skin Health Exfoliation Accelerator", category: "SKINCARE", brand: "ZO Skin Health",
        sku: "ZO-EXF", unitType: "BOTTLE", costPerUnit: 52,
        sellingPrice: 98, reorderThreshold: 5, currentQuantity: 11,
      },
    }),
    prisma.product.upsert({
      where: { sku: "SKMD-TNS" },
      update: {},
      create: {
        name: "SkinMedica TNS Advanced+ Serum", category: "SKINCARE", brand: "SkinMedica",
        sku: "SKMD-TNS", unitType: "BOTTLE", costPerUnit: 145,
        sellingPrice: 295, reorderThreshold: 3, currentQuantity: 6,
        notes: "High-value serum. Count carefully.",
      },
    }),
    prisma.product.upsert({
      where: { sku: "ISC-ACT" },
      update: {},
      create: {
        name: "iS Clinical Active Serum", category: "SKINCARE", brand: "iS Clinical",
        sku: "ISC-ACT", unitType: "BOTTLE", costPerUnit: 78,
        sellingPrice: 150, reorderThreshold: 4, currentQuantity: 9,
      },
    }),
    prisma.product.upsert({
      where: { sku: "SB-ALTO" },
      update: {},
      create: {
        name: "SkinBetter Alto Defense Serum", category: "SKINCARE", brand: "SkinBetter Science",
        sku: "SB-ALTO", unitType: "BOTTLE", costPerUnit: 95,
        sellingPrice: 185, reorderThreshold: 3, currentQuantity: 7,
      },
    }),

    // RETAIL
    prisma.product.upsert({
      where: { sku: "RTL-SPF50" },
      update: {},
      create: {
        name: "EltaMD UV Clear SPF 46", category: "RETAIL", brand: "EltaMD",
        sku: "RTL-SPF50", unitType: "BOTTLE", costPerUnit: 22,
        sellingPrice: 39, reorderThreshold: 10, currentQuantity: 32,
      },
    }),
    prisma.product.upsert({
      where: { sku: "RTL-CERAVE" },
      update: {},
      create: {
        name: "CeraVe Moisturizing Cream 16oz", category: "RETAIL", brand: "CeraVe",
        sku: "RTL-CERAVE", unitType: "BOTTLE", costPerUnit: 11,
        sellingPrice: 19, reorderThreshold: 12, currentQuantity: 28,
      },
    }),
    prisma.product.upsert({
      where: { sku: "RTL-ECREAM" },
      update: {},
      create: {
        name: "ZO Skin Health Renewal Cream", category: "RETAIL", brand: "ZO Skin Health",
        sku: "RTL-ECREAM", unitType: "BOTTLE", costPerUnit: 68,
        sellingPrice: 132, reorderThreshold: 5, currentQuantity: 14,
      },
    }),

    // SUPPLIES
    prisma.product.upsert({
      where: { sku: "SUP-30G" },
      update: {},
      create: {
        name: "Syringes 1mL 30G x 0.5\" (Box/100)", category: "SUPPLIES", brand: null,
        sku: "SUP-30G", unitType: "BOX", costPerUnit: 28,
        sellingPrice: null, reorderThreshold: 5, currentQuantity: 22,
        notes: "For Botox and filler injections.",
      },
    }),
    prisma.product.upsert({
      where: { sku: "SUP-27G" },
      update: {},
      create: {
        name: "Syringes 3mL 27G x 1.5\" (Box/100)", category: "SUPPLIES", brand: null,
        sku: "SUP-27G", unitType: "BOX", costPerUnit: 24,
        sellingPrice: null, reorderThreshold: 4, currentQuantity: 15,
        notes: "For Botox reconstitution.",
      },
    }),
    prisma.product.upsert({
      where: { sku: "SUP-ALCSW" },
      update: {},
      create: {
        name: "Alcohol Swabs (Box/200)", category: "SUPPLIES", brand: null,
        sku: "SUP-ALCSW", unitType: "BOX", costPerUnit: 8,
        sellingPrice: null, reorderThreshold: 10, currentQuantity: 3,
        notes: "⚠️ Low! Reorder immediately.",
      },
    }),
    prisma.product.upsert({
      where: { sku: "SUP-GLVS" },
      update: {},
      create: {
        name: "Nitrile Gloves Medium (Box/100)", category: "SUPPLIES", brand: null,
        sku: "SUP-GLVS", unitType: "BOX", costPerUnit: 12,
        sellingPrice: null, reorderThreshold: 8, currentQuantity: 18,
      },
    }),
    prisma.product.upsert({
      where: { sku: "SUP-SALINE" },
      update: {},
      create: {
        name: "Bacteriostatic Saline 30mL Vial", category: "SUPPLIES", brand: null,
        sku: "SUP-SALINE", unitType: "VIAL", costPerUnit: 9,
        sellingPrice: null, reorderThreshold: 10, currentQuantity: 25,
        notes: "For Botox reconstitution.",
      },
    }),
  ]);

  console.log(`✅ ${products.length} products created`);

  // ──────────────────────────────────────────────
  // Sample transactions (realistic history)
  // ──────────────────────────────────────────────
  const botox = products.find((p) => p.sku === "BTX-100")!;
  const juvedermUltra = products.find((p) => p.sku === "JVD-ULT")!;
  const juvedermVoluma = products.find((p) => p.sku === "JVD-VLM")!;
  const tnsSerum = products.find((p) => p.sku === "SKMD-TNS")!;
  const spf = products.find((p) => p.sku === "RTL-SPF50")!;
  const swabs = products.find((p) => p.sku === "SUP-ALCSW")!;

  const txSeed = [
    // Botox used by Dr. Nicole
    {
      productId: botox.id, transactionType: "USE" as const, quantity: 2,
      quantityBefore: 20, quantityAfter: 18, loggedById: dr_nicole.id,
      performedById: dr_nicole.id, clientName: "Sarah M.", unitType: botox.unitType,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    // Filler used by Dr. Nicole
    {
      productId: juvedermUltra.id, transactionType: "USE" as const, quantity: 1,
      quantityBefore: 13, quantityAfter: 12, loggedById: dr_nicole.id,
      performedById: dr_nicole.id, clientName: "Sarah M.", unitType: juvedermUltra.unitType,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    // Botox used by Erin
    {
      productId: botox.id, transactionType: "USE" as const, quantity: 1,
      quantityBefore: 21, quantityAfter: 20, loggedById: erin.id,
      performedById: erin.id, clientName: "Lisa T.", unitType: botox.unitType,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    // Voluma used - logged by front desk on behalf of Erin
    {
      productId: juvedermVoluma.id, transactionType: "USE" as const, quantity: 2,
      quantityBefore: 9, quantityAfter: 7, loggedById: frontdesk.id,
      performedById: erin.id, clientName: "Karen W.", unitType: juvedermVoluma.unitType,
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    },
    // TNS Serum sold retail
    {
      productId: tnsSerum.id, transactionType: "SELL" as const, quantity: 1,
      quantityBefore: 7, quantityAfter: 6, loggedById: frontdesk.id,
      performedById: frontdesk.id, clientName: "Janet B.", unitType: tnsSerum.unitType,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    // SPF sold retail
    {
      productId: spf.id, transactionType: "SELL" as const, quantity: 2,
      quantityBefore: 34, quantityAfter: 32, loggedById: frontdesk.id,
      performedById: frontdesk.id, clientName: "Amanda R.", unitType: spf.unitType,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    // Botox waste (contaminated)
    {
      productId: botox.id, transactionType: "WASTE" as const, quantity: 1,
      quantityBefore: 22, quantityAfter: 21, loggedById: dr_nicole.id,
      performedById: dr_nicole.id, wasteReason: "CONTAMINATED" as const,
      notes: "Vial dropped, sterility compromised.", unitType: botox.unitType,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    },
    // Stock received
    {
      productId: swabs.id, transactionType: "RECEIVE" as const, quantity: 5,
      quantityBefore: -2, quantityAfter: 3, // already updated in product above
      loggedById: manager.id, performedById: manager.id,
      notes: "Ordered from McKesson.", unitType: swabs.unitType,
      createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
    },
  ];

  for (const tx of txSeed) {
    await prisma.transaction.create({ data: tx as Parameters<typeof prisma.transaction.create>[0]["data"] });
  }

  console.log(`✅ ${txSeed.length} sample transactions created`);
  console.log("\n🎉 Seed complete! Login credentials:");
  console.log("  Admin:      owner@medspa.com    / admin1234");
  console.log("  Manager:    manager@medspa.com   / manager1234");
  console.log("  Provider:   dr.nicole@medspa.com / provider1234");
  console.log("  Provider:   erin@medspa.com      / provider1234");
  console.log("  Front Desk: front@medspa.com     / desk1234");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
