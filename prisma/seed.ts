import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

const categories = [
  {
    name: "Preventive Maintenance / Tune-Up",
    icon: "wrench",
    sortOrder: 0,
    packages: [
      {
        tier: "good",
        name: "Basic Tune-Up",
        price: 89,
        warranty: "30 Days",
        sortOrder: 0,
        features: [
          "Full safety inspection",
          "Lubrication of all moving parts",
          "Balance test",
          "Travel limit adjustment",
          "Visual cable & spring check",
        ],
      },
      {
        tier: "better",
        name: "Standard Tune-Up",
        price: 139,
        warranty: "90 Days",
        sortOrder: 1,
        features: [
          "Everything in Basic",
          "New nylon rollers (10 pack)",
          "Tighten all hardware",
          "Weather seal inspection",
          "Force & balance calibration",
        ],
      },
      {
        tier: "best",
        name: "Premium Tune-Up",
        price: 199,
        warranty: "1 Year",
        sortOrder: 2,
        features: [
          "Everything in Standard",
          "Full cable inspection & tension check",
          "Hinge & bracket tightening",
          "Opener force calibration",
          "Full written service report",
          "Priority scheduling for next visit",
        ],
      },
    ],
  },
  {
    name: "Broken Springs",
    icon: "spring",
    sortOrder: 1,
    packages: [
      {
        tier: "good",
        name: "Single Spring Replacement",
        price: 199,
        warranty: "1 Year",
        sortOrder: 0,
        features: [
          "Standard grade torsion spring",
          "Replace 1 broken spring",
          "Balance adjustment",
          "Safety inspection included",
        ],
      },
      {
        tier: "better",
        name: "Spring + Safety Cable",
        price: 279,
        warranty: "3 Years",
        sortOrder: 1,
        features: [
          "Premium grade torsion spring",
          "Replace 1 spring",
          "New safety cables installed",
          "Full balance adjustment",
          "Hardware inspection",
        ],
      },
      {
        tier: "best",
        name: "Dual Spring Replacement",
        price: 399,
        warranty: "Lifetime",
        sortOrder: 2,
        features: [
          "Both torsion springs replaced",
          "Heavy-duty lifetime-rated springs",
          "New safety cables installed",
          "Full balance & travel adjustment",
          "New rollers included",
          "Comprehensive inspection",
        ],
      },
    ],
  },
  {
    name: "Opener Replacement",
    icon: "remote",
    sortOrder: 2,
    packages: [
      {
        tier: "good",
        name: "Chain Drive Opener",
        price: 299,
        warranty: "1 Year Parts & Labor",
        sortOrder: 0,
        features: [
          "1/2 HP chain drive motor",
          "2 remotes included",
          "Manual release",
          "Professional installation",
          "Safety reversal test",
        ],
      },
      {
        tier: "better",
        name: "Belt Drive Opener",
        price: 449,
        warranty: "3 Years Parts & Labor",
        sortOrder: 1,
        features: [
          "3/4 HP belt drive – ultra quiet",
          "2 remotes + wireless keypad",
          "Manual release",
          "Professional installation",
          "Safety reversal & force calibration",
          "Battery backup ready",
        ],
      },
      {
        tier: "best",
        name: "Smart Wi-Fi Opener",
        price: 599,
        warranty: "Lifetime Motor / 3 Years Parts",
        sortOrder: 2,
        features: [
          "3/4 HP smart belt drive",
          "Wi-Fi + smartphone app control",
          "Built-in battery backup",
          "2 remotes + keypad included",
          "Real-time alerts & open/close history",
          "Professional installation",
          "Safety reversal & full calibration",
        ],
      },
    ],
  },
]

async function main() {
  console.log("Seeding service packages...")

  for (const cat of categories) {
    const { packages, ...catData } = cat
    const category = await db.serviceCategory.upsert({
      where: { id: cat.name },
      update: {},
      create: { ...catData, id: cat.name.slice(0, 25).replace(/\s+/g, "-").toLowerCase() },
    })

    for (const pkg of packages) {
      await db.package.create({
        data: {
          ...pkg,
          categoryId: category.id,
          features: JSON.stringify(pkg.features),
        },
      })
    }
  }

  console.log("Done. 3 categories, 9 packages created.")
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
