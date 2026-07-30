"use client";
import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => (
    <input ref={ref}
      className={cn("h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500", className)}
      {...p}/>
  ));
Input.displayName = "Input";
