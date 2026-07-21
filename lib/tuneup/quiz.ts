// The 60-Second Garage Door Noise & Safety Check — questions, scoring, and
// result tiers. Shared by the quiz UI and the API so the score a visitor sees
// is always the score the server stores.

export type QuizQuestion = {
  id: string
  prompt: string
  multi?: boolean
  options: Array<{ value: string; label: string; points: number }>
}

export const QUIZ: QuizQuestion[] = [
  {
    id: "louder",
    prompt: "Is your garage door louder than it was a year ago?",
    options: [
      { value: "yes", label: "Yes", points: 2 },
      { value: "no", label: "No", points: 0 },
      { value: "not-sure", label: "Not sure", points: 1 },
    ],
  },
  {
    id: "shake",
    prompt: "Does the door shake, rattle, or wobble while opening or closing?",
    options: [
      { value: "frequently", label: "Frequently", points: 2 },
      { value: "occasionally", label: "Occasionally", points: 1 },
      { value: "never", label: "Never", points: 0 },
    ],
  },
  {
    id: "sounds",
    prompt: "Which sounds have you noticed?",
    multi: true,
    options: [
      { value: "squeaking", label: "Squeaking", points: 1 },
      { value: "grinding", label: "Grinding", points: 2 },
      { value: "scraping", label: "Scraping", points: 2 },
      { value: "popping", label: "Popping", points: 1 },
      { value: "rattling", label: "Rattling", points: 1 },
      { value: "none", label: "No unusual sounds", points: 0 },
    ],
  },
  {
    id: "smooth",
    prompt: "Does the door move smoothly from fully closed to fully open?",
    options: [
      { value: "yes", label: "Yes", points: 0 },
      { value: "usually", label: "Usually", points: 1 },
      { value: "no", label: "No", points: 2 },
      { value: "not-sure", label: "Not sure", points: 1 },
    ],
  },
  {
    id: "rollers",
    prompt: "Do any of the rollers appear cracked, worn, crooked, or damaged?",
    options: [
      { value: "yes", label: "Yes", points: 3 },
      { value: "no", label: "No", points: 0 },
      { value: "not-checked", label: "I have not checked", points: 1 },
    ],
  },
  {
    id: "serviced",
    prompt: "When was the garage door last professionally serviced?",
    options: [
      { value: "past-year", label: "Within the past year", points: 0 },
      { value: "1-2-years", label: "One to two years ago", points: 1 },
      { value: "2-plus-years", label: "More than two years ago", points: 2 },
      { value: "unknown", label: "I do not know", points: 2 },
    ],
  },
  {
    id: "hesitate",
    prompt: "Does the door ever hesitate, jerk, or reverse unexpectedly?",
    options: [
      { value: "yes", label: "Yes", points: 3 },
      { value: "occasionally", label: "Occasionally", points: 2 },
      { value: "no", label: "No", points: 0 },
    ],
  },
  {
    id: "usage",
    prompt: "How often does your household use the garage door?",
    options: [
      { value: "heavy", label: "More than six times a day", points: 2 },
      { value: "medium", label: "Two to six times a day", points: 1 },
      { value: "light", label: "Once a day or less", points: 0 },
    ],
  },
]

export type QuizAnswers = Record<string, string | string[]>
export type Tier = "quiet" | "wear" | "inspect"

// Multi-select sound points are capped so one noisy evening can't dominate the
// score; an unexpected-reversal answer always escalates to a professional
// inspection because that symptom involves the safety system.
export function scoreQuiz(answers: QuizAnswers): { score: number; tier: Tier } {
  let score = 0
  for (const question of QUIZ) {
    const raw = answers[question.id]
    if (raw === undefined) continue
    if (question.multi) {
      const values = Array.isArray(raw) ? raw : [raw]
      const pts = values.reduce((sum, value) => sum + (question.options.find(o => o.value === value)?.points ?? 0), 0)
      score += Math.min(pts, 4)
    } else if (typeof raw === "string") {
      score += question.options.find(o => o.value === raw)?.points ?? 0
    }
  }
  const reversal = answers["hesitate"] === "yes"
  const tier: Tier = reversal || score >= 11 ? "inspect" : score >= 5 ? "wear" : "quiet"
  return { score, tier }
}

export const TIERS: Record<Tier, { name: string; headline: string; body: string; cta: string }> = {
  quiet: {
    name: "Quiet and Smooth",
    headline: "Your door isn't showing many warning signs right now",
    body: "Your garage door is not showing many obvious warning signs. Continue watching for new noises, shaking, or changes in movement — doors get louder so gradually that most homeowners stop noticing. A yearly tune-up keeps it that way.",
    cta: "Keep My Door Running Smoothly — Schedule the $129 Tune-Up",
  },
  wear: {
    name: "Showing Signs of Wear",
    headline: "Parts of your door may be wearing",
    body: "Your answers suggest that parts of the door may be wearing or moving less smoothly than they should. Worn rollers, loose components, insufficient lubrication, and alignment problems all produce these symptoms — and an in-person inspection is the way to find the actual cause.",
    cta: "Replace My Rollers and Tune My Door for $129",
  },
  inspect: {
    name: "Professional Inspection Recommended",
    headline: "Your door deserves professional attention",
    body: "Your garage door is showing symptoms that deserve professional attention. Please avoid adjusting the springs or cables yourself — they are under high tension. A technician can inspect the full system, explain what is causing the symptoms, and tune what the service covers.",
    cta: "Schedule My $129 Garage Door Tune-Up",
  },
}

export const TUNEUP_DISCLAIMER = "The $129 Quiet Door Tune-Up covers qualifying residential garage doors in our East Texas service area and includes inspection, tune-up, and replacement of the included rollers. It is not guaranteed to resolve every mechanical problem — any additional repairs are quoted separately and never performed without your approval."
