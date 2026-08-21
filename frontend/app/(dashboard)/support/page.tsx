"use client";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Plus, X, LifeBuoy } from "lucide-react";

const STATUS_TONE: Record<string, any> = {
  open: "amber", in_progress: "blue", resolved: "green", closed: "slate",
};
const PRIORITY_TONE: Record<string, any> = {
  low: "slate", medium: "amber", high: "red",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRaise, setShowRaise] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try { setTickets(await api.listSupportTickets()); }
    catch (e: any) { setError(e.message || "Unable to load support tickets"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <>
      <Topbar title="Support" />
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Support Tickets</h2>
            <p className="text-sm text-slate-500">Raise an issue and track its status</p>
          </div>
          <Button onClick={() => setShowRaise(true)}><Plus className="h-4 w-4" />Raise Ticket</Button>
        </div>

        {error && <div className="text-sm rounded-md px-3 py-2 bg-red-50 text-red-700">{error}</div>}

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Raised</th>
                  <th className="px-4 py-3 font-medium">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>}
                {!loading && tickets.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-16 text-center text-slate-400">
                    <LifeBuoy className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    No support tickets raised yet.
                  </td></tr>
                )}
                {tickets.map((t: any) => (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{t.subject}</div>
                      {t.description && <div className="text-xs text-slate-500 mt-0.5 max-w-md truncate">{t.description}</div>}
                    </td>
                    <td className="px-4 py-3"><Badge tone={PRIORITY_TONE[t.priority] || "slate"}>{t.priority}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[t.status] || "slate"}>{t.status.replace("_", " ")}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(t.created_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{t.resolved_at ? fmtDate(t.resolved_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {showRaise && (
        <RaiseTicketModal
          onClose={() => setShowRaise(false)}
          onDone={() => { setShowRaise(false); load(); }}
        />
      )}
    </>
  );
}

function RaiseTicketModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ subject: "", description: "", priority: "medium" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      await api.createSupportTicket(form);
      onDone();
    } catch (e: any) {
      setErr(e.message || "Failed to raise ticket.");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 grid place-items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e: any) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Raise a Support Ticket</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600">Subject</label>
            <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required placeholder="Short summary of the issue" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Priority</label>
            <Select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Description</label>
            <Textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue in detail" />
          </div>
          {err && <div className="text-sm rounded-md px-3 py-2 bg-red-50 text-red-700">{err}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy || !form.subject.trim()}>{busy ? "Submitting…" : "Submit Ticket"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
