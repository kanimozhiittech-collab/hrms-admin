"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, fileUrl } from "@/lib/api";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  company_admin: "Company Admin",
  hr_manager: "HR Manager",
  employee: "Employee",
};

function value(v: any) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

function Field({ label, value: fieldValue }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="break-words font-medium text-slate-900">{value(fieldValue)}</p>
    </div>
  );
}

export default function AccountPage() {
  const [me, setMe] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.me().then(setMe).catch(() => {}); }, []);
  useEffect(() => { api.getCompany().then(setCompany).catch(() => {}); }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }
    setSaving(true);
    try {
      await api.changeMyPassword({ current_password: currentPassword, new_password: newPassword });
      toast.success("Password updated");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Unable to update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar title="My Profile" />
      <div className="max-w-3xl space-y-4 p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" value={me?.email} />
            <Field label="Role" value={me ? ROLE_LABELS[me.role] ?? me.role : undefined} />
          </CardContent>
        </Card>

        {company && (
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-3">
                {company.logo_url && !logoFailed
                  ? <img src={fileUrl(company.logo_url)} alt="Logo" className="h-14 w-14 rounded-lg border border-slate-200 object-cover" onError={() => setLogoFailed(true)}/>
                  : <div className="grid h-14 w-14 place-items-center rounded-lg bg-slate-100 text-[10px] text-slate-300">No logo</div>}
                <p className="text-sm font-semibold text-slate-900">{company.name}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Website" value={company.website} />
                <Field label="Type of Organization" value={company.org_type} />
                <Field label="Contact Person" value={company.contact_person} />
                <Field label="Contact Number" value={company.contact_number} />
                <Field label="Alternate Contact Number" value={company.alt_contact_number} />
                <Field label="Contact Email" value={company.contact_email} />
                <Field label="GST Number" value={company.gst_number} />
                <Field label="PAN Number" value={company.pan_number} />
                <Field label="Address Line 1" value={company.address_line1} />
                <Field label="Address Line 2" value={company.address_line2} />
                <Field label="City" value={company.city} />
                <Field label="State" value={company.state} />
                <Field label="Country" value={company.country} />
                <Field label="ZIP/PIN Code" value={company.postal_code} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Current Password</Label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Update Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
