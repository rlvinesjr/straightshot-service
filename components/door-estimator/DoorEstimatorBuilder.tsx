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
  const [downloading, setDownloading] = useState(false)
  const [key, setKey] = useState("")
  const [lead, setLead] = useState({ firstName: "", contact: "", zip: "" })
  const [report, setReport] = useState<{ token: string; emailed: boolean } | null>(null)
  const [timeline, setTimeline] = useState("")

  const construction = catalog.constructions.find(x => x.code === selection.constructionCode)
  const styles = useMemo(() => catalog.styles.filter(style => style.constructionCodes.includes(selection.constructionCode)), [catalog.styles, selection.constructionCode])
  const style = styles.find(x => x.code === selection.styleCode) ?? styles[0]
  const colors = useMemo(() => catalog.colors.filter(color => style && style.finishTiers.includes(color.finishTier) && construction?.finishTiers.includes(color.finishTier) && (!color.styleCodes || color.styleCodes.includes(style.code)) && (!color.constructionCodes || color.constructionCodes.includes(selection.constructionCode))), [catalog.colors, style, construction, selection.constructionCode])
  const windows = useMemo(() => catalog.windows.filter(item => style && item.groups.includes(style.windowGroup) && (!item.constructionCodes || item.constructionCodes.includes(selection.constructionCode))), [catalog.windows, style, selection.constructionCode])
  const selectedColor = colors.find(x => x.code === selection.colorCode) ?? colors[0]

  // Resolve the raw selection against the currently valid option lists at render
  // time instead of syncing state in effects, so pricing always uses valid codes.
  const effectiveSelection = useMemo<DoorSelection>(() => ({
    ...selection,
    styleCode: style?.code ?? selection.styleCode,
    colorCode: selectedColor?.code ?? selection.colorCode,
    windowCode: windows.some(x => x.code === selection.windowCode) ? selection.windowCode : (windows[0]?.code ?? "none"),
  }), [selection, style, selectedColor, windows])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setError("")
      try {
        const response = await fetch("/api/door-estimator/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(mode === "field" && key ? { "X-Door-Estimator-Key": key } : {}) },
          body: JSON.stringify({ mode, selection: effectiveSelection, includeInternal: mode === "field" && Boolean(key) }),
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
  }, [effectiveSelection, mode, key])

  function chooseConstruction(code: ConstructionCode) {
    const nextStyle = catalog.styles.find(x => x.constructionCodes.includes(code))
    setSelection(current => ({ ...current, constructionCode: code, styleCode: nextStyle?.code ?? current.styleCode, colorCode: "white", windowCode: "none" }))
  }

  function applyPreset(level: "good" | "better" | "best") {
    const code: ConstructionCode = level === "good" ? "essential" : level === "better" ? "comfort" : "premium"
    const nextStyle = catalog.styles.find(x => x.constructionCodes.includes(code) && (level !== "best" || x.code === "horizontal-plank")) ?? catalog.styles.find(x => x.constructionCodes.includes(code))!
    setSelection(current => ({ ...current, constructionCode: code, styleCode: nextStyle.code, colorCode: nextStyle.finishTiers.includes("plank") ? "white" : "white", windowCode: level === "good" ? "none" : nextStyle.windowGroup === "contemporary" ? "contemporary-clear" : "plain", openerCode: level === "good" ? "keep-existing" : level === "better" ? "battery-belt" : "premium-smart" }))
  }

  async function saveEstimate() {
    setSaved("")
    setError("")
    const response = await fetch("/api/door-estimator/estimates", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(mode === "field" ? { "X-Door-Estimator-Key": key } : {}) },
      body: JSON.stringify({ mode, selection: effectiveSelection, customer: {} }),
    })
    const data = await response.json()
    if (!response.ok) return setError(data.error || "Unable to save estimate")
    setSaved(`Estimate saved — ${money.format(data.retailPrice)}`)
  }

  // Website funnel: the on-screen price is free; the Buyer Report PDF is the
  // contact-capture event (first name + email-or-mobile + ZIP).
  async function submitLead() {
    setError("")
    setDownloading(true)
    try {
      const response = await fetch("/api/door-estimator/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection: effectiveSelection, lead }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error || "Unable to create your report")
        return
      }
      setReport({ token: data.token, emailed: Boolean(data.emailed) })
      const link = document.createElement("a")
      link.href = `/api/door-estimator/report/${data.token}`
      link.download = "StraightShot-Garage-Door-Buyer-Report.pdf"
      document.body.appendChild(link)
      link.click()
      link.remove()
    } finally {
      setDownloading(false)
    }
  }

  async function chooseTimeline(value: string) {
    if (!report) return
    setTimeline(value)
    void fetch("/api/door-estimator/report/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: report.token, timeline: value }),
    }).catch(() => {})
  }

  const card = "rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
  const button = "rounded-xl border px-3 py-3 text-left transition hover:border-[#00FF47]"

  return (
    <div className={mode === "website" ? "min-h-screen bg-zinc-950 text-zinc-100" : "text-zinc-100"}>
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[.25em] text-[#00FF47]">{mode === "website" ? "The 60-Second East Texas Garage Door Price Planner" : "StraightShot Overhead"}</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white md:text-6xl">{mode === "website" ? "See What Your New Garage Door Should Cost" : "Build Your Garage Door"}</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">{mode === "website"
            ? "Build your door, choose the options you want, and see a realistic preliminary installed price for your East Texas home — in about 60 seconds. Standard installation, removal of your old door, and disposal are included. No obligation, and your basic estimate shows on screen before you decide whether to talk to anyone."
            : "Choose your size, construction, style, windows, and opener. Standard installation, removal, and disposal are included."}</p>
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

            <section className={card}><h2 className="mb-3 text-xl font-black uppercase text-white">3. Door style</h2><div className="grid gap-4 sm:grid-cols-2">{styles.map(item => <button key={item.code} onClick={() => setSelection({ ...selection, styleCode: item.code, colorCode: "white", windowCode: "none" })} className={`${button} ${effectiveSelection.styleCode === item.code ? "border-[#00FF47]" : "border-zinc-800"}`}>{item.imagePath ? <div className="mb-3 aspect-[4/3] overflow-hidden rounded-lg border-4 border-zinc-800 bg-white"><img src={item.imagePath} alt={`${item.publicName} garage door`} className="h-full w-full object-contain" /></div> : <div className="mb-3 aspect-[4/3] rounded-lg border-4 border-zinc-800 bg-zinc-200 p-2"><div className="grid h-full grid-rows-4 gap-1">{[0,1,2,3].map(row => <div key={row} className="grid grid-cols-4 gap-1">{[0,1,2,3].map(col => <span key={col} className="rounded-sm border border-zinc-500" style={{ background: selectedColor?.swatch ?? "#eee" }} />)}</div>)}</div></div>}<strong>{item.publicName}</strong><span className="mt-1 block text-xs text-zinc-500">{item.category}</span></button>)}</div></section>

            <section className={card}><h2 className="mb-3 text-xl font-black uppercase text-white">4. Color</h2><div className="flex flex-wrap gap-3">{colors.map(item => <button key={item.code} onClick={() => setSelection({ ...selection, colorCode: item.code })} className={`rounded-xl border p-2 ${effectiveSelection.colorCode === item.code ? "border-[#00FF47]" : "border-zinc-700"}`}><span className="block h-12 w-16 rounded-lg border border-zinc-500" style={{ background: item.swatch }} /><span className="mt-1 block text-xs">{item.publicName}</span></button>)}</div></section>

            <section className={card}><h2 className="mb-3 text-xl font-black uppercase text-white">5. Windows</h2><div className="grid gap-3 sm:grid-cols-2">{windows.map(item => <button key={item.code} onClick={() => setSelection({ ...selection, windowCode: item.code })} className={`${button} ${effectiveSelection.windowCode === item.code ? "border-[#00FF47]" : "border-zinc-800"}`}><strong>{item.publicName}</strong><span className="mt-1 block text-sm text-zinc-400">{item.description}</span></button>)}</div></section>

            <section className={card}><h2 className="mb-3 text-xl font-black uppercase text-white">6. Garage door opener</h2><div className="grid gap-3 sm:grid-cols-2">{catalog.openers.map(item => <button key={item.code} onClick={() => setSelection({ ...selection, openerCode: item.code })} className={`${button} ${selection.openerCode === item.code ? "border-[#00FF47]" : "border-zinc-800"}`}><strong>{item.publicName}</strong><span className="mt-1 block text-sm text-zinc-400">{item.description}</span></button>)}</div></section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-[#00FF47] bg-black p-6 shadow-2xl">
              <p className="text-sm font-bold uppercase tracking-widest text-[#00FF47]">{mode === "website" ? "Estimated installed price" : "On-site estimate"}</p>
              <div className="mt-2 text-5xl font-black text-white">{loading ? "…" : price ? money.format(price.retailPrice) : "—"}</div>
              <p className="mt-3 text-sm text-zinc-400">Includes standard installation, removal, and disposal.</p>
              <dl className="mt-5 space-y-2 border-t border-zinc-800 pt-4 text-sm"><div className="flex justify-between"><dt>Size</dt><dd>{selection.width}×{selection.height}</dd></div><div className="flex justify-between"><dt>Construction</dt><dd>{construction?.publicName}</dd></div><div className="flex justify-between"><dt>Style</dt><dd className="text-right">{style?.publicName}</dd></div><div className="flex justify-between"><dt>Quantity</dt><dd>{selection.quantity}</dd></div></dl>
              {mode === "field" && price?.totalVendorCost !== undefined && <div className="mt-4 rounded-xl bg-zinc-900 p-3 text-sm"><div className="flex justify-between"><span>Vendor cost</span><strong>{money.format(price.totalVendorCost)}</strong></div><div className="mt-1 flex justify-between"><span>Gross profit</span><strong>{money.format(price.grossProfit ?? 0)}</strong></div><div className="mt-1 flex justify-between"><span>Gross margin</span><strong>{((price.grossMargin ?? 0) * 100).toFixed(1)}%</strong></div></div>}
              {mode === "field" && <button onClick={saveEstimate} disabled={!price || !key} className="mt-5 w-full rounded-xl bg-[#00FF47] px-4 py-4 font-black uppercase text-black disabled:opacity-40">Create Field Estimate</button>}
              {saved && <p className="mt-3 text-sm font-bold text-[#00FF47]">{saved}</p>}

              {mode === "website" && !report && <div className="mt-5 border-t border-zinc-800 pt-5">
                <p className="text-base font-black uppercase tracking-wide text-white">Save your estimate — get the complete Buyer Report</p>
                <ul className="mt-3 space-y-1.5 text-xs text-zinc-400">
                  {["Your selected door and estimated price", "Real ways to lower or adjust your budget", "Our insulation recommendation", "Existing-opener compatibility checklist", "Repair-versus-replacement scorecard", "The hidden costs to look for in competing quotes"].map(item => (
                    <li key={item} className="flex gap-2"><span className="mt-0.5 text-[#00FF47]">✓</span>{item}</li>
                  ))}
                </ul>
                <div className="mt-4 space-y-3">
                  <input placeholder="First name" value={lead.firstName} onChange={e => setLead({ ...lead, firstName: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3" autoComplete="given-name" />
                  <input placeholder="Email or mobile number" value={lead.contact} onChange={e => setLead({ ...lead, contact: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3" autoComplete="email" inputMode="email" />
                  <input placeholder="ZIP code" value={lead.zip} onChange={e => setLead({ ...lead, zip: e.target.value.replace(/\D/g, "").slice(0, 5) })} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3" autoComplete="postal-code" inputMode="numeric" />
                </div>
                <button onClick={submitLead} disabled={!price || downloading || !lead.firstName || !lead.contact || lead.zip.length !== 5} className="mt-4 w-full rounded-xl bg-[#00FF47] px-4 py-4 font-black uppercase text-black disabled:opacity-40">{downloading ? "Preparing your report…" : "Send My Garage Door Buyer Report"}</button>
                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                <p className="mt-3 text-center text-xs text-zinc-500">Your information is used to deliver your report and help with your garage door project. No pressure and no obligation.</p>
              </div>}

              {mode === "website" && report && <div className="mt-5 border-t border-zinc-800 pt-5">
                <p className="text-base font-black uppercase tracking-wide text-[#00FF47]">Your report is on the way</p>
                <p className="mt-2 text-sm text-zinc-400">{report.emailed ? "It's downloading now and a copy is in your inbox." : "It's downloading now."} Your online estimate is a realistic starting point — the next step is confirming the measurements and inspecting the opening, tracks, springs, hardware, and opener.</p>

                {!timeline && <div className="mt-4">
                  <p className="text-sm font-bold text-white">When are you hoping to have this done?</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[["asap", "As soon as possible"], ["30-days", "Within 30 days"], ["1-3-months", "1–3 months"], ["researching", "Just researching"]].map(([value, label]) => (
                      <button key={value} onClick={() => chooseTimeline(value)} className="rounded-xl border border-zinc-700 px-3 py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-[#00FF47] hover:text-[#00FF47]">{label}</button>
                    ))}
                  </div>
                </div>}

                {timeline && <div className="mt-4">
                  <p className="text-sm font-bold uppercase tracking-widest text-white">{timeline === "asap" || timeline === "30-days" ? "Let's get you measured this week" : "Turn your estimate into an exact quote"}</p>
                  <a href="tel:9032451182" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00FF47] px-4 py-4 text-center font-black uppercase text-black transition hover:bg-[#00e63f]">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.27 16.18z"/></svg>
                    Book My Free Exact-Price Measurement
                  </a>
                  <p className="mt-2 text-center text-xs text-zinc-500">(903) 245-1182 — because an online calculator cannot see your opening dimensions, track condition, clearance, framing, or opener compatibility.</p>
                </div>}
              </div>}

              <p className="mt-4 text-xs leading-relaxed text-zinc-500">{catalog.websiteDisclaimer}</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
