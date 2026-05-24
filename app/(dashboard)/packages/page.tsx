import { db } from "@/lib/db"
import PackageManager from "./PackageManager"

export const dynamic = "force-dynamic"

export default async function PackagesPage() {
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

  return <PackageManager initialCategories={categories} />
}
