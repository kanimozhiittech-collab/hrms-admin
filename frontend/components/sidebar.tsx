"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Users, Clock, CalendarDays, Wallet, FileText, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const HR_ROLES = ["super_admin", "company_admin", "hr_manager"];

const baseNav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/attendance", label: "Attendance", icon: Clock },
  { href: "/leaves", label: "Leaves", icon: CalendarDays },
];
// HR-only directory link
const hrNav = { href: "/employees", label: "Employees", icon: Users };
const soon = [
  { label: "Payroll", icon: Wallet },
  { label: "Documents", icon: FileText },
  { label: "Reports", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isHR, setIsHR] = useState(false);
  useEffect(() => { api.me().then(m => setIsHR(HR_ROLES.includes(m.role))).catch(() => {}); }, []);

  // Employees directory only for HR; everyone gets Home/Attendance/Leaves
  const nav = isHR
    ? [baseNav[0], hrNav, ...baseNav.slice(1)]
    : baseNav;
  return (
    <aside className="hidden md:flex md:w-64 flex-col bg-slate-900 text-slate-100 min-h-screen">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-white/10">
        <div className="h-9 w-9 rounded-lg bg-brand-600 grid place-items-center"><Building2 className="h-5 w-5"/></div>
        <div>
          <div className="text-sm font-semibold">HRMS</div>
          <div className="text-[11px] text-slate-400">HRMS Suite</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-6">
        <div>
          <div className="px-2 mb-2 text-[10px] uppercase tracking-wider text-slate-400">Overview</div>
          <div className="space-y-0.5">
            {nav.map(i => {
              const active = pathname === i.href || (i.href !== "/dashboard" && pathname.startsWith(i.href));
              return (
                <Link key={i.href} href={i.href}
                  className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                    active ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white")}>
                  <i.icon className="h-4 w-4"/>{i.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div>
          <div className="px-2 mb-2 text-[10px] uppercase tracking-wider text-slate-400">HR Modules</div>
          <div className="space-y-0.5">
            {soon.map(i => (
              <div key={i.label} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-400 cursor-not-allowed">
                <i.icon className="h-4 w-4"/>{i.label}
                <span className="ml-auto text-[9px] tracking-wider uppercase text-slate-500">Soon</span>
              </div>
            ))}
          </div>
        </div>
      </nav>
      {isHR && (
        <div className="p-3 border-t border-white/10">
          <Link href="/settings"
            className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm",
              pathname.startsWith("/settings") ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white")}>
            <Settings className="h-4 w-4"/>Settings
          </Link>
        </div>
      )}
    </aside>
  );
}
