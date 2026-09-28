"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const STATUS_TONE: Record<string, "slate" | "blue" | "green"> = {
  DRAFT: "slate", CALCULATED: "blue", FINALIZED: "green",
};

function money(v: number | null | undefined) {
  return v == null ? "—" : `₹${v.toLocaleString("en-IN")}`;
}

export default function PayrollRunPage() {
  const params = useParams<{ id: string }>();
  const runId = params.id;
  const router = useRouter();
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [step, setStep] = useState<"attendance" | "review">("attendance");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await api.getPayrollRun(runId);
      setRun(r);
      if (r.status !== "DRAFT") setStep("review");
    } catch (e: any) {
      toast.error(e.message || "Unable to load payroll run");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (runId) load(); }, [runId]);

  async function updateEntry(entryId: string, data: any) {
    setSavingId(entryId);
    try {
      await api.updatePayrollEntry(runId, entryId, data);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Unable to update entry");
    } finally {
      setSavingId(null);
    }
  }

  async function calculate() {
    setCalculating(true);
    try {
      const r = await api.calculatePayrollRun(runId);
      setRun(r);
      setStep("review");
      if (r.skipped > 0) toast.warning(`${r.skipped} employee(s) skipped — no salary configured`);
      else toast.success("Calculated");
    } catch (e: any) {
      toast.error(e.message || "Unable to calculate");
    } finally {
      setCalculating(false);
    }
  }

  async function finalize() {
    if (!confirm("Finalize this payroll run? Once finalized it can no longer be edited.")) return;
    setFinalizing(true);
    try {
      const r = await api.finalizePayrollRun(runId);
      setRun(r);
      toast.success("Payroll run finalized");
    } catch (e: any) {
      toast.error(e.message || "Unable to finalize");
    } finally {
      setFinalizing(false);
    }
  }

  if (loading || !run) {
    return (
      <>
        <Topbar title="Payroll Run" />
        <div className="p-6 text-sm text-slate-400">Loading…</div>
      </>
    );
  }

  const locked = run.status === "FINALIZED";
  const included = run.entries.filter((e: any) => e.is_included);
  const totals = included.reduce((acc: any, e: any) => ({
    gross: acc.gross + (e.gross_earnings || 0),
    deductions: acc.deductions + (e.total_deductions || 0),
    net: acc.net + (e.net_pay || 0),
  }), { gross: 0, deductions: 0, net: 0 });

  return (
    <>
      <Topbar title="Payroll Run" />
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => router.push("/payroll")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" />Back to Payroll
            </button>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">{MONTH_NAMES[run.month - 1]} {run.year}</h2>
          </div>
          <Badge tone={STATUS_TONE[run.status]}>{run.status === "DRAFT" ? "Draft" : run.status === "CALCULATED" ? "Calculated" : "Finalized"}</Badge>
        </div>

        {!locked && (
          <div className="flex gap-1 border-b border-slate-200">
            {(["attendance", "review"] as const).map(s => (
              <button
                key={s}
                onClick={() => (s === "attendance" || run.status !== "DRAFT") && setStep(s)}
                disabled={s === "review" && run.status === "DRAFT"}
                className={cn(
                  "px-4 py-2 text-sm font-medium -mb-px border-b-2 transition",
                  step === s ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800",
                  s === "review" && run.status === "DRAFT" && "opacity-40 cursor-not-allowed"
                )}
              >
                {s === "attendance" ? "1. Employees & Attendance" : "2. Calculate & Review"}
              </button>
            ))}
          </div>
        )}

        {(step === "attendance" && !locked) && (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium"></th>
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Total Working Days</th>
                    <th className="px-4 py-3 font-medium">Days Present</th>
                    <th className="px-4 py-3 font-medium">LOP Days</th>
                  </tr>
                </thead>
                <tbody>
                  {run.entries.map((e: any) => (
                    <tr key={e.id} className={cn("border-t border-slate-100", e.has_salary_error && "bg-amber-50/50")}>
                      <td className="px-4 py-2">
                        <input type="checkbox" checked={e.is_included} disabled={e.has_salary_error || savingId === e.id}
                          onChange={ev => updateEntry(e.id, { is_included: ev.target.checked })} />
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-900">{e.employee_name}</div>
                        <div className="text-xs text-slate-500">
                          {e.emp_code}{e.department ? ` · ${e.department}` : ""}
                          {e.has_salary_error && <Badge tone="amber" className="ml-2">No salary configured</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-2 tabular-nums">{e.total_working_days}</td>
                      <td className="px-4 py-2">
                        <Input type="number" min={0} max={e.total_working_days} step={0.5} className="w-24"
                          value={e.days_worked} disabled={!e.is_included || savingId === e.id}
                          onChange={ev => updateEntry(e.id, { days_worked: Number(ev.target.value) })} />
                      </td>
                      <td className="px-4 py-2 tabular-nums text-slate-600">{e.lop_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
            <div className="p-4 border-t border-slate-100 flex justify-end">
              <Button onClick={calculate} disabled={calculating}>{calculating ? "Calculating…" : "Calculate"}</Button>
            </div>
          </Card>
        )}

        {(step === "review" || locked) && (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Gross</th>
                    <th className="px-4 py-3 font-medium">EPF</th>
                    <th className="px-4 py-3 font-medium">ESI</th>
                    <th className="px-4 py-3 font-medium">PT</th>
                    <th className="px-4 py-3 font-medium">Total Deductions</th>
                    <th className="px-4 py-3 font-medium">Net Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {run.entries.filter((e: any) => e.is_included).map((e: any) => (
                    <tr key={e.id} className={cn("border-t border-slate-100", (e.net_pay ?? 0) < 0 && "bg-red-50")}>
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-900">{e.employee_name}</div>
                        <div className="text-xs text-slate-500">{e.emp_code}</div>
                      </td>
                      <td className="px-4 py-2 tabular-nums">{money(e.gross_earnings)}</td>
                      <td className="px-4 py-2 tabular-nums">{money(e.breakup?.epf_employee)}</td>
                      <td className="px-4 py-2 tabular-nums">{money(e.breakup?.esi_employee)}</td>
                      <td className="px-4 py-2 tabular-nums">{money(e.breakup?.pt_amount)}</td>
                      <td className="px-4 py-2 tabular-nums">{money(e.total_deductions)}</td>
                      <td className={cn("px-4 py-2 tabular-nums font-medium", (e.net_pay ?? 0) < 0 ? "text-red-700" : "text-slate-900")}>{money(e.net_pay)}</td>
                    </tr>
                  ))}
                  {run.entries.filter((e: any) => e.is_included).length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No employees included.</td></tr>
                  )}
                </tbody>
                {included.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 font-medium text-slate-900">
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 tabular-nums">{money(totals.gross)}</td>
                      <td colSpan={2}></td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 tabular-nums">{money(totals.deductions)}</td>
                      <td className="px-4 py-3 tabular-nums">{money(totals.net)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </CardContent>
            {!locked && (
              <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep("attendance")}>Back to Attendance</Button>
                <Button onClick={finalize} disabled={finalizing || included.length === 0}>
                  {finalizing ? "Finalizing…" : "Finalize Payroll"}
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
