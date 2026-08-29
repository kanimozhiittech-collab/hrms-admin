"use client";
import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** "2026-01-22" -> "22-Jan-2026". Returns "" for anything that doesn't parse. */
export function formatDateDisplay(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "";
  const [, y, mo, d] = m;
  const monthIdx = Number(mo) - 1;
  if (monthIdx < 0 || monthIdx > 11) return "";
  return `${d}-${MONTHS[monthIdx]}-${y}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

/** Text-display date field ("22-Jan-2026") backed by a small custom calendar
 * popover — the stored value stays a plain ISO "yyyy-mm-dd" string so the API
 * and Zod schema are untouched; only the presentation changes. Native
 * `<input type="date">` can't show a custom format, so this replaces it. */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  disabled,
  placeholder = "dd-mmm-yyyy",
  className,
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const parsed = parseIso(value);
  const today = new Date();
  const [viewYear, setViewYear] = useState(parsed?.y ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.m ?? today.getMonth());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const p = parseIso(value);
      setViewYear(p?.y ?? today.getFullYear());
      setViewMonth(p?.m ?? today.getMonth());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const minParsed = min ? parseIso(min) : null;
  const maxParsed = max ? parseIso(max) : null;
  const minIso = min || "";
  const maxIso = max || "";

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const yearOptions: number[] = [];
  const minYear = minParsed?.y ?? today.getFullYear() - 100;
  const maxYear = maxParsed?.y ?? today.getFullYear() + 10;
  for (let y = maxYear; y >= minYear; y--) yearOptions.push(y);

  function selectDay(day: number) {
    const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
    if (minIso && iso < minIso) return;
    if (maxIso && iso > maxIso) return;
    onChange(iso);
    setOpen(false);
  }

  function isDisabledDay(day: number) {
    const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
    return Boolean((minIso && iso < minIso) || (maxIso && iso > maxIso));
  }

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
        <span className={cn(!value && "text-slate-400")}>{value ? formatDateDisplay(value) : placeholder}</span>
        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0"/>
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-64 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          <div className="flex items-center justify-between gap-1 mb-2">
            <button type="button" onClick={() => setViewMonth((m) => (m === 0 ? (setViewYear((y) => y - 1), 11) : m - 1))} className="h-7 w-7 grid place-items-center rounded hover:bg-slate-100 text-slate-500">
              <ChevronLeft className="h-4 w-4"/>
            </button>
            <div className="flex gap-1">
              <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))} className="h-7 rounded border border-slate-200 text-xs px-1">
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))} className="h-7 rounded border border-slate-200 text-xs px-1">
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => setViewMonth((m) => (m === 11 ? (setViewYear((y) => y + 1), 0) : m + 1))} className="h-7 w-7 grid place-items-center rounded hover:bg-slate-100 text-slate-500">
              <ChevronRight className="h-4 w-4"/>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((w) => <div key={w} className="text-[10px] font-medium text-slate-400 py-1">{w}</div>)}
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`}/>;
              const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
              const isSelected = iso === value;
              const isToday = iso === `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
              const dis = isDisabledDay(day);
              return (
                <button
                  type="button"
                  key={day}
                  disabled={dis}
                  onClick={() => selectDay(day)}
                  className={cn(
                    "h-7 w-7 rounded text-xs grid place-items-center",
                    dis && "text-slate-300 cursor-not-allowed",
                    !dis && !isSelected && "hover:bg-slate-100 text-slate-700",
                    isSelected && "bg-brand-600 text-white font-medium",
                    !isSelected && isToday && "ring-1 ring-brand-400",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {value && (
            <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="mt-2 w-full text-center text-xs text-slate-400 hover:text-slate-600">
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
