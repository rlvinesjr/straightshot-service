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
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="text-left text-zinc-500"><th className="p-2">Construction</th><th>Finish</th><th>Width group</th><th>Height</th><th>Vendor cost</th></tr></thead><tbody>{config.priceRows.map((row, index) => <tr key={`${row.constructionCode}-${row.finishTier}-${row.widthGroup}-${row.height}`} className="border-t border-zinc-900"><td className="p-2 capitalize">{row.constructionCode}</td><td className="capitalize">{row.finishTier}</td><td>{row.widthGroup} ft</td><td>{row.height} ft</td><td><input type="number" step="0.01" value={row.vendorCost} onChange={e => { const rows = [...config.priceRows]; rows[index] = { ...row, vendorCost: Number(e.target.value) }; setConfig({ ...config, priceRows: rows }) }} className="w-28 rounded-lg border border-zinc-700 bg-black p-2 text-white" /></td></tr>)}</tbody></table></div>
      </section>

      <button onClick={save} disabled={busy} className="rounded-xl bg-[#00FF47] px-6 py-4 font-black uppercase text-black disabled:opacity-40">Publish Updated Price Book</button>
    </div>}
    {message && <p className="mt-4 text-sm font-bold text-[#00FF47]">{message}</p>}
  </div>
}
