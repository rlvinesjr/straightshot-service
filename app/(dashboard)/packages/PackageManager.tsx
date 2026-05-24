"use client"

import { useState } from "react"

type Package = {
  id: string
  tier: string
  name: string
  description: string | null
  price: number
  warranty: string | null
  features: string
  categoryId: string
}

type Category = {
  id: string
  name: string
  icon: string | null
  packages: Package[]
}

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  good:   { label: "Good",   color: "text-[#888888] border-[#444444]" },
  better: { label: "Better", color: "text-blue-400 border-blue-400" },
  best:   { label: "Best",   color: "text-[#00FF47] border-[#00FF47]" },
}

const TIERS = ["good", "better", "best"]

function parseFeatures(raw: string): string[] {
  try { return JSON.parse(raw) } catch { return [] }
}

type EditState = {
  pkg: Package
  name: string
  description: string
  price: string
  warranty: string
  features: string[]
  newFeature: string
}

export default function PackageManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  function openEdit(pkg: Package) {
    setEdit({
      pkg,
      name: pkg.name,
      description: pkg.description ?? "",
      price: pkg.price.toString(),
      warranty: pkg.warranty ?? "",
      features: parseFeatures(pkg.features),
      newFeature: "",
    })
  }

  function addFeature() {
    if (!edit || !edit.newFeature.trim()) return
    setEdit({ ...edit, features: [...edit.features, edit.newFeature.trim()], newFeature: "" })
  }

  function removeFeature(i: number) {
    if (!edit) return
    setEdit({ ...edit, features: edit.features.filter((_, idx) => idx !== i) })
  }

  async function saveEdit() {
    if (!edit) return
    setSaving(true)
    const res = await fetch(`/api/packages/${edit.pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: edit.name,
        description: edit.description,
        price: parseFloat(edit.price),
        warranty: edit.warranty,
        features: edit.features,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setCategories(cats =>
        cats.map(cat => ({
          ...cat,
          packages: cat.packages.map(p => p.id === updated.id ? { ...p, ...updated } : p),
        }))
      )
      setEdit(null)
    }
    setSaving(false)
  }

  return (
    <>
      <div className="p-4 space-y-6">
        <div>
          <h1
            className="text-3xl font-black uppercase text-white tracking-wide"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Service Packages
          </h1>
          <p className="text-sm text-[#666666] mt-0.5">Tap a tier to edit pricing and features</p>
        </div>

        {categories.map(cat => {
          const pkgsByTier = Object.fromEntries(
            cat.packages.map(p => [p.tier, p])
          )

          return (
            <div key={cat.id} className="bg-[#111111] rounded-2xl overflow-hidden border border-[#222222]">
              {/* Category header */}
              <div className="px-4 py-3 border-b border-[#222222]">
                <h2
                  className="text-xl font-black uppercase text-white tracking-wide"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {cat.name}
                </h2>
              </div>

              {/* Tier cards */}
              <div className="divide-y divide-[#1e1e1e]">
                {TIERS.map(tier => {
                  const pkg = pkgsByTier[tier]
                  const { label, color } = TIER_LABELS[tier]

                  if (!pkg) {
                    return (
                      <div key={tier} className="px-4 py-4 flex items-center justify-between opacity-40">
                        <span className={`text-xs font-bold uppercase border rounded-full px-2 py-0.5 ${color}`}>{label}</span>
                        <span className="text-xs text-[#444]">No package yet</span>
                      </div>
                    )
                  }

                  const features = parseFeatures(pkg.features)

                  return (
                    <button
                      key={tier}
                      onClick={() => openEdit(pkg)}
                      className="w-full text-left px-4 py-4 hover:bg-[#1a1a1a] active:bg-[#1f1f1f] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold uppercase border rounded-full px-2 py-0.5 ${color}`}>
                              {label}
                            </span>
                            <span className="text-white font-semibold text-sm truncate">{pkg.name}</span>
                          </div>
                          {pkg.warranty && (
                            <p className="text-xs text-[#555555] mb-2">{pkg.warranty} warranty</p>
                          )}
                          <ul className="space-y-0.5">
                            {features.slice(0, 3).map((f, i) => (
                              <li key={i} className="text-xs text-[#888888] flex items-start gap-1.5">
                                <span className="text-[#00FF47] mt-0.5 flex-shrink-0">✓</span>
                                {f}
                              </li>
                            ))}
                            {features.length > 3 && (
                              <li className="text-xs text-[#555555]">+{features.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xl font-black text-[#00FF47]" style={{ fontFamily: "var(--font-heading)" }}>
                            ${pkg.price.toFixed(0)}
                          </p>
                          <p className="text-[10px] text-[#555555] uppercase tracking-wide">tap to edit</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit bottom sheet */}
      {edit && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setEdit(null)}
          />

          {/* Sheet */}
          <div className="relative bg-[#111111] rounded-t-3xl border-t border-[#222222] max-h-[90vh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#333333]" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 border-b border-[#1e1e1e] flex items-center justify-between">
              <div>
                <span className={`text-xs font-bold uppercase border rounded-full px-2 py-0.5 ${TIER_LABELS[edit.pkg.tier].color}`}>
                  {TIER_LABELS[edit.pkg.tier].label}
                </span>
                <h3
                  className="text-xl font-black text-white mt-1 uppercase"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Edit Package
                </h3>
              </div>
              <button onClick={() => setEdit(null)} className="text-[#555] text-2xl leading-none p-1">×</button>
            </div>

            {/* Scrollable form */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#666] mb-1">Package Name</label>
                <input
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00FF47] transition-colors"
                  value={edit.name}
                  onChange={e => setEdit({ ...edit, name: e.target.value })}
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#666] mb-1">Price</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00FF47] font-bold">$</span>
                  <input
                    type="number"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-8 pr-4 py-3 text-white text-sm focus:outline-none focus:border-[#00FF47] transition-colors"
                    value={edit.price}
                    onChange={e => setEdit({ ...edit, price: e.target.value })}
                  />
                </div>
              </div>

              {/* Warranty */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#666] mb-1">Warranty</label>
                <input
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00FF47] transition-colors"
                  placeholder="e.g. 1 Year Parts & Labor"
                  value={edit.warranty}
                  onChange={e => setEdit({ ...edit, warranty: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#666] mb-1">Description (optional)</label>
                <textarea
                  rows={2}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00FF47] transition-colors resize-none"
                  value={edit.description}
                  onChange={e => setEdit({ ...edit, description: e.target.value })}
                />
              </div>

              {/* Features */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#666] mb-2">What&apos;s Included</label>
                <ul className="space-y-2 mb-3">
                  {edit.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 bg-[#1a1a1a] rounded-xl px-3 py-2">
                      <span className="text-[#00FF47] text-sm">✓</span>
                      <span className="flex-1 text-sm text-white">{f}</span>
                      <button
                        onClick={() => removeFeature(i)}
                        className="text-[#555] hover:text-red-400 text-lg leading-none transition-colors"
                      >×</button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00FF47] transition-colors"
                    placeholder="Add a feature..."
                    value={edit.newFeature}
                    onChange={e => setEdit({ ...edit, newFeature: e.target.value })}
                    onKeyDown={e => e.key === "Enter" && addFeature()}
                  />
                  <button
                    onClick={addFeature}
                    className="bg-[#00FF47] text-black font-bold rounded-xl px-4 text-xl hover:bg-[#00e040] active:bg-[#00c032] transition-colors"
                  >+</button>
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="px-5 py-4 border-t border-[#1e1e1e]">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="w-full bg-[#00FF47] text-black font-black uppercase tracking-wider rounded-2xl py-4 text-base hover:bg-[#00e040] active:bg-[#00c032] disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {saving ? "Saving..." : "Save Package"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
