import { cn } from "@/lib/utils";
import { LabelHTMLAttributes } from "react";
export function Label({ className, ...p }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-xs font-medium text-slate-700", className)} {...p} />;
}
