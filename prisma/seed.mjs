import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.spot.count();
  if (count > 0) {
    console.log("Seed skipped: spots already exist");
    return;
  }

  await prisma.spot.createMany({
    data: [
      { placeId: "A-01", name: "Seeblick Nord", type: "MOTORHOME", dayPriceCents: 3200 },
      { placeId: "A-02", name: "Seeblick Sued", type: "MOTORHOME", dayPriceCents: 3400 },
      { placeId: "T-01", name: "Waldkante Ost", type: "TENT", dayPriceCents: 1800 },
      { placeId: "T-02", name: "Waldkante West", type: "TENT", dayPriceCents: 1900 },
    ],
  });

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
