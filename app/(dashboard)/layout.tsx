"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"

const navItems = [
  {
    href: "/packages",
    label: "Packages",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
  {
    href: "/estimates/new",
    label: "New Estimate",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  {
    href: "/estimates",
    label: "Jobs",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top header */}
      <header className="bg-[#111111] border-b border-[#222222] px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-8 h-8 relative flex-shrink-0">
          <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
            <rect width="32" height="32" rx="6" fill="#00FF47" />
            <text x="16" y="23" textAnchor="middle" fontSize="18" fontWeight="900" fill="#000" fontFamily="sans-serif">S</text>
          </svg>
        </div>
        <div>
          <p
            className="text-white font-black tracking-wide leading-none uppercase text-lg"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            StraightShot
          </p>
          <p className="text-[#00FF47] text-xs leading-none">Overhead</p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#111111] border-t border-[#222222] flex z-10">
        {navItems.map((item) => {
          const isActive =
            item.href === "/estimates/new"
              ? pathname === "/estimates/new"
              : pathname.startsWith(item.href) && item.href !== "/estimates/new"
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                isActive ? "text-[#00FF47]" : "text-[#666666]"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
