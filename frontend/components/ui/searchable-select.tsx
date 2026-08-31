"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboOption = { value: string; label: string };

/** A single-select combobox: click to open, type to filter, click an option
 * to choose it. Optionally lets the user add a brand-new option inline
 * (via onAdd) when nothing in the list matches what they typed. */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  allowAdd = false,
  onAdd,
  disabled,
  className,
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder?: string;
  allowAdd?: boolean;
  /** Called when the user adds a new option. Return the new option's real
   * value (e.g. a database id) to select that instead of the typed label —
   * needed whenever `value` isn't just the label itself (real master-data
   * records vs. free-text classifications kept in localStorage). */
  onAdd?: (label: string) => void | string | Promise<void | string>;
  disabled?: boolean;
  className?: string;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    if (open) document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  const exactMatch = options.some((o) => o.label.toLowerCase() === q);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        name={name}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-brand-500",
          disabled && "bg-slate-50 text-slate-400 cursor-not-allowed",
        )}
      >
        <span className={cn("truncate", !selected && "text-slate-400")}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0"/>
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="relative border-b border-slate-100 p-1.5">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"/>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-8 w-full rounded border border-slate-200 pl-7 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && !allowAdd && (
              <p className="px-3 py-2 text-sm text-slate-400">No options found</p>
            )}
            {filtered.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
                className={cn(
                  "block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50",
                  o.value === value ? "font-medium text-brand-700" : "text-slate-700",
                )}
              >
                {o.label}
              </button>
            ))}
            {allowAdd && q && !exactMatch && (
              <button
                type="button"
                disabled={adding}
                onClick={async () => {
                  const label = query.trim();
                  setAdding(true);
                  try {
                    const result = await onAdd?.(label);
                    onChange(typeof result === "string" ? result : label);
                    setOpen(false);
                    setQuery("");
                  } finally {
                    setAdding(false);
                  }
                }}
                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-sm text-brand-700 hover:bg-brand-50 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5"/> {adding ? "Adding…" : `Add "${query.trim()}"`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
