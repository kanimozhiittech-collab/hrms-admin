"use client";
import { cn } from "@/lib/utils";

function pageBubbleList(current: number, total: number): (number | "…")[] {
  const delta = 1;
  const range: number[] = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }
  const withDots: (number | "…")[] = [];
  let prev = 0;
  for (const i of range) {
    if (prev) {
      if (i - prev === 2) withDots.push(prev + 1);
      else if (i - prev > 2) withDots.push("…");
    }
    withDots.push(i);
    prev = i;
  }
  return withDots;
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="h-8 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      {pageBubbleList(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`dots-${i}`} className="px-1 text-xs text-slate-400">…</span>
        ) : (
          <button
            type="button"
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
              p === page ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="h-8 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
