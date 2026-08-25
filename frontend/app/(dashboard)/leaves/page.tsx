"use client";
import { useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api, fileUrl } from "@/lib/api";
import { Plus, X, CheckCircle2, XCircle, CalendarDays, Search, Upload } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const STATUS_TONE: Record<string, any> = {
  approved: "green", rejected: "red", pending: "amber", cancelled: "slate",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

export default function LeavesPage() {
  const now = new Date();
  const [canApprove, setCanApprove] = useState(false);
  const [tab, setTab] = useState<"my" | "approvals" | "calendar">("my");

  const [balances, setBalances] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calYear, setCalYear] = useState(now.getFullYear());

  const [showApply, setShowApply] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [approvalSearch, setApprovalSearch] = useState("");
  const [calendarSearch, setCalendarSearch] = useState("");

  // Show the Approvals tab for HR/Admin, and for any manager who has at least
  // one direct report — the backend scopes /requests/team accordingly.
  useEffect(() => {
    api.teamLeaveRequests("pending")
      .then(r => { setPending(r); setCanApprove(true); })
      .catch(() => setCanApprove(false));
  }, []);

  async function loadMy() {
    const [b, t, r] = await Promise.all([api.leaveBalance(), api.leaveTypes(), api.myLeaveRequests()]);
    setBalances(b); setTypes(t); setRequests(r);
  }
  async function loadApprovals() { setPending(await api.teamLeaveRequests("pending")); }
  async function loadCalendar() { setCalendar(await api.leaveCalendar(calMonth, calYear)); }

  useEffect(() => { if (tab === "my") loadMy(); }, [tab]);
  useEffect(() => { if (tab === "approvals") loadApprovals(); }, [tab]);
  useEffect(() => { if (tab === "calendar") loadCalendar(); }, [tab, calMonth, calYear]);

  async function onApproved() { await Promise.all([loadApprovals()]); }
  async function approve(id: string) { await api.approveLeave(id); onApproved(); }
  async function reject(id: string) { await api.rejectLeave(id, "Rejected"); onApproved(); }
  async function cancel(id: string) { await api.cancelLeave(id); loadMy(); }

  const filteredRequests = requests.filter(r => !statusFilter || r.status === statusFilter);
  const filteredPending = pending.filter(r => (r.employee_name || "").toLowerCase().includes(approvalSearch.toLowerCase()));
  const filteredCalendar = calendar.filter(c => (c.employee_name || "").toLowerCase().includes(calendarSearch.toLowerCase()));

  const tabs: { key: typeof tab; label: string }[] = [
    { key: "my", label: "My Leaves" },
    ...(canApprove ? [{ key: "approvals" as const, label: "Approvals" }] : []),
    { key: "calendar", label: "Team Calendar" },
  ];

  return (
    <>
      <Topbar title="Leaves" />
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 border-b border-slate-200 flex-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition ${
                  tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}>
                {t.label}
                {t.key === "approvals" && pending.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-100 text-amber-700 px-1.5 text-[10px]">{pending.length}</span>
                )}
              </button>
            ))}
          </div>
          {tab === "my" && <Button onClick={() => setShowApply(true)}><Plus className="h-4 w-4" />Apply Leave</Button>}
        </div>

        {/* ── MY LEAVES ── */}
        {tab === "my" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {balances.map(b => (
                <Card key={b.id} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
                    <span className="text-xs font-medium text-slate-600">{b.leave_type_name}</span>
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-slate-900">{b.available}</div>
                  <div className="text-[11px] text-slate-400">
                    {b.used} used · {b.allocated + b.carried_forward} total
                  </div>
                </Card>
              ))}
              {balances.length === 0 && <div className="col-span-full text-sm text-slate-400 py-6 text-center">No leave balances found.</div>}
            </div>

            <Card>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <span className="font-medium text-slate-800">My Requests</span>
                <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="max-w-[160px]">
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Dates</th>
                      <th className="px-4 py-3 font-medium">Days</th>
                      <th className="px-4 py-3 font-medium">Reason</th>
                      <th className="px-4 py-3 font-medium">Doc</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No leave requests match.</td></tr>}
                    {filteredRequests.map(r => (
                      <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: r.color || "#94a3b8" }} />
                            {r.leave_type_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {fmtDate(r.from_date)}{r.from_date !== r.to_date ? ` – ${fmtDate(r.to_date)}` : ""}
                          {r.half_day && <span className="text-[10px] text-slate-400 ml-1">(½)</span>}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">{r.days_count}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{r.reason}</td>
                        <td className="px-4 py-3">
                          {r.file_url ? (
                            <a href={fileUrl(r.file_url)} target="_blank" rel="noreferrer" className="text-xs text-brand-700 hover:underline">View</a>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3"><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
                        <td className="px-4 py-3">
                          {(r.status === "pending" || r.status === "approved") && (
                            <button onClick={() => cancel(r.id)} className="text-xs text-red-600 hover:underline">Cancel</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ── APPROVALS ── */}
        {tab === "approvals" && (
          <div className="space-y-3">
            {pending.length > 0 && (
              <div className="relative max-w-xs">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Search employee…" value={approvalSearch} onChange={e => setApprovalSearch(e.target.value)} className="pl-8" />
              </div>
            )}
            {pending.length === 0 && (
              <Card className="p-10 text-center text-slate-400 text-sm">No leave requests pending your approval.</Card>
            )}
            {pending.length > 0 && filteredPending.length === 0 && (
              <Card className="p-10 text-center text-slate-400 text-sm">No requests match your search.</Card>
            )}
            {filteredPending.map(r => (
              <Card key={r.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-semibold">
                    {(r.employee_name || "E").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{r.employee_name}</div>
                    <div className="text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                        {r.leave_type_name}
                      </span>
                      {" · "}{fmtDate(r.from_date)}{r.from_date !== r.to_date ? ` – ${fmtDate(r.to_date)}` : ""}
                      {" · "}{r.days_count} day(s)
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{r.reason}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approve(r.id)}><CheckCircle2 className="h-4 w-4" />Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => reject(r.id)} className="text-red-600 border-red-200 hover:bg-red-50"><XCircle className="h-4 w-4" />Reject</Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── CALENDAR ── */}
        {tab === "calendar" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={calMonth} onChange={e => setCalMonth(+e.target.value)} className="max-w-[140px]">
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </Select>
              <Select value={calYear} onChange={e => setCalYear(+e.target.value)} className="max-w-[120px]">
                {[calYear + 1, calYear, calYear - 1].map(y => <option key={y} value={y}>{y}</option>)}
              </Select>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Search employee…" value={calendarSearch} onChange={e => setCalendarSearch(e.target.value)} className="pl-8 max-w-[200px]" />
              </div>
            </div>
            <Card>
              <div className="px-4 py-3 border-b border-slate-100 font-medium text-slate-800 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-brand-600" />
                Approved Leave — {MONTHS[calMonth - 1]} {calYear}
              </div>
              <div className="divide-y divide-slate-100">
                {filteredCalendar.length === 0 && <div className="px-4 py-10 text-center text-slate-400 text-sm">No approved leave match.</div>}
                {filteredCalendar.map(c => (
                  <div key={c.id} className="px-4 py-3 flex items-center gap-3" style={{ borderLeft: `3px solid ${c.color}` }}>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-800">{c.employee_name}</div>
                      <div className="text-xs text-slate-500">{c.leave_type_name}</div>
                    </div>
                    <div className="text-sm text-slate-600 tabular-nums">
                      {fmtDate(c.from_date)}{c.from_date !== c.to_date ? ` – ${fmtDate(c.to_date)}` : ""}
                      {c.half_day && <span className="text-[10px] text-slate-400 ml-1">(½)</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {showApply && (
        <ApplyLeaveModal
          types={types}
          balances={balances}
          onClose={() => setShowApply(false)}
          onDone={() => { setShowApply(false); loadMy(); }}
        />
      )}
    </>
  );
}

function ApplyLeaveModal({ types, balances, onClose, onDone }: any) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    leave_type_id: types[0]?.id || "",
    from_date: today,
    to_date: today,
    half_day: false,
    half_day_session: "first_half",
    reason: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);

  const balMap = useMemo(() => Object.fromEntries(balances.map((b: any) => [b.leave_type_id, b])), [balances]);
  const selected = balMap[form.leave_type_id];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const body: any = { ...form };
      if (!form.half_day) delete body.half_day_session;
      const res = await api.applyLeave(body);
      if (docFile) await api.uploadLeaveDocument(res.id, docFile);
      onDone();
    } catch (e: any) {
      setErr(e.message || "Failed to apply.");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 grid place-items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e: any) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Apply for Leave</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600">Leave Type</label>
            <Select value={form.leave_type_id} onChange={e => setForm({ ...form, leave_type_id: e.target.value })} required>
              {types.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name}{balMap[t.id] ? ` (${balMap[t.id].available} left)` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">From</label>
              <Input type="date" min={today} value={form.from_date} onChange={e => setForm({ ...form, from_date: e.target.value, to_date: form.half_day ? e.target.value : form.to_date })} required />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">To</label>
              <Input type="date" min={form.from_date || today} value={form.to_date} disabled={form.half_day} onChange={e => setForm({ ...form, to_date: e.target.value })} required />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input id="half" type="checkbox" checked={form.half_day}
              onChange={e => setForm({ ...form, half_day: e.target.checked, to_date: e.target.checked ? form.from_date : form.to_date })} />
            <label htmlFor="half" className="text-sm text-slate-700">Half day</label>
            {form.half_day && (
              <Select value={form.half_day_session} onChange={e => setForm({ ...form, half_day_session: e.target.value })} className="max-w-[160px] ml-auto">
                <option value="first_half">First Half</option>
                <option value="second_half">Second Half</option>
              </Select>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Reason</label>
            <Textarea rows={3} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required placeholder="Reason for leave" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Supporting Document (optional)</label>
            <div>
              <input
                id="leave-doc-file"
                type="file"
                className="sr-only"
                onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              />
              <label htmlFor="leave-doc-file" className="inline-flex items-center gap-1.5 mt-1 text-sm text-brand-700 cursor-pointer hover:underline">
                <Upload className="h-3.5 w-3.5" />{docFile ? docFile.name : "Attach medical certificate or other proof"}
              </label>
            </div>
          </div>
          {selected && (
            <div className="text-xs text-slate-500 bg-slate-50 rounded-md px-3 py-2">
              Available balance: <strong>{selected.available}</strong> day(s) · Weekends & holidays are excluded from the count.
            </div>
          )}
          {err && <div className="text-sm rounded-md px-3 py-2 bg-red-50 text-red-700">{err}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Applying…" : "Apply Leave"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
