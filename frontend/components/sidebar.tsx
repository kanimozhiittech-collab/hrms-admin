"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Clock, CalendarDays, Wallet, FileText, BarChart3, Settings, ChevronLeft, ChevronRight, LifeBuoy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, fileUrl } from "@/lib/api";
import { useSidebar } from "@/lib/sidebar-context";

const HR_ROLES = ["super_admin", "company_admin", "hr_manager"];

const baseNav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/attendance", label: "Attendance", icon: Clock },
  { href: "/leaves", label: "Leaves", icon: CalendarDays },
];
const hrNav = { href: "/employees", label: "Employees", icon: Users };
const soon = [
  { label: "Payroll", icon: Wallet },
  { label: "Documents", icon: FileText },
  { label: "Reports", icon: BarChart3 },
];
const bottomNav = [
  { href: "/support", label: "Support", icon: LifeBuoy },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isHR, setIsHR] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [company, setCompany] = useState<{ name?: string; logo_url?: string } | null>(null);
  const { mobileOpen, setMobileOpen } = useSidebar();

  useEffect(() => { api.me().then(m => setIsHR(HR_ROLES.includes(m.role))).catch(() => {}); }, []);
  useEffect(() => { api.getCompany().then(setCompany).catch(() => {}); }, []);
  useEffect(() => {
    setCollapsed(localStorage.getItem("pp_sidebar_collapsed") === "1");
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  function toggleCollapsed() {
    setCollapsed(c => {
      localStorage.setItem("pp_sidebar_collapsed", c ? "0" : "1");
      return !c;
    });
  }

  const nav = isHR
    ? [baseNav[0], hrNav, ...baseNav.slice(1)]
    : baseNav;
  // Settings is HR/admin-only; Support is for everyone.
  const bottomLinks = isHR ? bottomNav : bottomNav.filter(i => i.href !== "/settings");

  const sidebarContent = (
    <aside className={cn(
      "flex flex-col bg-slate-900 text-slate-100 min-h-screen transition-[width] duration-150",
      // Desktop: collapsible width
      collapsed ? "md:w-[68px]" : "md:w-64",
      // Mobile: always full nav width
      "w-64"
    )}>
      <div className={cn("py-5 flex items-center gap-2 border-b border-white/10", collapsed ? "md:px-3 md:justify-center px-5" : "px-5")}>
        {company?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl(company.logo_url)} alt={company.name || "Logo"} className="h-9 w-9 shrink-0 rounded-lg object-cover"/>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo.png" alt="Logo" className="h-9 w-9 shrink-0 rounded-lg object-contain"/>
        )}
        <div className={cn(collapsed && "md:hidden")}>
          <div className="text-sm font-semibold truncate max-w-[140px]">{company?.name || "HRMS"}</div>
          <div className="text-[11px] text-slate-400">HRMS Suite</div>
        </div>
        {/* Close button — mobile only */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="ml-auto grid h-8 w-8 place-items-center rounded text-slate-400 hover:bg-white/10 md:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5"/>
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-6 p-3">
        <div>
          <div className={cn("px-2 mb-2 text-[10px] uppercase tracking-wider text-slate-400", collapsed && "md:hidden")}>Overview</div>
          <div className="space-y-0.5">
            {nav.map(i => {
              const active = pathname === i.href || (i.href !== "/dashboard" && pathname.startsWith(i.href));
              return (
                <Link key={i.href} href={i.href} title={collapsed ? i.label : undefined}
                  className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                    collapsed && "md:justify-center md:px-0",
                    active ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white")}>
                  <i.icon className="h-4 w-4 shrink-0"/>
                  <span className={cn(collapsed && "md:hidden")}>{i.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
        <div>
          <div className={cn("px-2 mb-2 text-[10px] uppercase tracking-wider text-slate-400", collapsed && "md:hidden")}>HR Modules</div>
          <div className="space-y-0.5">
            {soon.map(i => (
              <div key={i.label} title={collapsed ? i.label : undefined}
                className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-400 cursor-not-allowed",
                  collapsed && "md:justify-center md:px-0")}>
                <i.icon className="h-4 w-4 shrink-0"/>
                <span className={cn(collapsed && "md:hidden")}>{i.label}</span>
                <span className={cn("ml-auto text-[9px] tracking-wider uppercase text-slate-500", collapsed && "md:hidden")}>Soon</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-auto">
          <div className="space-y-0.5">
            {bottomLinks.map(i => {
              const active = pathname === i.href || pathname.startsWith(i.href);
              return (
                <Link key={i.href} href={i.href} title={collapsed ? i.label : undefined}
                  className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                    collapsed && "md:justify-center md:px-0",
                    active ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white")}>
                  <i.icon className="h-4 w-4 shrink-0"/>
                  <span className={cn(collapsed && "md:hidden")}>{i.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Collapse toggle — desktop only */}
      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden md:flex items-center justify-center gap-2 p-2.5 border-t border-white/10 text-slate-400 hover:bg-white/5 hover:text-white text-xs"
      >
        {collapsed ? <ChevronRight className="h-4 w-4"/> : <><ChevronLeft className="h-4 w-4"/>Collapse</>}
      </button>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        {sidebarContent}
      </div>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-40 md:hidden", mobileOpen ? "pointer-events-auto" : "pointer-events-none")}>
        {/* Backdrop */}
        <div
          className={cn("absolute inset-0 bg-black/50 transition-opacity duration-200", mobileOpen ? "opacity-100" : "opacity-0")}
          onClick={() => setMobileOpen(false)}
        />
        {/* Drawer */}
        <div className={cn(
          "absolute left-0 top-0 h-full transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
