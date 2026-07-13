"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  {
    href: "/packages",
    label: "Packages",
    icon: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25" /></svg>,
  },
  {
    href: "/door-estimator",
    label: "Doors",
    dashboardOnly: true,
    icon: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 21V4.875A1.875 1.875 0 016.375 3h11.25A1.875 1.875 0 0119.5 4.875V21M7.5 7.5h9m-9 3h9m-9 3h9m-9 3h9" /></svg>,
  },
  {
    href: "/estimates/new",
    label: "New Estimate",
    icon: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
  },
  {
    href: "/estimates",
    label: "Jobs",
    icon: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108" /></svg>,
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // The public deployment exposes only /door-estimator*; keep other dashboard
  // destinations out of the nav there so nothing links to a blocked route.
  const isDoors = pathname.startsWith("/door-estimator")
  const items = isDoors ? navItems.filter(item => item.dashboardOnly) : navItems

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#222222] bg-[#111111] px-4 py-3">
        <Link href={isDoors ? "/door-estimator/field" : "/packages"} className="flex items-center gap-3">
          <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8"><rect width="32" height="32" rx="6" fill="#00FF47" /><text x="16" y="23" textAnchor="middle" fontSize="18" fontWeight="900" fill="#000" fontFamily="sans-serif">S</text></svg>
          <div><p className="text-lg font-black uppercase leading-none tracking-wide text-white" style={{ fontFamily: "var(--font-heading)" }}>StraightShot</p><p className="text-xs leading-none text-[#00FF47]">Overhead</p></div>
        </Link>
        {pathname.startsWith("/door-estimator") && <Link href="/door-estimator/admin" className="rounded-lg border border-[#333] px-3 py-2 text-xs font-bold uppercase text-white hover:border-[#00FF47]">Door Pricing</Link>}
      </header>

      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-[#222222] bg-[#111111]">
        {items.map(item => {
          const href = item.dashboardOnly ? "/door-estimator/field" : item.href
          const isActive = item.dashboardOnly
            ? pathname.startsWith("/door-estimator")
            : item.href === "/estimates/new"
              ? pathname === "/estimates/new"
              : pathname.startsWith(item.href)
          return <Link key={item.label} href={href} className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] transition-colors ${isActive ? "text-[#00FF47]" : "text-[#666666]"}`}>{item.icon}<span>{item.label}</span></Link>
        })}
      </nav>
    </div>
  )
}
