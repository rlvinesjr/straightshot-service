import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { categoryId, tier, name, description, price, warranty, features } = body

  const sortMap: Record<string, number> = { good: 0, better: 1, best: 2 }

  const pkg = await db.package.create({
    data: {
      categoryId,
      tier,
      name,
      description,
      price: parseFloat(price),
      warranty,
      features: JSON.stringify(features ?? []),
      sortOrder: sortMap[tier] ?? 0,
    },
  })
  return NextResponse.json(pkg, { status: 201 })
}
