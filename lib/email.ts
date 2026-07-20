// Dependency-free SMTP client, ported from the Field app's email.js so both
// apps send mail the same way (STARTTLS + AUTH LOGIN through the same mailbox).
// Config comes from env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM,
// optional MAIL_REPLY_TO. All sends are best-effort — callers use tryEmail.
import net from "node:net"
import tls from "node:tls"

type Message = { to: string; subject: string; html: string }

function makeReader(getSocket: () => net.Socket | tls.TLSSocket) {
  let buffer = ""
  const pending: Array<(line: { code: number; text: string }) => void> = []
  let failed: Error | null = null

  const flush = () => {
    // SMTP replies end with "NNN " (space after code on the final line)
    let index
    while ((index = buffer.indexOf("\r\n")) !== -1) {
      const upTo = buffer.slice(0, index)
      const lastLine = upTo.split("\r\n").pop() ?? ""
      if (/^\d{3} /.test(lastLine)) {
        const text = buffer.slice(0, index)
        buffer = buffer.slice(index + 2)
        const code = Number(lastLine.slice(0, 3))
        pending.shift()?.({ code, text })
      } else if (/^\d{3}-/.test(lastLine)) {
        // multiline continuation — wait for more data within this reply
        const next = buffer.indexOf("\r\n", index + 2)
        if (next === -1) return
        continue
      } else {
        buffer = buffer.slice(index + 2)
      }
    }
  }

  return {
    bind(socket: net.Socket | tls.TLSSocket) {
      socket.on("data", chunk => { buffer += chunk.toString("utf8"); flush() })
      socket.on("error", error => { failed = error as Error; pending.splice(0).forEach(r => r({ code: 0, text: String(error) })) })
      socket.setTimeout(20000, () => { failed = new Error("SMTP timeout"); socket.destroy(); pending.splice(0).forEach(r => r({ code: 0, text: "timeout" })) })
    },
    read(): Promise<{ code: number; text: string }> {
      if (failed) return Promise.resolve({ code: 0, text: String(failed) })
      return new Promise(resolve => { pending.push(resolve); flush() })
    },
    get socket() { return getSocket() },
  }
}

export async function sendMail(message: Message): Promise<void> {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT) || 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM || user
  const replyTo = process.env.MAIL_REPLY_TO
  if (!host || !user || !pass || !from) throw new Error("SMTP not configured")

  let sock: net.Socket | tls.TLSSocket = port === 465
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port })
  const reader = makeReader(() => sock)
  reader.bind(sock)

  const write = (line: string) => { sock.write(line + "\r\n") }
  const expect = (reply: { code: number; text: string }, ...codes: number[]) => {
    if (!codes.includes(reply.code)) throw new Error(`SMTP ${reply.code}: ${reply.text.slice(0, 200)}`)
    return reply
  }

  try {
    expect(await reader.read(), 220)
    write("EHLO straightshot")
    const reply = expect(await reader.read(), 250)

    if (port !== 465 && /STARTTLS/i.test(reply.text)) {
      write("STARTTLS")
      expect(await reader.read(), 220)
      const plain = sock
      sock = tls.connect({ socket: plain, servername: host })
      reader.bind(sock)
      await new Promise<void>((resolve, reject) => { (sock as tls.TLSSocket).once("secureConnect", resolve); sock.once("error", reject) })
      write("EHLO straightshot")
      expect(await reader.read(), 250)
    }

    write("AUTH LOGIN")
    expect(await reader.read(), 334)
    write(Buffer.from(user).toString("base64"))
    expect(await reader.read(), 334)
    write(Buffer.from(pass).toString("base64"))
    expect(await reader.read(), 235)

    const fromAddr = /<.*>/.test(from) ? from.match(/<(.*)>/)![1] : from
    write(`MAIL FROM:<${fromAddr}>`)
    expect(await reader.read(), 250)
    write(`RCPT TO:<${message.to.trim()}>`)
    expect(await reader.read(), 250, 251)
    write("DATA")
    expect(await reader.read(), 354)

    const headers = [
      `From: ${from}`,
      `To: ${message.to.trim()}`,
      ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
      `Subject: ${message.subject.replace(/[\r\n]/g, " ")}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=utf-8",
    ].join("\r\n")
    const body = message.html.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..")
    sock.write(headers + "\r\n\r\n" + body + "\r\n.\r\n")
    expect(await reader.read(), 250)
    write("QUIT")
  } finally {
    sock.destroy()
  }
}

export async function tryEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!to || !process.env.SMTP_HOST) return false
  try {
    await sendMail({ to, subject, html })
    return true
  } catch (error) {
    console.error("email send failed:", error instanceof Error ? error.message : error)
    return false
  }
}
