"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Plus } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalField } from "@/components/ui/modal";
import { api } from "@/lib/api";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_TONE: Record<string, "slate" | "blue" | "green"> = {
  DRAFT: "slate", CALCULATED: "blue", FINALIZED: "green",
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", CALCULATED: "Calculated", FINALIZED: "Finalized",
};

function NewRunModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true); setError("");
    try {
      const run = await api.createPayrollRun(month, year);
      onCreated(run.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Start New Payroll Run"
      onClose={onClose}
      footer={<>
        <Button onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create Run"}</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </>}
    >
      {error && <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <ModalField label="Month">
          <Select value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </Select>
        </ModalField>
        <ModalField label="Year">
          <Select value={year} onChange={e => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
        </ModalField>
      </div>
    </Modal>
  );
}

export default function PayrollDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNewRun, setShowNewRun] = useState(false);

  async function load() {
    setLoading(true);
    try { setData(await api.payrollDashboard()); }
    catch (e: any) { toast.error(e.message || "Unable to load payroll dashboard"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <>
      <Topbar title="Payroll" />
      <div className="p-4 lg:p-6 space-y-4">
        {loading || !data ? (
          <div className="py-10 text-center text-sm text-slate-400">Loading…</div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="p-5 flex items-center gap-3">
                  {data.settings_configured ? <CheckCircle2 className="h-8 w-8 text-emerald-500" /> : <XCircle className="h-8 w-8 text-amber-500" />}
                  <div>
                    <p className="text-sm font-medium text-slate-900">Master Setup</p>
                    <p className="text-xs text-slate-500">
                      {data.settings_configured ? "Configured" : (
                        <a href="/settings?service=payroll" className="text-brand-600 hover:underline">Set up now</a>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm font-medium text-slate-900">Employees with Salary Set Up</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{data.employees_with_salary} <span className="text-sm font-normal text-slate-400">/ {data.total_employees}</span></p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm font-medium text-slate-900">ESI Applicable</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{data.esi_applicable_count}</p>
                  <Badge tone="green" className="mt-1">Gross ≤ ₹21,000</Badge>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Payroll Runs</CardTitle>
                <Button size="sm" onClick={() => setShowNewRun(true)}><Plus className="h-4 w-4" />Start New Payroll Run</Button>
              </CardHeader>
              <CardContent className="p-0">
                {data.runs.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-400">No payroll runs yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.runs.map((r: any) => (
                      <button
                        key={r.id}
                        onClick={() => router.push(`/payroll/run/${r.id}`)}
                        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{MONTH_NAMES[r.month - 1]} {r.year}</p>
                          <p className="text-xs text-slate-500">{r.employee_count} employee{r.employee_count === 1 ? "" : "s"}</p>
                        </div>
                        <p className="text-sm tabular-nums text-slate-700">₹{r.total_net_pay.toLocaleString("en-IN")}</p>
                        <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {showNewRun && (
        <NewRunModal onClose={() => setShowNewRun(false)} onCreated={(id) => router.push(`/payroll/run/${id}`)} />
      )}
    </>
  );
}
