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
import { Download, Clock, CalendarClock, CheckCircle2, XCircle, Search } from "lucide-react";
import { toast } from "sonner";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const HR_ROLES = ["super_admin", "company_admin", "hr_manager"];

const STATUS_TONE: Record<string, any> = {
  Present: "green", Absent: "red", Half_Day: "amber", On_Leave: "blue", Holiday: "slate", Weekend: "slate",
};
const STATUS_LABEL: Record<string, string> = {
  Present: "Present", Absent: "Absent", Half_Day: "Half Day", On_Leave: "On Leave", Holiday: "Holiday", Weekend: "Weekend",
};

function fmtTime(dt?: string) {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AttendancePage() {
  const now = new Date();
  const [tab, setTab] = useState<"my" | "team" | "regularize">("my");
  const [role, setRole] = useState("");
  const isHR = HR_ROLES.includes(role);

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [summary, setSummary] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [teamDate, setTeamDate] = useState(now.toISOString().slice(0, 10));
  const [teamSearch, setTeamSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [regs, setRegs] = useState<any[]>([]);
  const [teamRegs, setTeamRegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);

  // regularization form
  const [regForm, setRegForm] = useState({ work_date: now.toISOString().slice(0, 10), check_in: "", check_out: "", reason: "" });
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  useEffect(() => { api.me().then(m => setRole(m.role)).catch(() => {}); }, []);

  async function loadMy() {
    setLoading(true);
    try { setSummary(await api.myAttendanceSummary(month, year)); }
    finally { setLoading(false); }
  }
  async function loadTeam() {
    setLoading(true);
    try { setTeam(await api.teamAttendance({ on_date: teamDate })); }
    finally { setLoading(false); }
  }
  async function loadRegs() {
    setRegs(await api.listRegularizations("my"));
  }
  async function loadTeamRegs() {
    setTeamRegs(await api.listRegularizations("team"));
  }

  useEffect(() => { if (tab === "my") loadMy(); }, [tab, month, year]);
  useEffect(() => { if (tab === "team") loadTeam(); }, [tab, teamDate]);
  useEffect(() => { if (tab === "regularize") loadRegs(); }, [tab]);
  useEffect(() => { if (tab === "regularize" && isHR) loadTeamRegs(); }, [tab, isHR]);

  async function submitReg(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const body: any = { work_date: regForm.work_date, reason: regForm.reason };
      if (regForm.check_in) body.requested_check_in = `${regForm.work_date}T${regForm.check_in}:00`;
      if (regForm.check_out) body.requested_check_out = `${regForm.work_date}T${regForm.check_out}:00`;
      await api.createRegularization(body);
      setMsg({ tone: "ok", text: "Regularization request submitted." });
      setRegForm({ ...regForm, reason: "", check_in: "", check_out: "" });
      loadRegs();
    } catch (err: any) {
      setMsg({ tone: "err", text: err.message || "Failed to submit." });
    }
  }

  async function reviewReg(id: string, action: "approve" | "reject") {
    setReviewBusyId(id);
    try {
      if (action === "approve") await api.approveRegularization(id);
      else await api.rejectRegularization(id);
      await loadTeamRegs();
    } catch (err: any) {
      setMsg({ tone: "err", text: err.message || "Failed to update request." });
    } finally {
      setReviewBusyId(null);
    }
  }

  const tabs: { key: typeof tab; label: string }[] = [
    { key: "my", label: "My Attendance" },
    ...(isHR ? [{ key: "team" as const, label: "Team Attendance" }] : []),
    { key: "regularize", label: "Regularization" },
  ];

  const myLogs = (summary?.logs || []).filter((l: any) => !statusFilter || l.status === statusFilter);
  const teamFiltered = team.filter((l: any) =>
    (!statusFilter || l.status === statusFilter) &&
    (l.employee_name || "").toLowerCase().includes(teamSearch.toLowerCase())
  );

  return (
    <>
      <Topbar title="Attendance" />
      <div className="p-4 lg:p-6 space-y-4">
        {/* tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition ${
                tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── MY ATTENDANCE ── */}
        {tab === "my" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={month} onChange={e => setMonth(+e.target.value)} className="max-w-[140px]">
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </Select>
              <Select value={year} onChange={e => setYear(+e.target.value)} className="max-w-[120px]">
                {[year + 1, year, year - 1, year - 2].map(y => <option key={y} value={y}>{y}</option>)}
              </Select>
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="max-w-[160px]">
                <option value="">All Status</option>
                {Object.keys(STATUS_LABEL).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </Select>
            </div>

            {/* stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: "Present", value: summary?.present ?? 0, tone: "text-emerald-600" },
                { label: "Absent", value: summary?.absent ?? 0, tone: "text-red-600" },
                { label: "On Leave", value: summary?.on_leave ?? 0, tone: "text-blue-600" },
                { label: "Late", value: summary?.late_count ?? 0, tone: "text-amber-600" },
                { label: "Work Hrs", value: summary?.total_work_hours ?? 0, tone: "text-slate-800" },
                { label: "Overtime", value: summary?.total_overtime ?? 0, tone: "text-violet-600" },
              ].map(s => (
                <Card key={s.label} className="p-4">
                  <div className={`text-2xl font-bold tabular-nums ${s.tone}`}>{s.value}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </Card>
              ))}
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Check In</th>
                      <th className="px-4 py-3 font-medium">Check Out</th>
                      <th className="px-4 py-3 font-medium">Hours</th>
                      <th className="px-4 py-3 font-medium">Late</th>
                      <th className="px-4 py-3 font-medium">OT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>}
                    {!loading && myLogs.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No attendance records match.</td></tr>
                    )}
                    {myLogs.map((l: any) => (
                      <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-4 py-3 text-slate-700">{new Date(l.work_date).toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" })}</td>
                        <td className="px-4 py-3">
                          <Badge tone={STATUS_TONE[l.status] || "slate"}>{STATUS_LABEL[l.status] || l.status}</Badge>
                          {l.is_regularized && <span className="ml-1 text-[10px] text-slate-400">(reg.)</span>}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">{fmtTime(l.check_in_at)}</td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">{fmtTime(l.check_out_at)}</td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">{l.work_hours != null ? `${l.work_hours}h` : "—"}</td>
                        <td className="px-4 py-3 tabular-nums">{l.late_minutes ? <span className="text-amber-600">{l.late_minutes}m</span> : "—"}</td>
                        <td className="px-4 py-3 tabular-nums">{l.overtime_hours ? <span className="text-violet-600">{l.overtime_hours}h</span> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ── TEAM ATTENDANCE ── */}
        {tab === "team" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Input type="date" value={teamDate} onChange={e => setTeamDate(e.target.value)} className="max-w-[180px]" />
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search employee…" value={teamSearch} onChange={e => setTeamSearch(e.target.value)} className="pl-8 max-w-[200px]" />
                </div>
                <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="max-w-[160px]">
                  <option value="">All Status</option>
                  {Object.keys(STATUS_LABEL).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={() => api.downloadAttendanceReport(month, year).catch((e: any) => toast.error(e.message))}
              >
                <Download className="h-4 w-4" />Export Month CSV
              </Button>
            </div>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium">Employee</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Check In</th>
                      <th className="px-4 py-3 font-medium">Check Out</th>
                      <th className="px-4 py-3 font-medium">Hours</th>
                      <th className="px-4 py-3 font-medium">Late</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>}
                    {!loading && teamFiltered.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No attendance logged for this date.</td></tr>
                    )}
                    {teamFiltered.map((l: any) => (
                      <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-medium text-slate-800">{l.employee_name || "—"}</td>
                        <td className="px-4 py-3"><Badge tone={STATUS_TONE[l.status] || "slate"}>{STATUS_LABEL[l.status] || l.status}</Badge></td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">{fmtTime(l.check_in_at)}</td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">{fmtTime(l.check_out_at)}</td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">{l.work_hours != null ? `${l.work_hours}h` : "—"}</td>
                        <td className="px-4 py-3 tabular-nums">{l.late_minutes ? <span className="text-amber-600">{l.late_minutes}m</span> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ── REGULARIZATION ── */}
        {tab === "regularize" && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <CalendarClock className="h-5 w-5 text-brand-600" />
                <h3 className="font-semibold text-slate-900">Request Regularization</h3>
              </div>
              <form onSubmit={submitReg} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Date</label>
                  <Input type="date" value={regForm.work_date} onChange={e => setRegForm({ ...regForm, work_date: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Check In</label>
                    <Input type="time" value={regForm.check_in} onChange={e => setRegForm({ ...regForm, check_in: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Check Out</label>
                    <Input type="time" value={regForm.check_out} onChange={e => setRegForm({ ...regForm, check_out: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Reason</label>
                  <Textarea rows={3} value={regForm.reason} onChange={e => setRegForm({ ...regForm, reason: e.target.value })} placeholder="Why was the punch missed?" required />
                </div>
                {msg && (
                  <div className={`text-sm rounded-md px-3 py-2 ${msg.tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>
                )}
                <Button type="submit">Submit Request</Button>
              </form>
            </Card>

            <Card>
              <div className="px-4 py-3 border-b border-slate-100 font-medium text-slate-800">My Requests</div>
              <div className="divide-y divide-slate-100">
                {regs.length === 0 && <div className="px-4 py-10 text-center text-slate-400 text-sm">No regularization requests yet.</div>}
                {regs.map((r: any) => (
                  <div key={r.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{new Date(r.work_date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{r.reason}</div>
                    </div>
                    <Badge tone={r.status === "approved" ? "green" : r.status === "rejected" ? "red" : "amber"}>
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {isHR && (
              <Card className="md:col-span-2">
                <div className="px-4 py-3 border-b border-slate-100 font-medium text-slate-800 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-brand-600" />
                  Team Regularization Requests
                  {teamRegs.filter((r: any) => r.status === "pending").length > 0 && (
                    <span className="rounded-full bg-amber-100 text-amber-700 px-1.5 text-[10px]">
                      {teamRegs.filter((r: any) => r.status === "pending").length} pending
                    </span>
                  )}
                </div>
                <div className="divide-y divide-slate-100">
                  {teamRegs.length === 0 && (
                    <div className="px-4 py-10 text-center text-slate-400 text-sm">No regularization requests from your team.</div>
                  )}
                  {teamRegs.map((r: any) => (
                    <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-sm font-medium text-slate-800">
                          {r.employee_name || "—"} · {new Date(r.work_date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {fmtTime(r.requested_check_in)} – {fmtTime(r.requested_check_out)} · {r.reason}
                        </div>
                      </div>
                      {r.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button size="sm" disabled={reviewBusyId === r.id} onClick={() => reviewReg(r.id, "approve")}>
                            <CheckCircle2 className="h-4 w-4" />Approve
                          </Button>
                          <Button size="sm" variant="outline" disabled={reviewBusyId === r.id} onClick={() => reviewReg(r.id, "reject")}
                            className="text-red-600 border-red-200 hover:bg-red-50">
                            <XCircle className="h-4 w-4" />Reject
                          </Button>
                        </div>
                      ) : (
                        <Badge tone={r.status === "approved" ? "green" : "red"}>{r.status}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
}
