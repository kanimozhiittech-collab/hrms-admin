"use client";
import { useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Plus, X, CheckCircle2, XCircle, CalendarDays, Trash2, Pencil, Search } from "lucide-react";
import { Modal, ModalField } from "@/components/ui/modal";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const HR_ROLES = ["super_admin", "company_admin", "hr_manager"];

const STATUS_TONE: Record<string, any> = {
  approved: "green", rejected: "red", pending: "amber", cancelled: "slate",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

export default function LeavesPage() {
  const now = new Date();
  const [canApprove, setCanApprove] = useState(false);
  const [isHR, setIsHR] = useState(false);
  const [tab, setTab] = useState<"my" | "approvals" | "calendar" | "holidays" | "policies">("my");

  const [balances, setBalances] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [holidays, setHolidays] = useState<any[]>([]);
  const [holidayYear, setHolidayYear] = useState(now.getFullYear());
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [policies, setPolicies] = useState<any[]>([]);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [holidaySearch, setHolidaySearch] = useState("");
  const [policySearch, setPolicySearch] = useState("");

  const [showApply, setShowApply] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  useEffect(() => { api.me().then(m => setIsHR(HR_ROLES.includes(m.role))).catch(() => {}); }, []);

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
  async function loadHolidays() { setHolidays(await api.holidays(holidayYear)); }
  async function loadPolicies() { setPolicies(await api.leaveTypes()); }

  useEffect(() => { if (tab === "my") loadMy(); }, [tab]);
  useEffect(() => { if (tab === "approvals") loadApprovals(); }, [tab]);
  useEffect(() => { if (tab === "calendar") loadCalendar(); }, [tab, calMonth, calYear]);
  useEffect(() => { if (tab === "holidays") loadHolidays(); }, [tab, holidayYear]);
  useEffect(() => { if (tab === "policies") loadPolicies(); }, [tab]);

  async function onApproved() { await Promise.all([loadApprovals()]); }
  async function approve(id: string) { await api.approveLeave(id); onApproved(); }
  async function reject(id: string) { await api.rejectLeave(id, "Rejected"); onApproved(); }
  async function cancel(id: string) { await api.cancelLeave(id); loadMy(); }
  async function removeHoliday(id: string) {
    if (!confirm("Delete this holiday?")) return;
    await api.deleteHoliday(id); await loadHolidays();
  }

  const filteredHolidays = holidays.filter(h => h.name.toLowerCase().includes(holidaySearch.toLowerCase()));
  const filteredPolicies = policies.filter(p =>
    p.name.toLowerCase().includes(policySearch.toLowerCase()) ||
    (p.code || "").toLowerCase().includes(policySearch.toLowerCase())
  );

  const tabs: { key: typeof tab; label: string }[] = [
    { key: "my", label: "My Leaves" },
    ...(canApprove ? [{ key: "approvals" as const, label: "Approvals" }] : []),
    { key: "calendar", label: "Team Calendar" },
    { key: "holidays", label: "Holidays" },
    ...(isHR ? [{ key: "policies" as const, label: "Leave Policies" }] : []),
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
          {tab === "holidays" && isHR && <Button onClick={() => setShowAddHoliday(true)}><Plus className="h-4 w-4" />Add Holiday</Button>}
          {tab === "policies" && <Button onClick={() => { setEditingPolicyId(null); setShowPolicyForm(true); }}><Plus className="h-4 w-4" />Add Policy</Button>}
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
              <div className="px-4 py-3 border-b border-slate-100 font-medium text-slate-800">My Requests</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Dates</th>
                      <th className="px-4 py-3 font-medium">Days</th>
                      <th className="px-4 py-3 font-medium">Reason</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No leave requests yet.</td></tr>}
                    {requests.map(r => (
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
            {pending.length === 0 && (
              <Card className="p-10 text-center text-slate-400 text-sm">No leave requests pending your approval.</Card>
            )}
            {pending.map(r => (
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
            <div className="flex items-center gap-2">
              <Select value={calMonth} onChange={e => setCalMonth(+e.target.value)} className="max-w-[140px]">
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </Select>
              <Select value={calYear} onChange={e => setCalYear(+e.target.value)} className="max-w-[120px]">
                {[calYear + 1, calYear, calYear - 1].map(y => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
            <Card>
              <div className="px-4 py-3 border-b border-slate-100 font-medium text-slate-800 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-brand-600" />
                Approved Leave — {MONTHS[calMonth - 1]} {calYear}
              </div>
              <div className="divide-y divide-slate-100">
                {calendar.length === 0 && <div className="px-4 py-10 text-center text-slate-400 text-sm">No approved leave this month.</div>}
                {calendar.map(c => (
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

        {/* ── HOLIDAYS ── */}
        {tab === "holidays" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={holidayYear} onChange={e => setHolidayYear(+e.target.value)} className="max-w-[120px]">
                {[holidayYear + 1, holidayYear, holidayYear - 1].map(y => <option key={y} value={y}>{y}</option>)}
              </Select>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <Input placeholder="Search holidays…" value={holidaySearch} onChange={e => setHolidaySearch(e.target.value)} className="pl-8 h-8 text-sm" />
              </div>
            </div>
          <Card>
            <div className="px-4 py-3 border-b border-slate-100 font-medium text-slate-800">Company Holidays — {holidayYear}</div>
            <div className="divide-y divide-slate-100">
              {filteredHolidays.length === 0 && <div className="px-4 py-10 text-center text-slate-400 text-sm">No holidays found for {holidayYear}.</div>}
              {filteredHolidays.map(h => (
                <div key={h.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-800">{h.name}</div>
                    <div className="text-xs text-slate-500 capitalize">{h.holiday_type}</div>
                  </div>
                  <div className="text-sm text-slate-600 tabular-nums">{fmtDate(h.holiday_date)}</div>
                  {isHR && (
                    <button onClick={() => removeHoliday(h.id)} className="text-slate-400 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
          </div>
        )}

        {/* ── LEAVE POLICIES ── */}
        {tab === "policies" && isHR && (
          <div className="space-y-3">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder="Search policies…" value={policySearch} onChange={e => setPolicySearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Policy</th>
                    <th className="px-4 py-3 font-medium">Days/Year</th>
                    <th className="px-4 py-3 font-medium">Accrual</th>
                    <th className="px-4 py-3 font-medium">Carry Forward</th>
                    <th className="px-4 py-3 font-medium">Paid</th>
                    <th className="px-4 py-3 font-medium">Half Day</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPolicies.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No leave policies found.</td></tr>}
                  {filteredPolicies.map(p => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
                          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                          {p.name} <span className="text-xs text-slate-400 font-normal">({p.code})</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-700">{p.days_per_year}</td>
                      <td className="px-4 py-3 text-slate-600 capitalize">{p.accrual_type}</td>
                      <td className="px-4 py-3 text-slate-600">{p.carry_forward ? `Up to ${p.max_carry_days ?? "∞"}` : "No"}</td>
                      <td className="px-4 py-3 text-slate-600">{p.is_paid ? "Paid" : "Unpaid"}</td>
                      <td className="px-4 py-3 text-slate-600">{p.allow_half_day ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setEditingPolicyId(p.id); setShowPolicyForm(true); }} className="text-slate-400 hover:text-slate-700">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          </div>
        )}
      </div>

      {showAddHoliday && (
        <AddHolidayModal onClose={() => setShowAddHoliday(false)} onDone={() => { setShowAddHoliday(false); loadHolidays(); }} />
      )}

      {showPolicyForm && (
        <PolicyFormModal
          policy={editingPolicyId ? policies.find(p => p.id === editingPolicyId) : null}
          onClose={() => setShowPolicyForm(false)}
          onDone={() => { setShowPolicyForm(false); loadPolicies(); }}
        />
      )}

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

  const balMap = useMemo(() => Object.fromEntries(balances.map((b: any) => [b.leave_type_id, b])), [balances]);
  const selected = balMap[form.leave_type_id];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const body: any = { ...form };
      if (!form.half_day) delete body.half_day_session;
      await api.applyLeave(body);
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
              <Input type="date" value={form.from_date} onChange={e => setForm({ ...form, from_date: e.target.value, to_date: form.half_day ? e.target.value : form.to_date })} required />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">To</label>
              <Input type="date" value={form.to_date} disabled={form.half_day} onChange={e => setForm({ ...form, to_date: e.target.value })} required />
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

function AddHolidayModal({ onClose, onDone }: any) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ name: "", holiday_date: today, holiday_type: "national" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!form.name.trim()) return;
    setErr(""); setBusy(true);
    try {
      await api.createHoliday(form);
      onDone();
    } catch (e: any) { setErr(e.message || "Failed to add holiday."); }
    finally { setBusy(false); }
  }

  return (
    <Modal
      title="Add Holiday"
      onClose={onClose}
      footer={<>
        <Button onClick={submit} disabled={busy || !form.name.trim()}>{busy ? "Saving…" : "Submit"}</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </>}
    >
      <ModalField label="Holiday Name *">
        <Input placeholder="e.g. Diwali" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
      </ModalField>
      <div className="grid grid-cols-2 gap-4">
        <ModalField label="Date">
          <Input type="date" value={form.holiday_date} onChange={e => setForm(f => ({ ...f, holiday_date: e.target.value }))} />
        </ModalField>
        <ModalField label="Type">
          <Select value={form.holiday_type} onChange={e => setForm(f => ({ ...f, holiday_type: e.target.value }))}>
            <option value="national">National</option>
            <option value="optional">Optional</option>
            <option value="restricted">Restricted</option>
          </Select>
        </ModalField>
      </div>
      {err && <div className="text-sm rounded-md px-3 py-2 bg-red-50 text-red-700">{err}</div>}
    </Modal>
  );
}

function PolicyFormModal({ policy, onClose, onDone }: any) {
  const [form, setForm] = useState({
    name: policy?.name || "",
    code: policy?.code || "",
    days_per_year: policy?.days_per_year ?? 0,
    accrual_type: policy?.accrual_type || "upfront",
    carry_forward: policy?.carry_forward ?? false,
    max_carry_days: policy?.max_carry_days ?? "",
    encashable: policy?.encashable ?? false,
    requires_approval: policy?.requires_approval ?? true,
    allow_half_day: policy?.allow_half_day ?? true,
    is_paid: policy?.is_paid ?? true,
    min_notice_days: policy?.min_notice_days ?? 0,
    color: policy?.color || "#2563eb",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!form.name.trim() || !form.code.trim()) return;
    setErr(""); setBusy(true);
    const payload = {
      ...form,
      days_per_year: Number(form.days_per_year) || 0,
      min_notice_days: Number(form.min_notice_days) || 0,
      max_carry_days: form.max_carry_days === "" ? null : Number(form.max_carry_days),
    };
    try {
      if (policy) await api.updateLeaveType(policy.id, payload);
      else await api.createLeaveType(payload);
      onDone();
    } catch (e: any) { setErr(e.message || "Failed to save policy."); }
    finally { setBusy(false); }
  }

  return (
    <Modal
      title={policy ? "Edit Leave Policy" : "Add Leave Policy"}
      onClose={onClose}
      footer={<>
        <Button onClick={submit} disabled={busy || !form.name.trim() || !form.code.trim()}>{busy ? "Saving…" : "Submit"}</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </>}
    >
      <div className="grid grid-cols-2 gap-4">
        <ModalField label="Policy Name *">
          <Input placeholder="e.g. Casual Leave" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
        </ModalField>
        <ModalField label="Code *">
          <Input placeholder="e.g. CL" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
        </ModalField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ModalField label="Days per Year">
          <Input type="number" min={0} value={form.days_per_year} onChange={e => setForm(f => ({ ...f, days_per_year: e.target.value }))} />
        </ModalField>
        <ModalField label="Accrual Type">
          <Select value={form.accrual_type} onChange={e => setForm(f => ({ ...f, accrual_type: e.target.value }))}>
            <option value="upfront">Upfront</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </Select>
        </ModalField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ModalField label="Min Notice (days)">
          <Input type="number" min={0} value={form.min_notice_days} onChange={e => setForm(f => ({ ...f, min_notice_days: e.target.value }))} />
        </ModalField>
        <ModalField label="Color">
          <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
            className="h-9 w-16 rounded-md border border-slate-200 p-1" />
        </ModalField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.carry_forward} onChange={e => setForm(f => ({ ...f, carry_forward: e.target.checked }))} />
          Carry forward
        </label>
        {form.carry_forward && (
          <ModalField label="Max Carry Days">
            <Input type="number" min={0} placeholder="Unlimited" value={form.max_carry_days} onChange={e => setForm(f => ({ ...f, max_carry_days: e.target.value }))} />
          </ModalField>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.encashable} onChange={e => setForm(f => ({ ...f, encashable: e.target.checked }))} />
          Encashable
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.requires_approval} onChange={e => setForm(f => ({ ...f, requires_approval: e.target.checked }))} />
          Requires approval
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.allow_half_day} onChange={e => setForm(f => ({ ...f, allow_half_day: e.target.checked }))} />
          Allow half day
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.is_paid} onChange={e => setForm(f => ({ ...f, is_paid: e.target.checked }))} />
          Paid leave
        </label>
      </div>
      {err && <div className="text-sm rounded-md px-3 py-2 bg-red-50 text-red-700">{err}</div>}
    </Modal>
  );
}
