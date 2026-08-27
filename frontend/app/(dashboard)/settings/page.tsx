"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Modal, ModalField } from "@/components/ui/modal";
import { api, fileUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, X, Pencil, ArrowLeft, Download, Eye, Search,
  Users, CalendarDays, Clock, FileText, Building2,
  Mail, ListChecks, Settings2,
} from "lucide-react";

const HR_ROLES = ["super_admin", "company_admin", "hr_manager"];
const ADMIN_ROLES = ["super_admin", "company_admin"];

const SERVICES = [
  { key: "manage-accounts", label: "Manage Accounts", icon: Users, status: "ready" as const },
  { key: "leave-tracker", label: "Leave Tracker", icon: CalendarDays, status: "ready" as const },
  { key: "shifts", label: "Shifts", icon: Clock, status: "ready" as const },
  { key: "files", label: "Files", icon: FileText, status: "ready" as const },
  { key: "employee-info", label: "Organization Setup", icon: Building2, status: "ready" as const },
  { key: "hr-letters", label: "HR Letters", icon: Mail, status: "ready" as const },
  { key: "tasks", label: "Tasks", icon: ListChecks, status: "ready" as const },
  { key: "general", label: "General", icon: Settings2, status: "ready" as const },
];

/** Deleting departments/designations/locations/employees is admin-only —
 * hr_manager can create/edit but not delete. */
function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    api.me().then(m => setIsAdmin(["super_admin", "company_admin"].includes(m.role))).catch(() => {});
  }, []);
  return isAdmin;
}

function useEmployeeOptions() {
  const [employees, setEmployees] = useState<any[]>([]);
  useEffect(() => {
    api.listEmployees({ page_size: 100 }).then(res => setEmployees(res.items || [])).catch(() => {});
  }, []);
  return employees;
}

/** Employees who have a Manage Accounts login linked — used for Department Head,
 * so a "head" always corresponds to someone with system access. */
function useManageAccountsEmployeeOptions() {
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    api.listUsers().then(users => setOptions(
      users
        .filter((u: any) => u.employee_id && u.employee_name)
        .map((u: any) => ({ id: u.employee_id, label: `${u.employee_name} (${u.email})` }))
    )).catch(() => {});
  }, []);
  return options;
}

function SearchInput({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
      <Input placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className="pl-8 h-8 text-sm" />
    </div>
  );
}

function ShiftsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", start_time: "09:00", end_time: "18:00", color: "#2563eb" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try { setItems(await api.shifts()); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  function resetForm() {
    setForm({ name: "", start_time: "09:00", end_time: "18:00", color: "#2563eb" });
  }

  async function add() {
    if (!form.name.trim()) return;
    setSaving(true); setError("");
    try { await api.createShift(form); resetForm(); setShowForm(false); await load(); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this shift?")) return;
    setError("");
    try { await api.deleteShift(id); await load(); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <Card>
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        <div className="text-sm text-slate-500">{filtered.length} shift{filtered.length === 1 ? "" : "s"}</div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search shifts…" />
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4" />Add Shift
        </Button>
      </div>
      {error && <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">{error}</div>}
      <div className="divide-y divide-slate-100">
        {loading && <div className="px-4 py-10 text-center text-sm text-slate-400">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-400">No shifts found.</div>
        )}
        {filtered.map(s => (
          <div key={s.id} className="px-4 py-3 flex items-center gap-3">
            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: s.color || "#94a3b8" }} />
            <span className="flex-1 text-sm text-slate-900">{s.name}</span>
            <span className="text-xs text-slate-500 font-mono">{s.start_time} – {s.end_time}</span>
            <button onClick={() => remove(s.id)} className="text-slate-400 hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <Modal
          title="Add Shift"
          onClose={() => setShowForm(false)}
          footer={<>
            <Button onClick={add} disabled={saving || !form.name.trim()}>{saving ? "Saving…" : "Submit"}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </>}
        >
          <ModalField label="Shift Name *">
            <Input placeholder="e.g. General Shift" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus/>
          </ModalField>
          <div className="grid grid-cols-2 gap-4">
            <ModalField label="Start Time">
              <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}/>
            </ModalField>
            <ModalField label="End Time">
              <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}/>
            </ModalField>
          </div>
          <ModalField label="Color">
            <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              className="h-9 w-16 rounded-md border border-slate-200 p-1"/>
          </ModalField>
        </Modal>
      )}
    </Card>
  );
}

function ReassignDeleteModal({
  title, itemLabel, count, options, onCancel, onConfirm,
}: {
  title: string; itemLabel: string; count: number;
  options: { id: string; label: string }[];
  onCancel: () => void;
  onConfirm: (targetId: string | null) => Promise<void>;
}) {
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function confirm() {
    setBusy(true); setErr("");
    try { await onConfirm(target || null); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={<>
        <Button onClick={confirm} disabled={busy} className="bg-red-600 hover:bg-red-700">
          {busy ? "Moving & deleting…" : "Move & Delete"}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </>}
    >
      <p className="text-sm text-slate-600 mb-3">
        <strong>{itemLabel}</strong> has <strong>{count}</strong> employee{count === 1 ? "" : "s"} assigned. Choose where to move them before deleting.
      </p>
      {err && <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{err}</div>}
      <ModalField label="Move employees to">
        <Select value={target} onChange={e => setTarget(e.target.value)}>
          <option value="">— Unassign (no replacement) —</option>
          {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </Select>
      </ModalField>
    </Modal>
  );
}

function DepartmentsService() {
  const isAdmin = useIsAdmin();
  const headOptions = useManageAccountsEmployeeOptions();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", code: "", mail_alias: "", lead_id: "", parent_id: "" });
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string; count: number } | null>(null);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try { setItems(await api.departments()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.code || "").toLowerCase().includes(search.toLowerCase())
  );

  function resetForm() {
    setForm({ name: "", code: "", mail_alias: "", lead_id: "", parent_id: "" });
    setEditingId(null);
  }

  function startEdit(d: any) {
    setForm({
      name: d.name, code: d.code || "", mail_alias: d.mail_alias || "",
      lead_id: d.lead_id || "", parent_id: d.parent_id || "",
    });
    setEditingId(d.id);
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true); setError("");
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      mail_alias: form.mail_alias.trim() || null,
      lead_id: form.lead_id || null,
      parent_id: form.parent_id || null,
    };
    try {
      if (editingId) await api.updateDepartment(editingId, payload);
      else await api.createDepartment(payload);
      resetForm(); setShowForm(false); await load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    setError("");
    try {
      const { employee_count } = await api.departmentEmployeeCount(id);
      if (employee_count > 0) {
        const dept = items.find(d => d.id === id);
        setPendingDelete({ id, name: dept?.name || "This department", count: employee_count });
        return;
      }
      if (!confirm("Delete this department?")) return;
      await api.deleteDepartment(id); await load();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <Card>
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        <div className="text-sm text-slate-500">{filtered.length} department{filtered.length === 1 ? "" : "s"}</div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search departments…" />
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4" />Add Department
        </Button>
      </div>
      {error && <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">{error}</div>}
      <div className="divide-y divide-slate-100">
        {loading && <div className="px-4 py-10 text-center text-sm text-slate-400">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-400">No departments found.</div>
        )}
        {filtered.map(d => (
          <div key={d.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-900">{d.name}{d.code ? ` (${d.code})` : ""}</div>
              <div className="text-xs text-slate-500">
                {d.mail_alias ? `${d.mail_alias} · ` : ""}
                {d.lead_name ? `Head: ${d.lead_name}` : "No head"}
                {d.parent_name ? ` · Under ${d.parent_name}` : ""}
              </div>
            </div>
            <button onClick={() => startEdit(d)} className="text-slate-400 hover:text-slate-700">
              <Pencil className="h-3.5 w-3.5"/>
            </button>
            {isAdmin && (
              <button onClick={() => remove(d.id)} className="text-slate-400 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5"/>
              </button>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <Modal
          title={editingId ? "Edit Department" : "Add Department"}
          onClose={() => setShowForm(false)}
          footer={<>
            <Button onClick={save} disabled={saving || !form.name.trim()}>{saving ? "Saving…" : "Submit"}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </>}
        >
          <ModalField label="Department Name *">
            <Input placeholder="e.g. Engineering" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus/>
          </ModalField>
          <div className="grid grid-cols-2 gap-4">
            <ModalField label="Department Code">
              <Input placeholder="Optional" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}/>
            </ModalField>
            <ModalField label="Mail Alias">
              <Input placeholder="Optional" value={form.mail_alias} onChange={e => setForm(f => ({ ...f, mail_alias: e.target.value }))}/>
            </ModalField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ModalField label="Department Head">
              <Select value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))}>
                <option value="">Select</option>
                {headOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </Select>
              <p className="text-[11px] text-slate-400 mt-1">Only employees with a Manage Accounts login can be set as head.</p>
            </ModalField>
            <ModalField label="Parent Department">
              <Select value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}>
                <option value="">Select</option>
                {items.filter(d => d.id !== editingId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </ModalField>
          </div>
        </Modal>
      )}

      {pendingDelete && (
        <ReassignDeleteModal
          title={`Delete ${pendingDelete.name}`}
          itemLabel={pendingDelete.name}
          count={pendingDelete.count}
          options={items.filter(d => d.id !== pendingDelete.id).map(d => ({ id: d.id, label: d.name }))}
          onCancel={() => setPendingDelete(null)}
          onConfirm={async (targetId) => {
            await api.reassignDepartmentEmployees(pendingDelete.id, targetId);
            await api.deleteDepartment(pendingDelete.id);
            setPendingDelete(null);
            await load();
          }}
        />
      )}
    </Card>
  );
}

function DesignationsService() {
  const isAdmin = useIsAdmin();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", code: "", mail_alias: "" });
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string; count: number } | null>(null);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try { setItems(await api.designations()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.code || "").toLowerCase().includes(search.toLowerCase())
  );

  function resetForm() {
    setForm({ title: "", code: "", mail_alias: "" });
    setEditingId(null);
  }

  function startEdit(d: any) {
    setForm({ title: d.title, code: d.code || "", mail_alias: d.mail_alias || "" });
    setEditingId(d.id);
    setShowForm(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true); setError("");
    const payload = {
      title: form.title.trim(),
      code: form.code.trim() || null,
      mail_alias: form.mail_alias.trim() || null,
    };
    try {
      if (editingId) await api.updateDesignation(editingId, payload);
      else await api.createDesignation(payload);
      resetForm(); setShowForm(false); await load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    setError("");
    try {
      const { employee_count } = await api.designationEmployeeCount(id);
      if (employee_count > 0) {
        const desig = items.find(d => d.id === id);
        setPendingDelete({ id, name: desig?.title || "This designation", count: employee_count });
        return;
      }
      if (!confirm("Delete this designation?")) return;
      await api.deleteDesignation(id); await load();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <Card>
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        <div className="text-sm text-slate-500">{filtered.length} designation{filtered.length === 1 ? "" : "s"}</div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search designations…" />
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4" />Add Designation
        </Button>
      </div>
      {error && <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">{error}</div>}
      <div className="divide-y divide-slate-100">
        {loading && <div className="px-4 py-10 text-center text-sm text-slate-400">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-400">No designations found.</div>
        )}
        {filtered.map(d => (
          <div key={d.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-900">{d.title}{d.code ? ` (${d.code})` : ""}</div>
              {d.mail_alias && <div className="text-xs text-slate-500">{d.mail_alias}</div>}
            </div>
            <button onClick={() => startEdit(d)} className="text-slate-400 hover:text-slate-700">
              <Pencil className="h-3.5 w-3.5"/>
            </button>
            {isAdmin && (
              <button onClick={() => remove(d.id)} className="text-slate-400 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5"/>
              </button>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <Modal
          title={editingId ? "Edit Designation" : "Add Designation"}
          onClose={() => setShowForm(false)}
          footer={<>
            <Button onClick={save} disabled={saving || !form.title.trim()}>{saving ? "Saving…" : "Submit"}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </>}
        >
          <ModalField label="Designation Name *">
            <Input placeholder="e.g. Software Engineer" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus/>
          </ModalField>
          <div className="grid grid-cols-2 gap-4">
            <ModalField label="Designation Code">
              <Input placeholder="Optional" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}/>
            </ModalField>
            <ModalField label="Mail Alias">
              <Input placeholder="Optional" value={form.mail_alias} onChange={e => setForm(f => ({ ...f, mail_alias: e.target.value }))}/>
            </ModalField>
          </div>
        </Modal>
      )}

      {pendingDelete && (
        <ReassignDeleteModal
          title={`Delete ${pendingDelete.name}`}
          itemLabel={pendingDelete.name}
          count={pendingDelete.count}
          options={items.filter(d => d.id !== pendingDelete.id).map(d => ({ id: d.id, label: d.title }))}
          onCancel={() => setPendingDelete(null)}
          onConfirm={async (targetId) => {
            await api.reassignDesignationEmployees(pendingDelete.id, targetId);
            await api.deleteDesignation(pendingDelete.id);
            setPendingDelete(null);
            await load();
          }}
        />
      )}
    </Card>
  );
}

const BLANK_LOCATION = {
  name: "", code: "", mail_alias: "",
  address_line1: "", address_line2: "", city: "", state: "", country: "", postal_code: "",
  description: "",
};

function LocationsService() {
  const isAdmin = useIsAdmin();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK_LOCATION);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try { setItems(await api.locations()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.city || "").toLowerCase().includes(search.toLowerCase())
  );

  function resetForm() {
    setForm(BLANK_LOCATION);
    setEditingId(null);
  }

  function startEdit(l: any) {
    setForm({
      name: l.name, code: l.code || "", mail_alias: l.mail_alias || "",
      address_line1: l.address_line1 || "", address_line2: l.address_line2 || "",
      city: l.city || "", state: l.state || "", country: l.country || "", postal_code: l.postal_code || "",
      description: l.description || "",
    });
    setEditingId(l.id);
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true); setError("");
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim() || null])
    );
    try {
      if (editingId) await api.updateLocation(editingId, payload);
      else await api.createLocation(payload);
      resetForm(); setShowForm(false); await load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this location?")) return;
    setError("");
    try { await api.deleteLocation(id); await load(); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <Card>
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        <div className="text-sm text-slate-500">{filtered.length} location{filtered.length === 1 ? "" : "s"}</div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search locations…" />
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4" />Add Location
        </Button>
      </div>
      {error && <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">{error}</div>}
      <div className="divide-y divide-slate-100">
        {loading && <div className="px-4 py-10 text-center text-sm text-slate-400">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-400">No locations found.</div>
        )}
        {filtered.map(l => (
          <div key={l.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-900">{l.name}{l.code ? ` (${l.code})` : ""}</div>
              <div className="text-xs text-slate-500">
                {[l.address_line1, l.city, l.state, l.country, l.postal_code, l.mail_alias].filter(Boolean).join(", ") || "—"}
              </div>
            </div>
            <button onClick={() => startEdit(l)} className="text-slate-400 hover:text-slate-700">
              <Pencil className="h-3.5 w-3.5"/>
            </button>
            {isAdmin && (
              <button onClick={() => remove(l.id)} className="text-slate-400 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5"/>
              </button>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <Modal
          title={editingId ? "Edit Location" : "Add Location"}
          onClose={() => setShowForm(false)}
          footer={<>
            <Button onClick={save} disabled={saving || !form.name.trim()}>{saving ? "Saving…" : "Submit"}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </>}
        >
          <div className="grid sm:grid-cols-2 gap-x-4">
            <div>
              <ModalField label="Location Name *">
                <Input placeholder="e.g. Chennai Office" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus/>
              </ModalField>
              <ModalField label="Location Code">
                <Input placeholder="Optional" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}/>
              </ModalField>
              <ModalField label="Mail Alias">
                <Input placeholder="Optional" value={form.mail_alias} onChange={e => setForm(f => ({ ...f, mail_alias: e.target.value }))}/>
              </ModalField>
              <ModalField label="Description">
                <Textarea placeholder="Optional" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="min-h-[86px]"/>
              </ModalField>
            </div>
            <div>
              <ModalField label="Address Line 1">
                <Input placeholder="Optional" value={form.address_line1} onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))}/>
              </ModalField>
              <ModalField label="Address Line 2">
                <Input placeholder="Optional" value={form.address_line2} onChange={e => setForm(f => ({ ...f, address_line2: e.target.value }))}/>
              </ModalField>
              <ModalField label="City">
                <Input placeholder="Optional" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}/>
              </ModalField>
              <div className="grid grid-cols-2 gap-4">
                <ModalField label="Country">
                  <Input placeholder="Optional" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}/>
                </ModalField>
                <ModalField label="State">
                  <Input placeholder="Optional" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}/>
                </ModalField>
              </div>
              <ModalField label="Postal Code">
                <Input placeholder="Optional" value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))}/>
              </ModalField>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

function OrganizationDetailsService() {
  const [company, setCompany] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const c = await api.getCompany();
      setCompany(c);
      setForm({
        name: c.name || "", website: c.website || "", org_type: c.org_type || "",
        contact_person: c.contact_person || "", contact_number: c.contact_number || "", contact_email: c.contact_email || "",
        address_line1: c.address_line1 || "", address_line2: c.address_line2 || "",
        city: c.city || "", state: c.state || "", country: c.country || "", postal_code: c.postal_code || "",
        gst_number: c.gst_number || "", pan_number: c.pan_number || "", alt_contact_number: c.alt_contact_number || "",
      });
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true); setError(""); setSaved(false);
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, (v as string).trim() || null])
    );
    try {
      const c = await api.updateCompany(payload);
      setCompany(c);
      setSaved(true);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function uploadLogo(file: File) {
    setUploadingLogo(true); setError("");
    try { setCompany(await api.uploadCompanyLogo(file)); setLogoFailed(false); }
    catch (e: any) { setError(e.message); }
    finally { setUploadingLogo(false); }
  }

  if (loading || !form) {
    return <Card><div className="p-10 text-center text-sm text-slate-400">Loading…</div></Card>;
  }

  return (
    <Card>
      <div className="p-5 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">Basic Details</h3>
      </div>
      <div className="p-5">
        {error && <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{error}</div>}
        {saved && <div className="mb-4 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-3 py-2">Saved.</div>}
        <div className="grid sm:grid-cols-2 gap-x-8">
          <div>
            <ModalField label="Logo">
              <div className="flex items-center gap-3">
                {company?.logo_url && !logoFailed
                  ? <img src={fileUrl(company.logo_url)} alt="Logo" className="h-14 w-14 rounded-lg object-cover border border-slate-200" onError={() => setLogoFailed(true)}/>
                  : <div className="h-14 w-14 rounded-lg bg-slate-100 grid place-items-center text-slate-300 text-[10px]">No logo</div>}
                <div>
                  <label className="text-sm text-brand-600 hover:underline cursor-pointer">
                    {uploadingLogo ? "Uploading…" : company?.logo_url ? "Change" : "Add Logo"}
                    <input
                      type="file" accept="image/*" className="hidden" disabled={uploadingLogo}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }}
                    />
                  </label>
                  <p className="text-[11px] text-slate-400">Exactly 80×55px, max 500KB</p>
                </div>
              </div>
            </ModalField>
            <ModalField label="Name *">
              <Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}/>
            </ModalField>
            <ModalField label="Website">
              <Input placeholder="Company Website" value={form.website} onChange={e => setForm((f: any) => ({ ...f, website: e.target.value }))}/>
            </ModalField>
            <ModalField label="Type of Organization">
              <Input placeholder="e.g. IT Services" value={form.org_type} onChange={e => setForm((f: any) => ({ ...f, org_type: e.target.value }))}/>
            </ModalField>
            <ModalField label="Contact Person">
              <Input placeholder="Contact person" value={form.contact_person} onChange={e => setForm((f: any) => ({ ...f, contact_person: e.target.value }))}/>
            </ModalField>
            <div className="grid grid-cols-2 gap-4">
              <ModalField label="Contact Number">
                <Input value={form.contact_number} onChange={e => setForm((f: any) => ({ ...f, contact_number: e.target.value }))}/>
              </ModalField>
              <ModalField label="Alternate Contact Number">
                <Input value={form.alt_contact_number} onChange={e => setForm((f: any) => ({ ...f, alt_contact_number: e.target.value }))}/>
              </ModalField>
            </div>
            <ModalField label="Contact Email *">
              <Input type="email" value={form.contact_email} onChange={e => setForm((f: any) => ({ ...f, contact_email: e.target.value }))}/>
            </ModalField>
            <div className="grid grid-cols-2 gap-4">
              <ModalField label="GST Number">
                <Input placeholder="22AAAAA0000A1Z5" value={form.gst_number} onChange={e => setForm((f: any) => ({ ...f, gst_number: e.target.value }))}/>
              </ModalField>
              <ModalField label="PAN Number">
                <Input placeholder="AAAAA0000A" value={form.pan_number} onChange={e => setForm((f: any) => ({ ...f, pan_number: e.target.value }))}/>
              </ModalField>
            </div>
          </div>
          <div>
            <ModalField label="Primary Address — Line 1">
              <Input placeholder="Address Line 1" value={form.address_line1} onChange={e => setForm((f: any) => ({ ...f, address_line1: e.target.value }))}/>
            </ModalField>
            <ModalField label="Address Line 2">
              <Input placeholder="Address Line 2" value={form.address_line2} onChange={e => setForm((f: any) => ({ ...f, address_line2: e.target.value }))}/>
            </ModalField>
            <ModalField label="City">
              <Input value={form.city} onChange={e => setForm((f: any) => ({ ...f, city: e.target.value }))}/>
            </ModalField>
            <div className="grid grid-cols-2 gap-4">
              <ModalField label="Country">
                <Input value={form.country} onChange={e => setForm((f: any) => ({ ...f, country: e.target.value }))}/>
              </ModalField>
              <ModalField label="State">
                <Input value={form.state} onChange={e => setForm((f: any) => ({ ...f, state: e.target.value }))}/>
              </ModalField>
            </div>
            <ModalField label="ZIP/PIN Code">
              <Input value={form.postal_code} onChange={e => setForm((f: any) => ({ ...f, postal_code: e.target.value }))}/>
            </ModalField>
          </div>
        </div>
        <div className="mt-2">
          <Button onClick={save} disabled={saving || !form.name.trim()}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </Card>
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

function LeaveTrackerService() {
  const now = new Date();
  const [subTab, setSubTab] = useState<"holidays" | "policies">("holidays");

  const [holidays, setHolidays] = useState<any[]>([]);
  const [holidayYear, setHolidayYear] = useState(now.getFullYear());
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [holidaySearch, setHolidaySearch] = useState("");

  const [policies, setPolicies] = useState<any[]>([]);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [policySearch, setPolicySearch] = useState("");

  async function loadHolidays() { setHolidays(await api.holidays(holidayYear)); }
  async function loadPolicies() { setPolicies(await api.leaveTypes()); }

  useEffect(() => { if (subTab === "holidays") loadHolidays(); }, [subTab, holidayYear]);
  useEffect(() => { if (subTab === "policies") loadPolicies(); }, [subTab]);

  async function removeHoliday(id: string) {
    if (!confirm("Delete this holiday?")) return;
    await api.deleteHoliday(id); await loadHolidays();
  }

  const filteredHolidays = holidays.filter(h => h.name.toLowerCase().includes(holidaySearch.toLowerCase()));
  const filteredPolicies = policies.filter(p =>
    p.name.toLowerCase().includes(policySearch.toLowerCase()) ||
    (p.code || "").toLowerCase().includes(policySearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 border-b border-slate-200 flex-1">
          {(["holidays", "policies"] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={cn(
                "px-4 py-2 text-sm font-medium -mb-px border-b-2 transition",
                subTab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
              )}>
              {t === "holidays" ? "Holidays" : "Leave Policies"}
            </button>
          ))}
        </div>
        {subTab === "holidays" && <Button onClick={() => setShowAddHoliday(true)}><Plus className="h-4 w-4" />Add Holiday</Button>}
        {subTab === "policies" && <Button onClick={() => { setEditingPolicyId(null); setShowPolicyForm(true); }}><Plus className="h-4 w-4" />Add Policy</Button>}
      </div>

      {subTab === "holidays" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={holidayYear} onChange={e => setHolidayYear(+e.target.value)} className="max-w-[120px]">
              {[holidayYear + 1, holidayYear, holidayYear - 1].map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
            <SearchInput value={holidaySearch} onChange={setHolidaySearch} placeholder="Search holidays…" />
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
                  <div className="text-sm text-slate-600 tabular-nums">
                    {new Date(h.holiday_date).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                  </div>
                  <button onClick={() => removeHoliday(h.id)} className="text-slate-400 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {subTab === "policies" && (
        <div className="space-y-3">
          <SearchInput value={policySearch} onChange={setPolicySearch} placeholder="Search policies…" />
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
    </div>
  );
}

function EmployeeInformationService() {
  return (
    <Tabs defaultValue="organization">
      <TabsList>
        <TabsTrigger value="organization">Organization Details</TabsTrigger>
        <TabsTrigger value="departments">Departments</TabsTrigger>
        <TabsTrigger value="designations">Designations</TabsTrigger>
        <TabsTrigger value="locations">Work Locations</TabsTrigger>
      </TabsList>
      <TabsContent value="organization">
        <OrganizationDetailsService />
      </TabsContent>
      <TabsContent value="departments">
        <DepartmentsService />
      </TabsContent>
      <TabsContent value="designations">
        <DesignationsService />
      </TabsContent>
      <TabsContent value="locations">
        <LocationsService />
      </TabsContent>
    </Tabs>
  );
}

function UsersService() {
  const router = useRouter();
  const employees = useEmployeeOptions();
  const [departments, setDepartments] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", role: "employee", assigned_department_id: "" });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ email: "", employee_id: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [savingDeptId, setSavingDeptId] = useState<string | null>(null);

  useEffect(() => { api.me().then(setMe).catch(() => {}); }, []);
  useEffect(() => { api.departments().then(setDepartments).catch(() => {}); }, []);

  async function load() {
    setLoading(true);
    try { setItems(await api.listUsers()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter((u: any) =>
    (u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.employee_name || "").toLowerCase().includes(search.toLowerCase())) &&
    (!roleFilter || u.role === roleFilter) &&
    (!statusFilter || (statusFilter === "active" ? u.is_active : !u.is_active))
  );

  async function add() {
    if (!form.email.trim()) return;
    setSaving(true); setError("");
    try {
      const res = await api.createUser({
        email: form.email, role: form.role,
        assigned_department_id: form.role === "hr_manager" ? (form.assigned_department_id || null) : null,
      });
      setCreated({ email: res.email, password: res.temp_password });
      setForm({ email: "", role: "employee", assigned_department_id: "" });
      setShowForm(false);
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function changeRole(id: string, role: string) {
    setError("");
    try { await api.updateUserRole(id, role); await load(); }
    catch (e: any) { setError(e.message); }
  }

  async function changeDepartment(u: any, deptId: string) {
    setError(""); setSavingDeptId(u.id);
    try {
      await api.updateUserProfile(u.id, { email: u.email, employee_id: u.employee_id || null, assigned_department_id: deptId || null });
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setSavingDeptId(null); }
  }

  async function toggleActive(id: string) {
    setError("");
    try { await api.toggleUserActive(id); await load(); }
    catch (e: any) { setError(e.message); }
  }

  function startEdit(u: any) {
    if (u.employee_id) {
      // Already linked to an employee — edit the full employee record directly,
      // same form used everywhere else in the app.
      router.push(`/employees/${u.employee_id}/edit`);
      return;
    }
    // Not linked yet — link (or change the login email) first via the small modal.
    setEditForm({ email: u.email, employee_id: u.employee_id || "" });
    setEditingUser(u);
  }

  async function saveEdit() {
    if (!editingUser || !editForm.email.trim()) return;
    setSavingEdit(true); setError("");
    try {
      await api.updateUserProfile(editingUser.id, { email: editForm.email.trim(), employee_id: editForm.employee_id || null });
      const linkedNow = editForm.employee_id;
      setEditingUser(null);
      if (linkedNow) {
        // Now that a profile is linked, go straight into editing it.
        router.push(`/employees/${linkedNow}/edit`);
      } else {
        await load();
      }
    } catch (e: any) { setError(e.message); }
    finally { setSavingEdit(false); }
  }

  if (me && !ADMIN_ROLES.includes(me.role)) {
    return <div className="py-16 text-center text-sm text-slate-400">Only company admins can manage user accounts.</div>;
  }

  return (
    <Card>
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        <div className="text-sm text-slate-500">{filtered.length} user account{filtered.length === 1 ? "" : "s"}</div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search accounts…" />
        <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="max-w-[160px]">
          <option value="">All Roles</option>
          <option value="company_admin">Company Admin</option>
          <option value="hr_manager">HR Manager</option>
          <option value="employee">Employee</option>
        </Select>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="max-w-[140px]">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />Add User
        </Button>
      </div>

      {created && (
        <div className="px-4 py-3 border-b border-emerald-100 bg-emerald-50 text-sm text-emerald-800 flex items-center justify-between gap-3">
          <span>
            Account created for <strong>{created.email}</strong> — temp password:{" "}
            <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200">{created.password}</code>
          </span>
          <button onClick={() => setCreated(null)} className="text-emerald-600 hover:text-emerald-800 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Assigned Dept</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Login</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No user accounts found.</td></tr>
            )}
            {filtered.map(u => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-900">{u.email}</td>
                <td className="px-4 py-3 text-slate-600">{u.employee_name || "—"}</td>
                <td className="px-4 py-3">
                  <Select
                    value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                    disabled={me && u.id === me.id}
                    className="w-36 h-8 text-xs"
                  >
                    <option value="company_admin">Company Admin</option>
                    <option value="hr_manager">HR Manager</option>
                    <option value="employee">Employee</option>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  {u.role === "hr_manager" ? (
                    <Select
                      value={u.assigned_department_id || ""}
                      onChange={e => changeDepartment(u, e.target.value)}
                      disabled={savingDeptId === u.id}
                      className="w-40 h-8 text-xs"
                    >
                      <option value="">All departments</option>
                      {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </Select>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={u.is_active ? "green" : "slate"}>{u.is_active ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(u.id)}
                    disabled={me && u.id === me.id}
                    className={cn(
                      "relative h-5 w-9 rounded-full transition disabled:opacity-40 disabled:cursor-not-allowed",
                      u.is_active ? "bg-brand-600" : "bg-slate-200"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white transition",
                      u.is_active ? "left-4" : "left-0.5"
                    )} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => u.employee_id ? router.push(`/employees/${u.employee_id}`) : setError("No employee profile linked to this account yet — use Edit to link one.")}
                      className="text-slate-400 hover:text-slate-700"
                      title="View linked employee profile"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => startEdit(u)} className="text-slate-400 hover:text-slate-700" title="Edit account">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal
          title="Add User"
          onClose={() => setShowForm(false)}
          footer={<>
            <Button onClick={add} disabled={saving || !form.email.trim()}>{saving ? "Creating…" : "Submit"}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </>}
        >
          <ModalField label="Email *">
            <Input type="email" placeholder="name@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} autoFocus/>
          </ModalField>
          <ModalField label="Role">
            <Select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="company_admin">Company Admin</option>
              <option value="hr_manager">HR Manager</option>
              <option value="employee">Employee</option>
            </Select>
          </ModalField>
          {form.role === "hr_manager" && (
            <ModalField label="Assigned Department">
              <Select value={form.assigned_department_id} onChange={e => setForm(f => ({ ...f, assigned_department_id: e.target.value }))}>
                <option value="">All departments (no restriction)</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
              <p className="text-[11px] text-slate-400 mt-1">If set, this HR Manager can only view/edit employees in this department.</p>
            </ModalField>
          )}
        </Modal>
      )}

      {editingUser && (
        <Modal
          title="Link Employee Profile"
          onClose={() => setEditingUser(null)}
          footer={<>
            <Button onClick={saveEdit} disabled={savingEdit || !editForm.email.trim()}>{savingEdit ? "Saving…" : "Save"}</Button>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
          </>}
        >
          <p className="text-xs text-slate-500 mb-3">
            This account isn't linked to an employee profile yet. Link one to edit their full details — you'll be taken straight to the edit form.
          </p>
          <ModalField label="Email *">
            <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} autoFocus/>
          </ModalField>
          <ModalField label="Linked Employee Profile">
            <Select value={editForm.employee_id} onChange={e => setEditForm(f => ({ ...f, employee_id: e.target.value }))}>
              <option value="">— Not linked —</option>
              {employees.map((e: any) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.emp_code})</option>)}
            </Select>
          </ModalField>
          <div className="text-center text-xs text-slate-400 my-1">— or —</div>
          <Link
            href={`/employees/new?link_user_id=${editingUser.id}&email=${encodeURIComponent(editingUser.email)}`}
            className="block text-center text-sm text-brand-600 hover:underline"
          >
            Create a new Employee profile for this account
          </Link>
        </Modal>
      )}
    </Card>
  );
}

function FilesService() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [folder, setFolder] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try { setItems(await api.listFiles()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter((f: any) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.folder || "").toLowerCase().includes(search.toLowerCase())
  );

  async function upload() {
    if (!name.trim() || !file) return;
    setSaving(true); setError("");
    try {
      await api.uploadFile(name.trim(), description.trim(), folder.trim(), file);
      setName(""); setDescription(""); setFolder(""); setFile(null); setShowForm(false);
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this file?")) return;
    setError("");
    try { await api.deleteFile(id); await load(); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <Card>
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        <div className="text-sm text-slate-500">{filtered.length} file{filtered.length === 1 ? "" : "s"}</div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search files…" />
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" />Add File</Button>
      </div>
      {error && <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">{error}</div>}
      <div className="divide-y divide-slate-100">
        {loading && <div className="px-4 py-10 text-center text-sm text-slate-400">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-400">No organization files found.</div>
        )}
        {filtered.map(f => (
          <div key={f.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-900 truncate">
                {f.name}{f.folder ? <span className="ml-2 text-xs text-slate-400 font-normal">{f.folder}</span> : null}
              </div>
              {f.description && <div className="text-xs text-slate-500 truncate">{f.description}</div>}
            </div>
            <a href={fileUrl(f.file_url)} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-brand-600">
              <Download className="h-4 w-4"/>
            </a>
            <button onClick={() => remove(f.id)} className="text-slate-400 hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5"/>
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <Modal
          title="Add File"
          onClose={() => setShowForm(false)}
          footer={<>
            <Button onClick={upload} disabled={saving || !name.trim() || !file}>{saving ? "Uploading…" : "Submit"}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </>}
        >
          <ModalField label="File Name *">
            <Input placeholder="e.g. Company Handbook" value={name} onChange={e => setName(e.target.value)} autoFocus/>
          </ModalField>
          <div className="grid grid-cols-2 gap-4">
            <ModalField label="Description">
              <Input placeholder="Optional" value={description} onChange={e => setDescription(e.target.value)}/>
            </ModalField>
            <ModalField label="Folder">
              <Input placeholder="Optional" value={folder} onChange={e => setFolder(e.target.value)}/>
            </ModalField>
          </div>
          <ModalField label="File *">
            <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs"/>
          </ModalField>
        </Modal>
      )}
    </Card>
  );
}

function HrLettersService() {
  const employees = useEmployeeOptions();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_id: "", letter_type: "Bonafide Letter", date_of_request: new Date().toISOString().slice(0, 10), reason: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    setLoading(true);
    try { setItems(await api.listLetters()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter((r: any) =>
    ((r.employee_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.letter_type || "").toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || r.status === statusFilter)
  );

  async function add() {
    if (!form.employee_id) return;
    setSaving(true); setError("");
    try { await api.createLetter(form); setForm(f => ({ ...f, employee_id: "", reason: "" })); setShowForm(false); await load(); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function setStatus(id: string, status: string) {
    setError("");
    try { await api.updateLetterStatus(id, status); await load(); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <Card>
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        <div className="text-sm text-slate-500">{filtered.length} request{filtered.length === 1 ? "" : "s"}</div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search requests…" />
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="max-w-[140px]">
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Issued">Issued</option>
          <option value="Rejected">Rejected</option>
        </Select>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" />Add Request</Button>
      </div>
      {error && <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Letter Type</th>
              <th className="px-4 py-3 font-medium">Date of Request</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No records found.</td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-900">{r.employee_name || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{r.letter_type}</td>
                <td className="px-4 py-3 text-slate-600">{r.date_of_request}</td>
                <td className="px-4 py-3 text-slate-600">{r.reason || "—"}</td>
                <td className="px-4 py-3">
                  <Select value={r.status} onChange={e => setStatus(r.id, e.target.value)} className="w-32 h-8 text-xs">
                    <option>Pending</option>
                    <option>Issued</option>
                    <option>Rejected</option>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal
          title="Add Request"
          onClose={() => setShowForm(false)}
          footer={<>
            <Button onClick={add} disabled={saving || !form.employee_id}>{saving ? "Saving…" : "Submit"}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </>}
        >
          <ModalField label="Employee *">
            <Select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}>
              <option value="">Select</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </Select>
          </ModalField>
          <div className="grid grid-cols-2 gap-4">
            <ModalField label="Letter Type">
              <Select value={form.letter_type} onChange={e => setForm(f => ({ ...f, letter_type: e.target.value }))}>
                <option>Address Proof</option>
                <option>Bonafide Letter</option>
                <option>Experience Letter</option>
              </Select>
            </ModalField>
            <ModalField label="Date of Request">
              <Input type="date" value={form.date_of_request} onChange={e => setForm(f => ({ ...f, date_of_request: e.target.value }))}/>
            </ModalField>
          </div>
          <ModalField label="Reason for Request">
            <Select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
              <option value="">Select</option>
              <option>Visa application</option>
              <option>Bank loan</option>
              <option>Address proof</option>
              <option>Higher education</option>
              <option>Other</option>
            </Select>
          </ModalField>
        </Modal>
      )}
    </Card>
  );
}

function TasksService() {
  const employees = useEmployeeOptions();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", owner_id: "", start_date: "", due_date: "", priority: "Moderate" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    setLoading(true);
    try { setItems(await api.listHrTasks()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter((t: any) =>
    (t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.owner_name || "").toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || t.status === statusFilter)
  );

  async function add() {
    if (!form.name.trim()) return;
    setSaving(true); setError("");
    try {
      await api.createHrTask({
        ...form, owner_id: form.owner_id || null,
        start_date: form.start_date || null, due_date: form.due_date || null,
      });
      setForm({ name: "", description: "", owner_id: "", start_date: "", due_date: "", priority: "Moderate" });
      setShowForm(false);
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function setStatus(id: string, status: string) {
    setError("");
    try { await api.updateHrTaskStatus(id, status); await load(); }
    catch (e: any) { setError(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this task?")) return;
    setError("");
    try { await api.deleteHrTask(id); await load(); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <Card>
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        <div className="text-sm text-slate-500">{filtered.length} task{filtered.length === 1 ? "" : "s"}</div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search tasks…" />
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="max-w-[150px]">
          <option value="">All Status</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </Select>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" />Add Task</Button>
      </div>
      {error && <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">{error}</div>}
      <div className="divide-y divide-slate-100">
        {loading && <div className="px-4 py-10 text-center text-sm text-slate-400">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-400">No tasks found.</div>
        )}
        {filtered.map(t => (
          <div key={t.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-900 truncate">{t.name}</div>
              {t.description && <div className="text-xs text-slate-500 truncate">{t.description}</div>}
              <div className="text-xs text-slate-500">
                {t.owner_name || "Unassigned"}
                {t.start_date ? ` · Starts ${t.start_date}` : ""}
                {t.due_date ? ` · Due ${t.due_date}` : ""} · {t.priority}
              </div>
            </div>
            <Select value={t.status} onChange={e => setStatus(t.id, e.target.value)} className="w-36 h-8 text-xs">
              <option>Open</option>
              <option>In Progress</option>
              <option>Completed</option>
            </Select>
            <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5"/>
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <Modal
          title="Add Task"
          onClose={() => setShowForm(false)}
          footer={<>
            <Button onClick={add} disabled={saving || !form.name.trim()}>{saving ? "Saving…" : "Submit"}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </>}
        >
          <ModalField label="Task Name *">
            <Input placeholder="e.g. Prepare offer letter" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus/>
          </ModalField>
          <ModalField label="Description">
            <Textarea placeholder="Optional" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="min-h-[70px]"/>
          </ModalField>
          <div className="grid grid-cols-2 gap-4">
            <ModalField label="Owner">
              <Select value={form.owner_id} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))}>
                <option value="">Unassigned</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </Select>
            </ModalField>
            <ModalField label="Priority">
              <Select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option>Low</option>
                <option>Moderate</option>
                <option>High</option>
              </Select>
            </ModalField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ModalField label="Start Date">
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}/>
            </ModalField>
            <ModalField label="Due Date">
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}/>
            </ModalField>
          </div>
        </Modal>
      )}
    </Card>
  );
}

function GeneralService() {
  const employees = useEmployeeOptions();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_id: "", separation_date: new Date().toISOString().slice(0, 10), interviewer_id: "", reason: "", feedback: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    setLoading(true);
    try { setItems(await api.listExitDetails()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter((r: any) =>
    (r.employee_name || "").toLowerCase().includes(search.toLowerCase()) &&
    (!statusFilter || r.status === statusFilter)
  );

  async function add() {
    if (!form.employee_id) return;
    setSaving(true); setError("");
    try {
      await api.createExitDetail({ ...form, interviewer_id: form.interviewer_id || null });
      setForm(f => ({ ...f, employee_id: "", interviewer_id: "", reason: "", feedback: "" }));
      setShowForm(false);
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function setStatus(id: string, status: string) {
    setError("");
    try { await api.updateExitStatus(id, status); await load(); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <Card>
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        <div className="text-sm text-slate-500">{filtered.length} exit record{filtered.length === 1 ? "" : "s"}</div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search exit records…" />
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="max-w-[140px]">
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
        </Select>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" />Add Exit Details</Button>
      </div>
      {error && <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Separation Date</th>
              <th className="px-4 py-3 font-medium">Interviewer</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Feedback</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No records found.</td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-900">{r.employee_name || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{r.separation_date}</td>
                <td className="px-4 py-3 text-slate-600">{r.interviewer_name || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{r.reason || "—"}</td>
                <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{r.feedback || "—"}</td>
                <td className="px-4 py-3">
                  <Select value={r.status} onChange={e => setStatus(r.id, e.target.value)} className="w-32 h-8 text-xs">
                    <option>Pending</option>
                    <option>Completed</option>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal
          title="Add Exit Details"
          onClose={() => setShowForm(false)}
          footer={<>
            <Button onClick={add} disabled={saving || !form.employee_id}>{saving ? "Saving…" : "Submit"}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </>}
        >
          <div className="grid grid-cols-2 gap-4">
            <ModalField label="Employee *">
              <Select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}>
                <option value="">Select</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </Select>
            </ModalField>
            <ModalField label="Separation Date">
              <Input type="date" value={form.separation_date} onChange={e => setForm(f => ({ ...f, separation_date: e.target.value }))}/>
            </ModalField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ModalField label="Interviewer">
              <Select value={form.interviewer_id} onChange={e => setForm(f => ({ ...f, interviewer_id: e.target.value }))}>
                <option value="">None</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </Select>
            </ModalField>
            <ModalField label="Reason for Leaving">
              <Input placeholder="Optional" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}/>
            </ModalField>
          </div>
          <ModalField label="Exit Feedback">
            <Textarea placeholder="Optional" value={form.feedback} onChange={e => setForm(f => ({ ...f, feedback: e.target.value }))} className="min-h-[80px]"/>
          </ModalField>
        </Modal>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    api.me().then(m => {
      if (!HR_ROLES.includes(m.role)) { setAllowed(false); router.replace("/dashboard"); }
      else setAllowed(true);
    }).catch(() => setAllowed(false));
  }, []);

  if (allowed !== true) {
    return (
      <>
        <Topbar title="Settings" />
        <div className="p-6 text-sm text-slate-500">
          {allowed === false ? "Redirecting…" : "Loading…"}
        </div>
      </>
    );
  }

  const service = SERVICES.find(s => s.key === active);

  if (service) {
    return (
      <>
        <Topbar title="Settings" />
        <div className="p-4 lg:p-6 space-y-4">
          <button
            onClick={() => setActive(null)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />Settings
          </button>
          <h2 className="text-xl font-semibold text-slate-900">{service.label}</h2>
          {service.key === "manage-accounts" && <UsersService />}
          {service.key === "leave-tracker" && <LeaveTrackerService />}
          {service.key === "employee-info" && <EmployeeInformationService />}
          {service.key === "shifts" && <ShiftsTab />}
          {service.key === "files" && <FilesService />}
          {service.key === "hr-letters" && <HrLettersService />}
          {service.key === "tasks" && <TasksService />}
          {service.key === "general" && <GeneralService />}
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Settings" />
      <div className="p-4 lg:p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Services</h2>
          <p className="text-sm text-slate-500">Organization-wide setup and configuration</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {SERVICES.map(s => (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-center hover:border-brand-300 hover:shadow-sm transition"
            >
              <div className="h-10 w-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center">
                <s.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
