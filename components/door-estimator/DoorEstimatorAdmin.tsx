"use client"

import { useState } from "react"
import type { DoorEstimatorConfig } from "@/lib/door-estimator/types"

export default function DoorEstimatorAdmin() {
  const [key, setKey] = useState("")
  const [config, setConfig] = useState<DoorEstimatorConfig | null>(null)
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)

  async function load() {
    setBusy(true); setMessage("")
    const response = await fetch("/api/door-estimator/admin", { headers: { "X-Door-Estimator-Key": key } })
    const data = await response.json()
    if (!response.ok) setMessage(data.error || "Unable to load pricing")
    else setConfig(data)
    setBusy(false)
  }

  async function save() {
    if (!config) return
    setBusy(true); setMessage("")
    const response = await fetch("/api/door-estimator/admin", { method: "PATCH", headers: { "Content-Type": "application/json", "X-Door-Estimator-Key": key }, body: JSON.stringify(config) })
    const data = await response.json()
    if (!response.ok) setMessage(data.error || "Unable to save pricing")
    else { setConfig(data); setMessage(`Saved as price-book version ${data.version}`) }
    setBusy(false)
  }

  return <div className="mx-auto max-w-5xl p-4 md:p-8">
    <h1 className="text-4xl font-black uppercase text-white">Door Pricing</h1>
    <p className="mt-2 text-zinc-500">Edit the private vendor price book and retail pricing rule. Customer-facing pages never receive vendor costs.</p>

    <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <label className="text-sm text-zinc-400">Admin key<input value={key} onChange={e => setKey(e.target.value)} type="password" className="mt-1 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white" /></label>
      <button onClick={load} disabled={!key || busy} className="mt-3 rounded-xl bg-[#00FF47] px-5 py-3 font-black uppercase text-black disabled:opacity-40">Load Price Book</button>
    </div>

    {config && <div className="mt-5 space-y-5">
      {config.distributorName && <div className="rounded-2xl border border-amber-600/40 bg-amber-950/20 p-4 text-sm">
        <p className="font-bold uppercase tracking-wide text-amber-400">Source price sheets — internal only, never shown to customers</p>
        <p className="mt-1 text-zinc-300">{config.distributorName}</p>
        {config.internalNotes && <p className="mt-2 text-zinc-400">{config.internalNotes}</p>}
      </div>}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <h2 className="text-xl font-black uppercase text-white">Retail pricing rule</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-sm text-zinc-400">Price book name<input value={config.pricebookName} onChange={e => setConfig({ ...config, pricebookName: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white" /></label>
          <label className="text-sm text-zinc-400">Effective date<input type="date" value={config.effectiveDate} onChange={e => setConfig({ ...config, effectiveDate: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white" /></label>
          <label className="text-sm text-zinc-400">Default multiplier<input type="number" step="0.05" value={config.multiplier} onChange={e => setConfig({ ...config, multiplier: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white" /></label>
        </div>
        <p className="mt-3 text-sm text-zinc-500">Example: $900 vendor cost × {config.multiplier.toFixed(2)} = ${(900 * config.multiplier).toLocaleString()}, rounded to $2,699 under the current rule.</p>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <h2 className="text-xl font-black uppercase text-white">Vendor door costs</h2>
        <p className="mt-1 text-sm text-zinc-500">Prices are grouped where the vendor sheet uses the same cost for multiple widths.</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="text-left text-zinc-500"><th className="p-2">Construction</th><th>Vendor product</th><th>Finish</th><th>Width group</th><th>Height</th><th>Vendor cost</th></tr></thead><tbody>{config.priceRows.map((row, index) => <tr key={`${row.constructionCode}-${row.finishTier}-${row.widthGroup}-${row.height}`} className="border-t border-zinc-900"><td className="p-2 capitalize">{row.constructionCode}</td><td className="pr-3 text-xs text-amber-400/80">{config.constructions.find(c => c.code === row.constructionCode)?.internalRef ?? "—"}</td><td className="capitalize">{row.finishTier}</td><td>{row.widthGroup} ft</td><td>{row.height} ft</td><td><input type="number" step="0.01" value={row.vendorCost} onChange={e => { const rows = [...config.priceRows]; rows[index] = { ...row, vendorCost: Number(e.target.value) }; setConfig({ ...config, priceRows: rows }) }} className="w-28 rounded-lg border border-zinc-700 bg-black p-2 text-white" /></td></tr>)}</tbody></table></div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <h2 className="text-xl font-black uppercase text-white">Vendor opener costs</h2>
        <p className="mt-1 text-sm text-zinc-500">Cost per unit by door height (rail length changes with height).</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="text-left text-zinc-500"><th className="p-2">Opener</th><th>Vendor part</th><th>7 ft door</th><th>8 ft door</th><th>9 ft door</th></tr></thead><tbody>{config.openers.map((opener, openerIndex) => <tr key={opener.code} className="border-t border-zinc-900"><td className="p-2 text-white">{opener.publicName}</td><td className="pr-3 text-xs text-amber-400/80">{opener.internalRef ?? "—"}</td>{([7, 8, 9] as const).map(height => <td key={height}>{opener.costsByHeight[height] === undefined ? <span className="text-zinc-600">n/a</span> : <input type="number" step="0.01" value={opener.costsByHeight[height]} onChange={e => { const openers = [...config.openers]; openers[openerIndex] = { ...opener, costsByHeight: { ...opener.costsByHeight, [height]: Number(e.target.value) } }; setConfig({ ...config, openers }) }} className="w-24 rounded-lg border border-zinc-700 bg-black p-2 text-white" />}</td>)}</tr>)}</tbody></table></div>
      </section>

      <button onClick={save} disabled={busy} className="rounded-xl bg-[#00FF47] px-6 py-4 font-black uppercase text-black disabled:opacity-40">Publish Updated Price Book</button>
    </div>}
    {message && <p className="mt-4 text-sm font-bold text-[#00FF47]">{message}</p>}
  </div>
}
