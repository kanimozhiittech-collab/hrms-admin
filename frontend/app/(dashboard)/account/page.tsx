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

function nameOf(list: any[], id: string | null, field = "name") {
  return list.find((x) => x.id === id)?.[field];
}

const BLANK_PROFILE = { name: "", phone: "", address_line1: "", address_line2: "", city: "", state: "", country: "", postal_code: "" };

export default function AccountPage() {
  const [me, setMe] = useState<any>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [employee, setEmployee] = useState<any>(null);
  const [meta, setMeta] = useState<{ depts: any[]; desigs: any[]; locs: any[]; shifts: any[] }>({ depts: [], desigs: [], locs: [], shifts: [] });
  const [photoFailed, setPhotoFailed] = useState(false);
  const [profileForm, setProfileForm] = useState(BLANK_PROFILE);
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.me().then((m) => {
      setMe(m);
      setProfileForm({
        name: m.name || "", phone: m.phone || "",
        address_line1: m.address_line1 || "", address_line2: m.address_line2 || "",
        city: m.city || "", state: m.state || "", country: m.country || "", postal_code: m.postal_code || "",
      });
    }).catch(() => {}).finally(() => setMeLoading(false));
  }, []);
  useEffect(() => {
    Promise.all([api.departments(), api.designations(), api.locations(), api.shifts()])
      .then(([depts, desigs, locs, shifts]) => setMeta({ depts, desigs, locs, shifts }));
  }, []);
  useEffect(() => {
    if (me?.employee_id) api.getEmployee(me.employee_id).then(setEmployee).catch(() => {});
  }, [me?.employee_id]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await api.updateMe(profileForm);
      setMe(updated);
      toast.success("Profile updated");
    } catch (error: any) {
      toast.error(error.message || "Unable to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

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
      <div className="space-y-4 p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {meLoading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : (
              <>
                <Field label="Email" value={me?.email} />
                <Field label="Role" value={me ? ROLE_LABELS[me.role] ?? me.role : undefined} />
                <Field label="Status" value={me ? (me.is_active ? "Active" : "Inactive") : undefined} />
                <Field label="Member Since" value={me?.created_at ? new Date(me.created_at).toLocaleDateString() : undefined} />
              </>
            )}
          </CardContent>
        </Card>

        {me && !me.employee_id && (
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={profileForm.name} onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div />
                <div className="space-y-1.5">
                  <Label>Address Line 1</Label>
                  <Input value={profileForm.address_line1} onChange={(e) => setProfileForm((f) => ({ ...f, address_line1: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Address Line 2</Label>
                  <Input value={profileForm.address_line2} onChange={(e) => setProfileForm((f) => ({ ...f, address_line2: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={profileForm.city} onChange={(e) => setProfileForm((f) => ({ ...f, city: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input value={profileForm.state} onChange={(e) => setProfileForm((f) => ({ ...f, state: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input value={profileForm.country} onChange={(e) => setProfileForm((f) => ({ ...f, country: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>ZIP/PIN Code</Label>
                  <Input value={profileForm.postal_code} onChange={(e) => setProfileForm((f) => ({ ...f, postal_code: e.target.value }))} />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <Button type="submit" disabled={savingProfile}>
                    {savingProfile ? "Saving…" : "Save"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {employee && (
          <Card>
            <CardHeader>
              <CardTitle>My Employee Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-3">
                {employee.photo_url && !photoFailed
                  ? <img src={fileUrl(employee.photo_url)} alt="Photo" className="h-14 w-14 rounded-full border border-slate-200 object-cover" onError={() => setPhotoFailed(true)}/>
                  : <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-[10px] text-slate-300">No photo</div>}
                <div>
                  <p className="text-sm font-semibold text-slate-900">{employee.first_name} {employee.last_name}</p>
                  <p className="text-xs text-slate-500">{employee.emp_code} · {employee.work_email}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Gender" value={employee.gender} />
                <Field label="Date of Birth" value={employee.date_of_birth} />
                <Field label="Blood Group" value={employee.blood_group} />
                <Field label="Marital Status" value={employee.marital_status} />
                <Field label="Nationality" value={employee.nationality} />
                <Field label="Mobile" value={employee.mobile} />
                <Field label="Personal Email" value={employee.personal_email} />
                <Field label="Department" value={nameOf(meta.depts, employee.department_id)} />
                <Field label="Designation" value={nameOf(meta.desigs, employee.designation_id, "title")} />
                <Field label="Employee Type" value={employee.employee_type} />
                <Field label="Date of Joining" value={employee.date_of_joining} />
                <Field label="Work Location" value={nameOf(meta.locs, employee.work_location_id)} />
                <Field label="Shift" value={nameOf(meta.shifts, employee.shift_id)} />
                <Field label="Status" value={employee.status} />
              </div>
              <div className="mt-4">
                <a href={`/employees/${employee.id}`} className="text-sm text-brand-600 hover:underline">
                  View full employee profile (address, bank, documents, education, experience) →
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="grid max-w-xl gap-4 sm:grid-cols-2">
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
