// End-to-end check of the repair landing page + request pipeline, against the
// REAL built app (`npm run build` first) on a throwaway copy of the database,
// with a local fake SMTP server as the mail sandbox — no real email is sent and
// no production data is touched.
//
// Run: npm run build && npm run e2e:repair
import { spawn } from "node:child_process"
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import net from "node:net"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"
import assert from "node:assert/strict"

const ROOT = path.resolve(import.meta.dirname, "..")
const TMP = path.join(ROOT, "prisma", "data", "e2e")
rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })
const DB = path.join(TMP, "repair-e2e.db")
copyFileSync(path.join(ROOT, "prisma", "dev.db"), DB) // migrated schema, local test data only
const EMPTY_DB = path.join(TMP, "no-tables.db")
writeFileSync(EMPTY_DB, "")

// ---------- fake SMTP: records messages; can be told to refuse ----------
const mail = []
let smtpMode = "ok"
// one fake server; AUTH LOGIN = username line, then password line, then accepted
const smtp = net.createServer(sock => {
  let data = false, buf = "", msg = "", authStep = 0
  sock.on("error", () => {}) // the client drops the socket right after QUIT
  sock.write("220 fake-smtp ready\r\n")
  sock.on("data", chunk => {
    buf += chunk.toString()
    let i
    while ((i = buf.indexOf("\r\n")) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 2)
      if (data) {
        if (line === ".") { data = false; mail.push(msg); msg = ""; sock.write("250 queued\r\n") }
        else msg += line + "\n"
        continue
      }
      if (authStep === 1) { authStep = 2; sock.write("334 UGFzc3dvcmQ6\r\n"); continue }
      if (authStep === 2) { authStep = 3; sock.write("235 authenticated\r\n"); continue }
      const cmd = line.slice(0, 4).toUpperCase()
      if (cmd === "EHLO") sock.write("250-fake\r\n250 AUTH LOGIN\r\n")
      else if (cmd === "AUTH") { authStep = 1; sock.write("334 VXNlcm5hbWU6\r\n") }
      else if (cmd === "MAIL") sock.write("250 ok\r\n")
      else if (cmd === "RCPT") sock.write(smtpMode === "fail" ? "451 4.3.0 mailbox temporarily unavailable\r\n" : "250 ok\r\n")
      else if (cmd === "DATA") { data = true; sock.write("354 go\r\n") }
      else if (cmd === "QUIT") { sock.write("221 bye\r\n"); sock.end() }
      else sock.write("502 unknown\r\n")
    }
  })
})
await new Promise(r => smtp.listen(0, "127.0.0.1", r))
const SMTP_PORT = smtp.address().port

// ---------- the app ----------
const KEY = "e2e-" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
function startApp(port, dbFile) {
  const child = spawn(process.execPath, [path.join(ROOT, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(port)], {
    cwd: ROOT,
    env: {
      ...process.env, NODE_ENV: "production",
      DATABASE_URL: "file:" + dbFile.replace(/\\/g, "/"),
      SMTP_HOST: "127.0.0.1", SMTP_PORT: String(SMTP_PORT), SMTP_USER: "sandbox", SMTP_PASS: "sandbox", SMTP_FROM: "sandbox@example.test",
      REPAIR_LEAD_ALERT_TO: "", // default recipient under test
      DOOR_ESTIMATOR_ADMIN_KEY: KEY,
    },
    stdio: ["ignore", "pipe", "pipe"],
  })
  let logs = ""
  child.stdout.on("data", d => { logs += d })
  child.stderr.on("data", d => { logs += d })
  return { child, logs: () => logs }
}
async function ready(base) {
  for (let i = 0; i < 150; i++) {
    try { await fetch(base + "/privacy"); return } catch { await new Promise(r => setTimeout(r, 200)) }
  }
  throw new Error("app never came up at " + base)
}

const PORT = 3100 + Math.floor(Math.random() * 400)
const BASE = `http://127.0.0.1:${PORT}`
const app = startApp(PORT, DB)
const broken = startApp(PORT + 1, EMPTY_DB) // a server whose storage is unusable
const cleanup = () => { app.child.kill(); broken.child.kill(); smtp.close() }
process.on("exit", cleanup)

let passed = 0
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ok  ${name}`) }
  catch (e) { console.error(`FAIL  ${name}\n${e.stack}\n--- app log ---\n${app.logs().slice(-3000)}`); cleanup(); process.exit(1) }
}
const sleep = ms => new Promise(r => setTimeout(r, ms))
let ipSeq = 1
const post = (body, base = BASE) => fetch(base + "/api/repair-request", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Forwarded-For": `10.0.0.${ipSeq++}` },
  body: JSON.stringify(body),
})
const sid = () => crypto.randomUUID()
const lead = (over = {}) => ({
  submissionId: sid(), name: "Pat Tester", phone: `903555${String(1000 + Math.floor(Math.random() * 8999))}`,
  zipCode: "75703", residentialConfirmed: true, problem: "Cable came off the drum", email: "",
  landing: "garage-door-repair", gclid: "EAIaIQobChMI-e2e-test-click", utmSource: "google", utmMedium: "cpc",
  utmCampaign: "SSO — Search — Smith County — Repair", ...over,
})
const db = () => new DatabaseSync(DB)
const row = ref => { const d = db(); const r = d.prepare("SELECT * FROM TuneUpBooking WHERE reference = ?").get(ref); d.close(); return r }
const count = where => { const d = db(); const n = d.prepare(`SELECT COUNT(*) n FROM TuneUpBooking WHERE ${where}`).get().n; d.close(); return n }
async function waitFor(fn, ms = 8000) {
  const end = Date.now() + ms
  while (Date.now() < end) { if (await fn()) return true; await sleep(100) }
  return false
}

await Promise.all([ready(BASE), ready(`http://127.0.0.1:${PORT + 1}`)])
console.log(`app on ${BASE}, sandbox SMTP on ${SMTP_PORT}\n`)

await test("the landing page renders its H1 on the server, with no social proof", async () => {
  const r = await fetch(BASE + "/lp/garage-door-repair")
  assert.equal(r.status, 200)
  const html = await r.text()
  assert.match(html, /<h1[^>]*>Garage Door Repair<\/h1>/)
  assert.match(html, /Residential service in Smith County, Texas/)
  assert.match(html, /Request Repair/)
  assert.match(html, /We will contact you to arrange an appointment/)
  assert.match(html, /noindex/, "ad page stays out of organic search")
  const text = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ")
  for (const banned of [/testimonial/i, /\breview/i, /\brating/i, /★/, /guarantee/i, /24\/7/, /same[- ]day/i]) {
    assert.ok(!banned.test(text), `rendered page contains ${banned}`)
  }
  assert.ok(!/googletagmanager/.test(html), "no Google tag loads until an Ads ID is configured")
})

await test("unknown landing pages 404, and the query string is never echoed", async () => {
  assert.equal((await fetch(BASE + "/lp/free-garage-doors")).status, 404)
  const r = await fetch(BASE + "/lp/garage-door-repair?keyword=%3Cscript%3Exss%3C%2Fscript%3E&h1=Hacked")
  const html = await r.text()
  assert.ok(!html.includes("<script>xss") && !html.includes("Hacked"))
})

let firstRef
await test("a valid request is saved as ONE lead, then ONE office email goes out", async () => {
  const body = lead()
  const r = await post(body)
  assert.equal(r.status, 201)
  const j = await r.json()
  assert.match(j.reference, /^RR-[A-Z2-9]{5}$/)
  firstRef = j.reference
  const saved = row(j.reference)
  assert.equal(saved.serviceType, "repair")
  assert.equal(saved.status, "call_required", "no appointment is created")
  assert.equal(saved.residentialConfirmed, 1)
  assert.equal(saved.gclid, body.gclid)
  assert.equal(saved.landingPath, "/lp/garage-door-repair")
  assert.equal(saved.landingKeyword, "garage door repair")
  assert.ok(await waitFor(() => row(j.reference).notifyStatus === "sent"), "email marked sent")
  assert.equal(mail.length, 1)
  assert.match(mail[0], /To: ricky@straightshotoverhead\.com/)
  assert.match(mail[0], /Subject: New Garage Door Repair Request — Smith County/)
  assert.ok(!mail[0].includes(body.gclid), "the click ID is not in the email")
  assert.ok(row(j.reference).notifiedAt, "dispatch time recorded")
})

await test("double-click / retry with the same submission: same lead, no second email", async () => {
  const body = lead()
  const [a, b] = await Promise.all([post(body), post(body)])
  const ja = await a.json(), jb = await b.json()
  assert.equal(ja.reference, jb.reference)
  const again = await (await post(body)).json()
  assert.equal(again.reference, ja.reference)
  assert.equal(again.duplicate, true)
  assert.equal(count(`submissionId = '${body.submissionId}'`), 1)
  await waitFor(() => row(ja.reference).notifyStatus === "sent")
  await sleep(500)
  assert.equal(mail.filter(m => m.includes(ja.reference)).length, 1, "exactly one email for it")
})

await test("the same phone resubmitting from a reloaded page is not a second lead", async () => {
  const body = lead()
  const first = await (await post(body)).json()
  const second = await (await post({ ...body, submissionId: sid() })).json()
  assert.equal(second.reference, first.reference)
  assert.equal(count(`phone = '${body.phone}'`), 1)
})

await test("invalid input is refused with field errors and nothing is saved", async () => {
  const before = count("1=1")
  const r = await post(lead({ residentialConfirmed: false, phone: "123" }))
  assert.equal(r.status, 400)
  const j = await r.json()
  assert.ok(j.errors.residentialConfirmed && j.errors.phone)
  assert.equal(count("1=1"), before)
})

await test("the honeypot saves nothing", async () => {
  const before = count("1=1")
  assert.equal((await post(lead({ hp: "http://spam.example" }))).status, 201)
  assert.equal(count("1=1"), before)
})

await test("email failure keeps the lead, records the error, and a retry delivers it once", async () => {
  smtpMode = "fail"
  const body = lead()
  const r = await post(body)
  assert.equal(r.status, 201, "the visitor still gets success — the lead IS saved")
  const { reference } = await r.json()
  assert.ok(await waitFor(() => row(reference).notifyStatus === "failed"))
  const failed = row(reference)
  assert.match(failed.notifyError, /451/)
  assert.equal(failed.notifyAttempts, 1)

  // too early: the backoff holds it
  let sweep = await (await fetch(BASE + "/api/door-estimator/repair-notify-retry", { method: "POST", headers: { "X-Door-Estimator-Key": KEY } })).json()
  assert.equal(row(reference).notifyStatus, "failed")

  smtpMode = "ok"
  const d = db(); d.prepare("UPDATE TuneUpBooking SET updatedAt = ? WHERE reference = ?").run(Date.now() - 5 * 60_000, reference); d.close()
  sweep = await (await fetch(BASE + "/api/door-estimator/repair-notify-retry", { method: "POST", headers: { "X-Door-Estimator-Key": KEY } })).json()
  assert.ok(sweep.sent >= 1)
  const done = row(reference)
  assert.equal(done.notifyStatus, "sent")
  assert.equal(done.notifyAttempts, 2)
  assert.equal(count(`phone = '${body.phone}'`), 1, "still one lead")
  assert.equal(mail.filter(m => m.includes(reference)).length, 1)
  // and another sweep sends nothing more
  await fetch(BASE + "/api/door-estimator/repair-notify-retry", { method: "POST", headers: { "X-Door-Estimator-Key": KEY } })
  assert.equal(mail.filter(m => m.includes(reference)).length, 1)
})

await test("storage failure answers with a retryable error, never a success", async () => {
  const r = await post(lead(), `http://127.0.0.1:${PORT + 1}`)
  assert.equal(r.status, 503)
  const j = await r.json()
  assert.ok(!j.ok && !j.reference, "no reference, so the page cannot fire a conversion")
  assert.match(j.error, /still in the form/)
})

await test("the office list shows delivery + timing, but never the click ID", async () => {
  assert.equal((await fetch(BASE + "/api/door-estimator/tuneup-bookings")).status, 401)
  const list = await (await fetch(BASE + "/api/door-estimator/tuneup-bookings", { headers: { "X-Door-Estimator-Key": KEY } })).json()
  const mine = list.find(x => x.reference === firstRef)
  assert.equal(mine.serviceType, "repair")
  assert.equal(mine.notifyStatus, "sent")
  assert.equal(mine.paidClick, true)
  assert.ok(!JSON.stringify(list).includes("EAIaIQobChMI"), "no click IDs in the list")
})

await test("speed to lead: contacted and booked are stamped once, by the office", async () => {
  const patch = body => fetch(`${BASE}/api/door-estimator/tuneup-bookings/${firstRef}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", "X-Door-Estimator-Key": KEY }, body: JSON.stringify(body),
  })
  assert.equal(row(firstRef).firstResponseAt, null, "nothing automated counts as a response")
  const c = await (await patch({ contacted: true })).json()
  assert.equal(c.status, "pending_confirmation")
  const firstStamp = row(firstRef).firstResponseAt
  assert.ok(firstStamp)
  await patch({ contacted: true })
  assert.equal(row(firstRef).firstResponseAt, firstStamp, "the first response time never moves")
  await patch({ status: "confirmed", fieldJobId: 4321 })
  const booked = row(firstRef)
  assert.ok(booked.bookedAt)
  assert.equal(booked.fieldJobId, 4321)
})

await test("attribution is only available with the key, server to server", async () => {
  assert.equal((await fetch(`${BASE}/api/door-estimator/tuneup-bookings/${firstRef}/attribution`)).status, 401)
  const a = await (await fetch(`${BASE}/api/door-estimator/tuneup-bookings/${firstRef}/attribution`, { headers: { "X-Door-Estimator-Key": KEY } })).json()
  assert.equal(a.gclid, "EAIaIQobChMI-e2e-test-click")
  assert.equal(a.landingKeyword, "garage door repair")
})

console.log(`\n${passed} end-to-end checks passed`)
cleanup()
await sleep(1500) // Windows holds the SQLite files until the servers have exited
try { rmSync(TMP, { recursive: true, force: true }) } catch { /* gitignored scratch; next run clears it */ }
process.exit(0)
