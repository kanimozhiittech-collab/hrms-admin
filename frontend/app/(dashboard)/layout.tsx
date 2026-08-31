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
  // This shell owns its own scrolling via the inner overflow-y-auto panel —
  // the sidebar has nothing to consume a wheel event over it, so without this
  // it bubbles to the document, which (per measured scrollHeight) has a few
  // hundred px of stray overflow and drags the whole page — sidebar included
  // — up, hiding the top nav links and leaving blank space below the content.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
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
