"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { tokenStore } from "@/lib/auth";
import { Bell, LogOut, Search } from "lucide-react";

export function Topbar({ title }: { title: string }) {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  useEffect(() => { api.me().then(setMe).catch(() => { tokenStore.clear(); router.replace("/login"); }); }, []);
  function logout() { tokenStore.clear(); router.replace("/login"); }

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
      <div className="h-14 px-4 lg:px-6 flex items-center gap-4">
        <h1 className="text-base font-semibold text-slate-900">{title}</h1>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400"/>
            <input placeholder="Search…" className="h-9 w-64 rounded-md border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
          </div>
          <button className="h-9 w-9 grid place-items-center rounded-md text-slate-600 hover:bg-slate-100"><Bell className="h-4 w-4"/></button>
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-sm font-semibold">
              {me?.email?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="hidden md:block text-xs">
              <div className="font-medium text-slate-900">{me?.email ?? "—"}</div>
              <div className="text-slate-500 capitalize">{me?.role?.replaceAll("_"," ") ?? ""}</div>
            </div>
            <button onClick={logout} title="Logout" className="ml-1 h-9 w-9 grid place-items-center rounded-md text-slate-500 hover:bg-slate-100">
              <LogOut className="h-4 w-4"/>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
