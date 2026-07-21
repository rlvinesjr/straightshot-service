import { db } from "@/lib/db"
import { tryEmail } from "@/lib/email"
import { publicCorsHeaders, jsonError } from "@/lib/door-estimator/api-utils"
import { scoreQuiz, QUIZ, type QuizAnswers } from "@/lib/tuneup/quiz"
import { scoreEmail, quizLeadAlert, TUNEUP_DRIP_OFFSETS_DAYS } from "@/lib/tuneup/tuneup-emails"

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicCorsHeaders(request) })
}

// Noise & Safety Check submission: the score is recomputed server-side from
// the raw answers so the stored tier always matches the scoring rules.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      answers?: QuizAnswers
      lead?: { firstName?: string; contact?: string; zip?: string }
    }
    const answers = body.answers ?? {}
    const answered = QUIZ.filter(q => answers[q.id] !== undefined).length
    if (answered < 5) return jsonError("Please answer the quiz questions first", 400, publicCorsHeaders(request))

    const firstName = body.lead?.firstName?.trim() ?? ""
    const contactRaw = body.lead?.contact?.trim() ?? ""
    const zip = body.lead?.zip?.trim() ?? ""
    if (firstName.length < 2) return jsonError("Please enter your first name", 400, publicCorsHeaders(request))
    if (!/^\d{5}$/.test(zip)) return jsonError("Please enter a 5-digit ZIP code", 400, publicCorsHeaders(request))
    const digits = contactRaw.replace(/\D/g, "")
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contactRaw)
    const isPhone = !isEmail && (digits.length === 10 || (digits.length === 11 && digits.startsWith("1")))
    if (!isEmail && !isPhone) return jsonError("Please enter a valid email address or 10-digit mobile number", 400, publicCorsHeaders(request))
    const phone = isPhone ? (digits.length === 11 ? digits.slice(1) : digits) : null
    const email = isEmail ? contactRaw.toLowerCase() : null

    const { score, tier } = scoreQuiz(answers)
    const record = await db.tuneUpLead.create({
      data: {
        firstName,
        email,
        phone,
        zip,
        score,
        tier,
        answersJson: JSON.stringify(answers),
        nextDripAt: email ? new Date(Date.now() + TUNEUP_DRIP_OFFSETS_DAYS[0] * 86400000) : null,
      },
    })

    const alertTo = process.env.LEAD_ALERT_TO
    if (alertTo) {
      const alert = quizLeadAlert(record)
      void tryEmail(alertTo, alert.subject, alert.html)
    }
    if (email) {
      const delivery = scoreEmail(record)
      void tryEmail(email, delivery.subject, delivery.html)
    }
    return Response.json({ token: record.token, score, tier, emailed: Boolean(email) }, { status: 201, headers: publicCorsHeaders(request) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to score your check"
    return jsonError(message, 400, publicCorsHeaders(request))
  }
}
