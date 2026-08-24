"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Plus, Search, Download, LayoutList, LayoutGrid } from "lucide-react";

const STATUS_TONE: Record<string, any> = { Active: "green", "On Leave": "amber", Inactive: "slate", Resigned: "red" };
const KANBAN_COLUMNS = ["Active", "On Leave", "Inactive", "Resigned", "Terminated"];
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const HR_ROLES = ["super_admin", "company_admin", "hr_manager"];

function EmployeeAvatar({ e, size = "h-9 w-9 text-sm" }: { e: any; size?: string }) {
  return e.photo_url ? (
    <img src={`${API_URL}${e.photo_url}`} alt={`${e.first_name} ${e.last_name}`} className={`${size} rounded-full object-cover shrink-0`}/>
  ) : (
    <div className={`${size} rounded-full bg-brand-100 text-brand-700 grid place-items-center font-semibold shrink-0`}>
      {e.first_name[0]}{e.last_name[0]}
    </div>
  );
}

export default function EmployeesPage() {
  const router = useRouter();
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [depts, setDepts] = useState<any[]>([]);
  const [q, setQ] = useState(""); const [dept, setDept] = useState(""); const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [kanbanItems, setKanbanItems] = useState<any[]>([]);
  const [kanbanLoading, setKanbanLoading] = useState(false);

  useEffect(() => {
    api.me().then(m => {
      if (!HR_ROLES.includes(m.role)) { setAllowed(false); router.replace("/dashboard"); }
      else setAllowed(true);
    }).catch(() => setAllowed(false));
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.listEmployees({ q, department_id: dept, status, page, page_size: pageSize });
      setData(res);
    } finally { setLoading(false); }
  }

  /** Kanban groups by status, so it needs every matching employee, not one
   * page — loop through the paginated API until we've collected them all. */
  async function loadKanban() {
    setKanbanLoading(true);
    try {
      const all: any[] = [];
      let p = 1;
      while (true) {
        const res = await api.listEmployees({ q, department_id: dept, status, page: p, page_size: 100 });
        all.push(...res.items);
        if (all.length >= res.total || res.items.length === 0) break;
        p += 1;
      }
      setKanbanItems(all);
    } finally { setKanbanLoading(false); }
  }

  useEffect(() => { if (allowed) api.departments().then(setDepts).catch(() => {}); }, [allowed]);
  useEffect(() => { if (allowed && view === "list") load(); }, [allowed, view, q, dept, status, page]);
  useEffect(() => { if (allowed && view === "kanban") loadKanban(); }, [allowed, view, q, dept, status]);

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  if (allowed !== true) {
    return (
      <>
        <Topbar title="Employees" />
        <div className="p-6 text-sm text-slate-500">
          {allowed === false ? "Redirecting…" : "Loading…"}
        </div>
      </>
    );
  }

  function exportCsv() {
    const headers = ["Emp ID","Name","Email","Mobile","Department","Designation","Type","Status"];
    const rows = data.items.map((r: any) => [r.emp_code,`${r.first_name} ${r.last_name}`,r.work_email,r.mobile||"",r.department||"",r.designation||"",r.employee_type,r.status]);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replaceAll('"','""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "employees.csv"; a.click();
  }

  return (
    <>
      <Topbar title="Employees"/>
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">All Employees</h2>
            <p className="text-sm text-slate-500">{data.total} people in your organization</p>
          </div>
          <div className="flex gap-2">
            <div className="flex rounded-md border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`h-9 px-3 grid place-items-center ${view === "list" ? "bg-brand-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                title="List view"
                aria-label="List view"
              >
                <LayoutList className="h-4 w-4"/>
              </button>
              <button
                type="button"
                onClick={() => setView("kanban")}
                className={`h-9 px-3 grid place-items-center border-l border-slate-200 ${view === "kanban" ? "bg-brand-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                title="Kanban view"
                aria-label="Kanban view"
              >
                <LayoutGrid className="h-4 w-4"/>
              </button>
            </div>
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4"/>Export CSV</Button>
            <Link href="/employees/new"><Button><Plus className="h-4 w-4"/>Add Employee</Button></Link>
          </div>
        </div>

        {view === "kanban" ? (
          <Card>
            <div className="p-4 flex flex-wrap gap-3 border-b border-slate-100">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400"/>
                <Input placeholder="Search by name, email, ID…" value={q} onChange={e=>setQ(e.target.value)} className="pl-8"/>
              </div>
              <Select value={dept} onChange={e=>setDept(e.target.value)} className="max-w-[200px]">
                <option value="">All Departments</option>
                {depts.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
              <Select value={status} onChange={e=>setStatus(e.target.value)} className="max-w-[160px]">
                <option value="">All Status</option>
                <option>Active</option><option>On Leave</option><option>Inactive</option><option>Resigned</option>
              </Select>
            </div>

            {kanbanLoading ? (
              <div className="px-4 py-10 text-center text-slate-400 text-sm">Loading…</div>
            ) : kanbanItems.length === 0 ? (
              <div className="px-4 py-10 text-center text-slate-400 text-sm">No employees match your filters.</div>
            ) : (
              <div className="p-4 overflow-x-auto">
                <div className="flex gap-4 min-w-max">
                  {KANBAN_COLUMNS.filter(col => !status || col === status).map(col => {
                    const colItems = kanbanItems.filter((e: any) => e.status === col);
                    if (colItems.length === 0 && status && col !== status) return null;
                    return (
                      <div key={col} className="w-72 shrink-0">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <div className="flex items-center gap-2">
                            <Badge tone={STATUS_TONE[col] || "slate"}>{col}</Badge>
                          </div>
                          <span className="text-xs text-slate-400">{colItems.length}</span>
                        </div>
                        <div className="space-y-2 min-h-[40px] rounded-lg bg-slate-50 p-2">
                          {colItems.length === 0 && (
                            <div className="text-xs text-slate-300 text-center py-6">No employees</div>
                          )}
                          {colItems.map((e: any) => (
                            <Link
                              key={e.id}
                              href={`/employees/${e.id}`}
                              className="block bg-white rounded-lg border border-slate-200 p-3 hover:border-brand-300 hover:shadow-sm transition"
                            >
                              <div className="flex items-center gap-3">
                                <EmployeeAvatar e={e} size="h-10 w-10 text-sm"/>
                                <div className="min-w-0">
                                  <div className="font-medium text-slate-900 truncate">{e.first_name} {e.last_name}</div>
                                  <div className="text-xs text-slate-500 truncate">{e.designation || "—"}</div>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-[11px] font-mono text-slate-400">{e.emp_code}</span>
                                {e.department && <Badge tone="blue">{e.department}</Badge>}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        ) : (
        <Card>
          <div className="p-4 flex flex-wrap gap-3 border-b border-slate-100">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400"/>
              <Input placeholder="Search by name, email, ID…" value={q} onChange={e=>{setPage(1);setQ(e.target.value);}} className="pl-8"/>
            </div>
            <Select value={dept} onChange={e=>{setPage(1);setDept(e.target.value);}} className="max-w-[200px]">
              <option value="">All Departments</option>
              {depts.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <Select value={status} onChange={e=>{setPage(1);setStatus(e.target.value);}} className="max-w-[160px]">
              <option value="">All Status</option>
              <option>Active</option><option>On Leave</option><option>Inactive</option><option>Resigned</option>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Emp ID</th>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Designation</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>}
                {!loading && data.items.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No employees match your filters.</td></tr>
                )}
                {data.items.map((e: any) => (
                  <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{e.emp_code}</td>
                    <td className="px-4 py-3">
                      <Link href={`/employees/${e.id}`} className="flex items-center gap-3">
                        <EmployeeAvatar e={e}/>
                        <div>
                          <div className="font-medium text-slate-900 hover:text-brand-700">{e.first_name} {e.last_name}</div>
                          <div className="text-xs text-slate-500">{e.work_email}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{e.department || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{e.designation || "—"}</td>
                    <td className="px-4 py-3"><Badge tone="blue">{e.employee_type}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[e.status] || "slate"}>{e.status}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{e.date_of_joining || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center gap-2 p-4 border-t border-slate-100">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next</Button>
            </div>
            <div className="text-xs text-slate-500">Page {page} of {totalPages}</div>
          </div>
        </Card>
        )}
      </div>
    </>
  );
}
