"use client"

import { useEffect, useMemo, useState } from "react"
import type { ConstructionCode, DoorSelection, PublicDoorCatalog } from "@/lib/door-estimator/types"

type Props = { catalog: PublicDoorCatalog; mode: "website" | "field" }
type PriceResult = { retailPrice: number; totalVendorCost?: number; grossProfit?: number; grossMargin?: number }

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

export default function DoorEstimatorBuilder({ catalog, mode }: Props) {
  const [selection, setSelection] = useState<DoorSelection>({ quantity: 1, width: 9, height: 7, constructionCode: "essential", styleCode: "traditional-raised", colorCode: "white", windowCode: "none", openerCode: "keep-existing" })
  const [price, setPrice] = useState<PriceResult | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState("")
  const [key, setKey] = useState("")
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", address: "", city: "" })

  const construction = catalog.constructions.find(x => x.code === selection.constructionCode)
  const styles = useMemo(() => catalog.styles.filter(style => style.constructionCodes.includes(selection.constructionCode)), [catalog.styles, selection.constructionCode])
  const style = styles.find(x => x.code === selection.styleCode) ?? styles[0]
  const colors = useMemo(() => catalog.colors.filter(color => style && style.finishTiers.includes(color.finishTier) && construction?.finishTiers.includes(color.finishTier) && (!color.styleCodes || color.styleCodes.includes(style.code)) && (!color.constructionCodes || color.constructionCodes.includes(selection.constructionCode))), [catalog.colors, style, construction, selection.constructionCode])
  const windows = useMemo(() => catalog.windows.filter(item => style && item.groups.includes(style.windowGroup) && (!item.constructionCodes || item.constructionCodes.includes(selection.constructionCode))), [catalog.windows, style, selection.constructionCode])
  const selectedColor = colors.find(x => x.code === selection.colorCode) ?? colors[0]

  useEffect(() => {
    if (style && style.code !== selection.styleCode) setSelection(current => ({ ...current, styleCode: style.code }))
  }, [style, selection.styleCode])
  useEffect(() => {
    if (selectedColor && selectedColor.code !== selection.colorCode) setSelection(current => ({ ...current, colorCode: selectedColor.code }))
  }, [selectedColor, selection.colorCode])
  useEffect(() => {
    if (!windows.some(x => x.code === selection.windowCode)) setSelection(current => ({ ...current, windowCode: windows[0]?.code ?? "none" }))
  }, [windows, selection.windowCode])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setError("")
      try {
        const response = await fetch("/api/door-estimator/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(mode === "field" && key ? { "X-Door-Estimator-Key": key } : {}) },
          body: JSON.stringify({ mode, selection, includeInternal: mode === "field" && Boolean(key) }),
          signal: controller.signal,
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Unable to calculate price")
        setPrice(data)
      } catch (err) {
        if ((err as Error).name !== "AbortError") { setError((err as Error).message); setPrice(null) }
      } finally { setLoading(false) }
    }, 200)
    return () => { clearTimeout(timer); controller.abort() }
  }, [selection, mode, key])

  function chooseConstruction(code: ConstructionCode) {
    const nextStyle = catalog.styles.find(x => x.constructionCodes.includes(code))
    setSelection(current => ({ ...current, constructionCode: code, styleCode: nextStyle?.code ?? current.styleCode, colorCode: "white", windowCode: "none" }))
  }

  function applyPreset(level: "good" | "better" | "best") {
    const code: ConstructionCode = level === "good" ? "essential" : level === "better" ? "comfort" : "premium"
    const nextStyle = catalog.styles.find(x => x.constructionCodes.includes(code) && (level !== "best" || x.code === "horizontal-plank")) ?? catalog.styles.find(x => x.constructionCodes.includes(code))!
    setSelection(current => ({ ...current, constructionCode: code, styleCode: nextStyle.code, colorCode: nextStyle.finishTiers.includes("plank") ? "white" : "white", windowCode: level === "good" ? "none" : nextStyle.windowGroup === "contemporary" ? "contemporary-clear" : "plain", openerCode: level === "good" ? "keep-existing" : level === "better" ? "quiet-belt" : "battery-belt" }))
  }

  async function saveEstimate() {
    setSaved("")
    setError("")
    const response = await fetch("/api/door-estimator/estimates", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(mode === "field" ? { "X-Door-Estimator-Key": key } : {}) },
      body: JSON.stringify({ mode, selection, customer }),
    })
    const data = await response.json()
    if (!response.ok) return setError(data.error || "Unable to save estimate")
    setSaved(`Estimate saved — ${money.format(data.retailPrice)}`)
  }

  const card = "rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
  const button = "rounded-xl border px-3 py-3 text-left transition hover:border-[#00FF47]"

  return (
    <div className={mode === "website" ? "min-h-screen bg-zinc-950 text-zinc-100" : "text-zinc-100"}>
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[.25em] text-[#00FF47]">StraightShot Overhead</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white md:text-6xl">Build Your Garage Door</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">Choose your size, construction, style, windows, and opener. Standard installation, removal, and disposal are included.</p>
        </div>

        {mode === "field" && (
          <div className={`${card} mb-5`}>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex-1 text-sm text-zinc-400">Field pricing key<input value={key} onChange={e => setKey(e.target.value)} type="password" className="mt-1 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white" placeholder="Required to show cost and profit" /></label>
              <button onClick={() => applyPreset("good")} className={`${button} border-zinc-700`}>Good</button>
              <button onClick={() => applyPreset("better")} className={`${button} border-blue-500`}>Better</button>
              <button onClick={() => applyPreset("best")} className={`${button} border-[#00FF47]`}>Best</button>
            </div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <section className={card}><h2 className="mb-3 text-xl font-black uppercase text-white">1. Door size</h2><div className="grid grid-cols-3 gap-3">
              <label className="text-sm text-zinc-400">Quantity<select value={selection.quantity} onChange={e => setSelection({ ...selection, quantity: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white">{[1,2,3,4].map(x => <option key={x}>{x}</option>)}</select></label>
              <label className="text-sm text-zinc-400">Width<select value={selection.width} onChange={e => setSelection({ ...selection, width: Number(e.target.value) as DoorSelection["width"] })} className="mt-1 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white">{catalog.widths.map(x => <option key={x} value={x}>{x} ft</option>)}</select></label>
              <label className="text-sm text-zinc-400">Height<select value={selection.height} onChange={e => setSelection({ ...selection, height: Number(e.target.value) as DoorSelection["height"] })} className="mt-1 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white">{catalog.heights.map(x => <option key={x} value={x}>{x} ft</option>)}</select></label>
            </div></section>

            <section className={card}><h2 className="mb-3 text-xl font-black uppercase text-white">2. Construction</h2><div className="grid gap-3 md:grid-cols-3">{catalog.constructions.map(item => <button key={item.code} onClick={() => chooseConstruction(item.code)} className={`${button} ${selection.constructionCode === item.code ? "border-[#00FF47] bg-[#00ff4710]" : "border-zinc-800"}`}><span className="text-xs font-bold uppercase text-[#00FF47]">{item.eyebrow}</span><strong className="mt-1 block text-white">{item.publicName}</strong><span className="mt-1 block text-sm text-zinc-400">{item.description}</span></button>)}</div></section>

            <section className={card}><h2 className="mb-3 text-xl font-black uppercase text-white">3. Door style</h2><div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">{styles.map(item => <button key={item.code} onClick={() => setSelection({ ...selection, styleCode: item.code, colorCode: "white", windowCode: "none" })} className={`${button} ${selection.styleCode === item.code ? "border-[#00FF47]" : "border-zinc-800"}`}><div className="mb-3 aspect-[16/9] rounded-lg border-4 border-zinc-800 bg-zinc-200 p-2"><div className="grid h-full grid-rows-4 gap-1">{[0,1,2,3].map(row => <div key={row} className="grid grid-cols-4 gap-1">{[0,1,2,3].map(col => <span key={col} className="rounded-sm border border-zinc-500" style={{ background: selectedColor?.swatch ?? "#eee" }} />)}</div>)}</div></div><strong>{item.publicName}</strong><span className="mt-1 block text-xs text-zinc-500">{item.category}</span></button>)}</div></section>

            <section className={card}><h2 className="mb-3 text-xl font-black uppercase text-white">4. Color</h2><div className="flex flex-wrap gap-3">{colors.map(item => <button key={item.code} onClick={() => setSelection({ ...selection, colorCode: item.code })} className={`rounded-xl border p-2 ${selection.colorCode === item.code ? "border-[#00FF47]" : "border-zinc-700"}`}><span className="block h-12 w-16 rounded-lg border border-zinc-500" style={{ background: item.swatch }} /><span className="mt-1 block text-xs">{item.publicName}</span></button>)}</div></section>

            <section className={card}><h2 className="mb-3 text-xl font-black uppercase text-white">5. Windows</h2><div className="grid gap-3 sm:grid-cols-2">{windows.map(item => <button key={item.code} onClick={() => setSelection({ ...selection, windowCode: item.code })} className={`${button} ${selection.windowCode === item.code ? "border-[#00FF47]" : "border-zinc-800"}`}><strong>{item.publicName}</strong><span className="mt-1 block text-sm text-zinc-400">{item.description}</span></button>)}</div></section>

            <section className={card}><h2 className="mb-3 text-xl font-black uppercase text-white">6. Garage door opener</h2><div className="grid gap-3 sm:grid-cols-2">{catalog.openers.map(item => <button key={item.code} onClick={() => setSelection({ ...selection, openerCode: item.code })} className={`${button} ${selection.openerCode === item.code ? "border-[#00FF47]" : "border-zinc-800"}`}><strong>{item.publicName}</strong><span className="mt-1 block text-sm text-zinc-400">{item.description}</span></button>)}</div></section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-[#00FF47] bg-black p-6 shadow-2xl">
              <p className="text-sm font-bold uppercase tracking-widest text-[#00FF47]">{mode === "website" ? "Estimated installed price" : "On-site estimate"}</p>
              <div className="mt-2 text-5xl font-black text-white">{loading ? "…" : price ? money.format(price.retailPrice) : "—"}</div>
              <p className="mt-3 text-sm text-zinc-400">Includes standard installation, removal, and disposal.</p>
              <dl className="mt-5 space-y-2 border-t border-zinc-800 pt-4 text-sm"><div className="flex justify-between"><dt>Size</dt><dd>{selection.width}×{selection.height}</dd></div><div className="flex justify-between"><dt>Construction</dt><dd>{construction?.publicName}</dd></div><div className="flex justify-between"><dt>Style</dt><dd className="text-right">{style?.publicName}</dd></div><div className="flex justify-between"><dt>Quantity</dt><dd>{selection.quantity}</dd></div></dl>
              {mode === "field" && price?.totalVendorCost !== undefined && <div className="mt-4 rounded-xl bg-zinc-900 p-3 text-sm"><div className="flex justify-between"><span>Vendor cost</span><strong>{money.format(price.totalVendorCost)}</strong></div><div className="mt-1 flex justify-between"><span>Gross profit</span><strong>{money.format(price.grossProfit ?? 0)}</strong></div><div className="mt-1 flex justify-between"><span>Gross margin</span><strong>{((price.grossMargin ?? 0) * 100).toFixed(1)}%</strong></div></div>}
              {mode === "website" && <div className="mt-5 space-y-3"><input placeholder="Name" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3" /><input placeholder="Phone" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3" /><input placeholder="Email" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3" /></div>}
              <button onClick={saveEstimate} disabled={!price || (mode === "field" && !key)} className="mt-5 w-full rounded-xl bg-[#00FF47] px-4 py-4 font-black uppercase text-black disabled:opacity-40">{mode === "website" ? "Save My Estimate" : "Create Field Estimate"}</button>
              {saved && <p className="mt-3 text-sm font-bold text-[#00FF47]">{saved}</p>}
              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
              <p className="mt-4 text-xs leading-relaxed text-zinc-500">{catalog.websiteDisclaimer}</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
