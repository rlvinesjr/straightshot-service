import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  const categories = await db.serviceCategory.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      packages: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  })
  return NextResponse.json(categories)
}
