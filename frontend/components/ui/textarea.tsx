"use client";
import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => (
    <textarea ref={ref}
      className={cn("min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500", className)}
      {...p}/>
  ));
Textarea.displayName = "Textarea";
