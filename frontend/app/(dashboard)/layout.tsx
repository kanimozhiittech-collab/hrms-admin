"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { tokenStore } from "@/lib/auth";
import { SidebarProvider } from "@/lib/sidebar-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!tokenStore.get()) router.replace("/login");
    else setReady(true);
  }, [router]);
  // This layout (and its scroll container) persists across page navigations —
  // Next.js only resets window scroll on route change, not a nested
  // overflow-y-auto div, so leaving a long page scrolled down and clicking
  // into a shorter one landed you already scrolled past its content.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);
  if (!ready) return null;
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-stone-100">
        <Sidebar/>
        <div ref={scrollRef} className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto bg-stone-100">{children}</div>
      </div>
    </SidebarProvider>
  );
}
