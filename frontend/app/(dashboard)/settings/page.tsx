"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { Plus, Trash2, Check, X, Pencil } from "lucide-react";

const HR_ROLES = ["super_admin", "company_admin", "hr_manager"];

function MasterTab({
  fetchAll, onCreate, onUpdate, onDelete, field, label, placeholder,
}: {
  fetchAll: () => Promise<any[]>;
  onCreate: (value: string) => Promise<any>;
  onUpdate: (id: string, value: string) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  field: string;
  label: string;
  placeholder: string;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try { setItems(await fetchAll()); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!newValue.trim()) return;
    setSaving(true); setError("");
    try { await onCreate(newValue.trim()); setNewValue(""); await load(); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function saveEdit(id: string) {
    if (!editValue.trim()) return;
    setError("");
    try { await onUpdate(id, editValue.trim()); setEditingId(null); await load(); }
    catch (e: any) { setError(e.message); }
  }

  async function remove(id: string) {
    if (!confirm(`Delete this ${label.toLowerCase()}?`)) return;
    setError("");
    try { await onDelete(id); await load(); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <Card>
      <div className="p-4 flex gap-2 border-b border-slate-100">
        <Input
          placeholder={placeholder}
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          className="max-w-xs"
        />
        <Button size="sm" onClick={add} disabled={saving || !newValue.trim()}>
          <Plus className="h-4 w-4" />Add {label}
        </Button>
      </div>
      {error && <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">{error}</div>}
      <div className="divide-y divide-slate-100">
        {loading && <div className="px-4 py-10 text-center text-sm text-slate-400">Loading…</div>}
        {!loading && items.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-400">No {label.toLowerCase()}s yet.</div>
        )}
        {items.map(item => (
          <div key={item.id} className="px-4 py-3 flex items-center gap-3">
            {editingId === item.id ? (
              <>
                <Input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveEdit(item.id)}
                  className="max-w-xs"
                  autoFocus
                />
                <button onClick={() => saveEdit(item.id)} className="text-green-600 hover:text-green-700">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-slate-900">{item[field]}</span>
                <button
                  onClick={() => { setEditingId(item.id); setEditValue(item[field]); }}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => remove(item.id)} className="text-slate-400 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function ShiftsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", start_time: "09:00", end_time: "18:00" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try { setItems(await api.shifts()); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!form.name.trim()) return;
    setSaving(true); setError("");
    try { await api.createShift(form); setForm({ name: "", start_time: "09:00", end_time: "18:00" }); await load(); }
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
      <div className="p-4 flex flex-wrap items-end gap-2 border-b border-slate-100">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Shift name</label>
          <Input
            placeholder="e.g. General Shift"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-48"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Start time</label>
          <Input
            type="time"
            value={form.start_time}
            onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
            className="w-32"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">End time</label>
          <Input
            type="time"
            value={form.end_time}
            onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
            className="w-32"
          />
        </div>
        <Button size="sm" onClick={add} disabled={saving || !form.name.trim()}>
          <Plus className="h-4 w-4" />Add Shift
        </Button>
      </div>
      {error && <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">{error}</div>}
      <div className="divide-y divide-slate-100">
        {loading && <div className="px-4 py-10 text-center text-sm text-slate-400">Loading…</div>}
        {!loading && items.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-400">No shifts yet.</div>
        )}
        {items.map(s => (
          <div key={s.id} className="px-4 py-3 flex items-center gap-3">
            <span className="flex-1 text-sm text-slate-900">{s.name}</span>
            <span className="text-xs text-slate-500 font-mono">{s.start_time} – {s.end_time}</span>
            <button onClick={() => remove(s.id)} className="text-slate-400 hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

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

  return (
    <>
      <Topbar title="Settings" />
      <div className="p-4 lg:p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Organization Setup</h2>
          <p className="text-sm text-slate-500">Manage departments, designations, work locations and shifts</p>
        </div>
        <Tabs defaultValue="departments">
          <TabsList>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="designations">Designations</TabsTrigger>
            <TabsTrigger value="locations">Work Locations</TabsTrigger>
            <TabsTrigger value="shifts">Shifts</TabsTrigger>
          </TabsList>
          <TabsContent value="departments">
            <MasterTab
              fetchAll={api.departments}
              onCreate={name => api.createDepartment({ name })}
              onUpdate={(id, name) => api.updateDepartment(id, { name })}
              onDelete={api.deleteDepartment}
              field="name" label="Department" placeholder="e.g. Engineering"
            />
          </TabsContent>
          <TabsContent value="designations">
            <MasterTab
              fetchAll={api.designations}
              onCreate={title => api.createDesignation({ title })}
              onUpdate={(id, title) => api.updateDesignation(id, { title })}
              onDelete={api.deleteDesignation}
              field="title" label="Designation" placeholder="e.g. Software Engineer"
            />
          </TabsContent>
          <TabsContent value="locations">
            <MasterTab
              fetchAll={api.locations}
              onCreate={name => api.createLocation({ name })}
              onUpdate={(id, name) => api.updateLocation(id, { name })}
              onDelete={api.deleteLocation}
              field="name" label="Location" placeholder="e.g. Chennai Office"
            />
          </TabsContent>
          <TabsContent value="shifts">
            <ShiftsTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
