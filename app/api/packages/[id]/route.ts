import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { name, description, price, warranty, features } = body

  const pkg = await db.package.update({
    where: { id },
    data: {
      name,
      description,
      price: price !== undefined ? parseFloat(price) : undefined,
      warranty,
      features: features !== undefined ? JSON.stringify(features) : undefined,
    },
  })
  return NextResponse.json(pkg)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.package.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
