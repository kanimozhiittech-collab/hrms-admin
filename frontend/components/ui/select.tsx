"use client";
import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...p }, ref) => (
    <select ref={ref}
      className={cn("h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500", className)}
      {...p}>{children}</select>
  ));
Select.displayName = "Select";
