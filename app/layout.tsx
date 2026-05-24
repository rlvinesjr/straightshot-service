import type { Metadata } from "next"
import { Barlow_Condensed, Inter } from "next/font/google"
import "./globals.css"

const barlowCondensed = Barlow_Condensed({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
})

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "StraightShot Overhead",
  description: "Service management for StraightShot Overhead garage door services",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${barlowCondensed.variable} ${inter.variable} h-full`}>
      <body
        className="min-h-full flex flex-col bg-black text-[#CCCCCC]"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {children}
      </body>
    </html>
  )
}
