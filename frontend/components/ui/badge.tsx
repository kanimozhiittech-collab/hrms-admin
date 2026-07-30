import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
type Tone = "green" | "red" | "amber" | "blue" | "slate";
const tones: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};
export function Badge({ tone = "slate", className, ...p }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", tones[tone], className)} {...p}/>;
}
