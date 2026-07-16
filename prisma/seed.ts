import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Real EmVolt staff only — no fabricated leads/clients/sessions. Real lead
// data comes from `scripts/import-leads.ts` against the owner's sheet.
async function main() {
  console.log("Clearing existing data...");
  await prisma.activityLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.recurringSlot.deleteMany();
  await prisma.package.deleteMany();
  await prisma.client.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.staff.deleteMany();

  console.log("Seeding real staff...");
  const staff = await Promise.all([
    prisma.staff.create({
      data: { name: "Mohamad Al-Chabi", email: "mohalchabi@gmail.com", role: "admin", section: null },
    }),
    prisma.staff.create({
      data: { name: "Eslam", email: "islamdeif415@gmail.com", role: "front_desk", section: null },
    }),
    prisma.staff.create({
      data: { name: "Nour", email: "noorchabi2@gmail.com", role: "front_desk", section: null },
    }),
    prisma.staff.create({
      data: { name: "Nermeen", email: "nermoah6@gmail.com", role: "trainer", section: "female" },
    }),
    prisma.staff.create({
      data: { name: "Amna", email: "amonamen27@gmail.com", role: "trainer", section: "female" },
    }),
    prisma.staff.create({
      data: { name: "Emad", email: "emad44420@gmail.com", role: "trainer", section: "male" },
    }),
  ]);

  console.log(`Seed complete: ${staff.length} staff. No leads/clients — run the import script next.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
