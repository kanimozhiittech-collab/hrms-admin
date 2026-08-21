"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Users, Clock, CalendarDays, Wallet, FileText, BarChart3, Settings, ChevronLeft, ChevronRight, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const HR_ROLES = ["super_admin", "company_admin", "hr_manager"];

const baseNav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/attendance", label: "Attendance", icon: Clock },
  { href: "/leaves", label: "Leaves", icon: CalendarDays },
  { href: "/support", label: "Support", icon: LifeBuoy },
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
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { api.me().then(m => setIsHR(HR_ROLES.includes(m.role))).catch(() => {}); }, []);
  useEffect(() => {
    setCollapsed(localStorage.getItem("pp_sidebar_collapsed") === "1");
  }, []);
  function toggleCollapsed() {
    setCollapsed(c => {
      localStorage.setItem("pp_sidebar_collapsed", c ? "0" : "1");
      return !c;
    });
  }

  // Employees directory only for HR; everyone gets Home/Attendance/Leaves
  const nav = isHR
    ? [baseNav[0], hrNav, ...baseNav.slice(1)]
    : baseNav;
  return (
    <aside className={cn(
      "hidden md:flex flex-col bg-slate-900 text-slate-100 min-h-screen transition-[width] duration-150",
      collapsed ? "md:w-[68px]" : "md:w-64"
    )}>
      <div className={cn("py-5 flex items-center gap-2 border-b border-white/10", collapsed ? "px-3 justify-center" : "px-5")}>
        <div className="h-9 w-9 shrink-0 rounded-lg bg-brand-600 grid place-items-center"><Building2 className="h-5 w-5"/></div>
        {!collapsed && (
          <div>
            <div className="text-sm font-semibold">HRMS</div>
            <div className="text-[11px] text-slate-400">HRMS Suite</div>
          </div>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-6">
        <div>
          {!collapsed && <div className="px-2 mb-2 text-[10px] uppercase tracking-wider text-slate-400">Overview</div>}
          <div className="space-y-0.5">
            {nav.map(i => {
              const active = pathname === i.href || (i.href !== "/dashboard" && pathname.startsWith(i.href));
              return (
                <Link key={i.href} href={i.href} title={collapsed ? i.label : undefined}
                  className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                    collapsed && "justify-center px-0",
                    active ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white")}>
                  <i.icon className="h-4 w-4 shrink-0"/>{!collapsed && i.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div>
          {!collapsed && <div className="px-2 mb-2 text-[10px] uppercase tracking-wider text-slate-400">HR Modules</div>}
          <div className="space-y-0.5">
            {soon.map(i => (
              <div key={i.label} title={collapsed ? i.label : undefined}
                className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-400 cursor-not-allowed",
                  collapsed && "justify-center px-0")}>
                <i.icon className="h-4 w-4 shrink-0"/>
                {!collapsed && <>{i.label}<span className="ml-auto text-[9px] tracking-wider uppercase text-slate-500">Soon</span></>}
              </div>
            ))}
          </div>
        </div>
      </nav>
      {isHR && (
        <div className="p-3 border-t border-white/10">
          <Link href="/settings" title={collapsed ? "Settings" : undefined}
            className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm",
              collapsed && "justify-center px-0",
              pathname.startsWith("/settings") ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white")}>
            <Settings className="h-4 w-4 shrink-0"/>{!collapsed && "Settings"}
          </Link>
        </div>
      )}
      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="flex items-center justify-center gap-2 p-2.5 border-t border-white/10 text-slate-400 hover:bg-white/5 hover:text-white text-xs"
      >
        {collapsed ? <ChevronRight className="h-4 w-4"/> : <><ChevronLeft className="h-4 w-4"/>Collapse</>}
      </button>
    </aside>
  );
}
