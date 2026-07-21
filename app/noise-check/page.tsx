import type { Metadata } from "next"
import NoiseCheck from "@/components/tuneup/NoiseCheck"

export const metadata: Metadata = {
  title: "Noisy Garage Door? Free 60-Second Noise & Safety Check | StraightShot Overhead",
  description: "Answer a few simple questions about the sounds and movement you're noticing and get a personalized garage-door condition score — plus the next step we recommend for East Texas homes.",
}

export default function NoiseCheckPage() {
  return <NoiseCheck />
}
