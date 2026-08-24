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
import { Plus, Search, Download, Filter } from "lucide-react";

const STATUS_TONE: Record<string, any> = { Active: "green", "On Leave": "amber", Inactive: "slate", Resigned: "red" };

const HR_ROLES = ["super_admin", "company_admin", "hr_manager"];

export default function EmployeesPage() {
  const router = useRouter();
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [depts, setDepts] = useState<any[]>([]);
  const [q, setQ] = useState(""); const [dept, setDept] = useState(""); const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);

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
  useEffect(() => { if (allowed) api.departments().then(setDepts).catch(() => {}); }, [allowed]);
  useEffect(() => { if (allowed) load(); }, [allowed, q, dept, status, page]);

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
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4"/>Export CSV</Button>
            <Link href="/employees/new"><Button><Plus className="h-4 w-4"/>Add Employee</Button></Link>
          </div>
        </div>

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
                        <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-semibold">
                          {e.first_name[0]}{e.last_name[0]}
                        </div>
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
      </div>
    </>
  );
}
