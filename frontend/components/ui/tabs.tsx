"use client";
import { cn } from "@/lib/utils";
import { createContext, useContext, useState, ReactNode } from "react";

const Ctx = createContext<{ value: string; setValue: (v: string) => void } | null>(null);

export function Tabs({ defaultValue, value: controlled, onValueChange, children, className }:
  { defaultValue: string; value?: string; onValueChange?: (v: string) => void; children: ReactNode; className?: string }) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;
  const setValue = (v: string) => { setInternal(v); onValueChange?.(v); };
  return <Ctx.Provider value={{ value, setValue }}><div className={className}>{children}</div></Ctx.Provider>;
}
export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex gap-1 border-b border-slate-200 overflow-x-auto", className)}>{children}</div>;
}
export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(Ctx)!;
  const active = ctx.value === value;
  return (
    <button type="button" onClick={() => ctx.setValue(value)}
      className={cn("px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap",
        active ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-900")}>
      {children}
    </button>
  );
}
export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const ctx = useContext(Ctx)!;
  if (ctx.value !== value) return null;
  return <div className={cn("pt-6", className)}>{children}</div>;
}
