"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2 } from "lucide-react";
import { superadmin, type Plan } from "@/lib/superadmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function RegisterPage() {
  // No plan picker here — a self-registered company starts on the default
  // (cheapest active) plan; the Super Admin can change it after approval.
  const [defaultPlanId, setDefaultPlanId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [address, setAddress] = useState("");
  const [locations, setLocations] = useState("");
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    superadmin.listPlans()
      .then((list) => {
        const active = list.filter((p) => p.status === "active");
        const cheapest = active.sort((a, b) => Number(a.monthly_price) - Number(b.monthly_price))[0];
        if (cheapest) setDefaultPlanId(cheapest.id);
        else toast.error("No plan is available for registration — contact support.");
      })
      .catch((err) => toast.error(err.message || "Failed to load plans"));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (defaultPlanId === null) { toast.error("No plan is available for registration — contact support."); return; }
    setLoading(true);
    try {
      const result = await superadmin.registerCompany({
        company_name: companyName,
        admin_name: adminName,
        admin_email: adminEmail,
        phone: phone || null,
        plan_id: defaultPlanId,
        gst_number: gstNumber || null,
        pan_number: panNumber || null,
        address: address || null,
        locations: locations || null,
      });
      setTempPassword(result.temp_password);
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (tempPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-brand-600 mx-auto" />
          <h1 className="text-2xl font-semibold text-slate-900">You&apos;re all set!</h1>
          <p className="text-sm text-slate-500">
            <span className="font-medium">{companyName}</span> is ready to go. Log in with:
          </p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm">
            <p className="text-slate-500">Email</p>
            <p className="font-medium text-slate-900">{adminEmail}</p>
            <p className="mt-2 text-slate-500">Temporary password</p>
            <p className="font-medium text-slate-900">{tempPassword}</p>
          </div>
          <Link href="/login">
            <Button className="w-full">Sign in now</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-brand-700 to-brand-950 text-white p-12">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-white/10 grid place-items-center"><Building2 className="h-6 w-6"/></div>
          <span className="text-xl font-semibold">HRMS</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Get your team<br/>set up in minutes.</h1>
          <p className="mt-4 text-brand-100 max-w-md">Register your company and start managing employees, attendance and leave right away.</p>
        </div>
        <div className="text-sm text-brand-200">© {new Date().getFullYear()} HRMS</div>
      </div>

      <div className="flex items-center justify-center p-6 py-10">
        <form onSubmit={onSubmit} className="w-full max-w-lg space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Register your company</h2>
            <p className="text-sm text-slate-500 mt-1">Tell us about your company and we&apos;ll activate your account right away.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Company name</Label>
              <Input id="companyName" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Erode Spinners Pvt Ltd" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adminName">Admin name</Label>
              <Input id="adminName" required value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Senthil Kumar" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adminEmail">Company email</Label>
              <Input id="adminEmail" type="email" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value.toLowerCase())} placeholder="senthil@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone (10 digits)</Label>
              <Input
                id="phone" required type="tel" inputMode="numeric" maxLength={10}
                pattern="\d{10}" title="Enter exactly 10 digits"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstNumber">GST Number (optional)</Label>
              <Input id="gstNumber" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="panNumber">PAN Number (optional)</Label>
              <Input id="panNumber" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} placeholder="AAAAA0000A" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Address (optional)</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Company address" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="locations">Locations (optional)</Label>
              <Input id="locations" value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Chennai, Coimbatore, Bengaluru" />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Submitting…" : "Register company"}
          </Button>
          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand-600 underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
