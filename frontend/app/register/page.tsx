"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, Users } from "lucide-react";
import { superadmin, type Plan } from "@/lib/superadmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function parseModules(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function RegisterPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    superadmin.listPlans()
      .then((list) => setPlans(list.filter((p) => p.status === "active")))
      .catch((err) => toast.error(err.message || "Failed to load plans"));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (planId === null) { toast.error("Please select a plan"); return; }
    setLoading(true);
    try {
      const result = await superadmin.registerCompany({
        company_name: companyName,
        admin_name: adminName,
        admin_email: adminEmail,
        phone: phone || null,
        plan_id: planId,
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
          <p className="mt-4 text-brand-100 max-w-md">Pick a plan, register your company, and start managing employees, attendance and leave right away.</p>
        </div>
        <div className="text-sm text-brand-200">© {new Date().getFullYear()} HRMS</div>
      </div>

      <div className="flex items-center justify-center p-6 py-10">
        <form onSubmit={onSubmit} className="w-full max-w-lg space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Register your company</h2>
            <p className="text-sm text-slate-500 mt-1">Choose a plan and submit — we&apos;ll activate your account after review.</p>
          </div>

          <div>
            <Label>Select a plan</Label>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {plans.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPlanId(p.id)}
                  className={`rounded-lg border p-3 text-left transition ${
                    planId === p.id
                      ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{p.plan_name}</span>
                    {planId === p.id && <CheckCircle2 className="h-4 w-4 text-brand-600" />}
                  </div>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    ₹{Number(p.monthly_price).toLocaleString()}
                    <span className="text-xs font-normal text-slate-400"> /month</span>
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <Users className="h-3 w-3" />
                    Up to {p.max_employees >= 999999 ? "unlimited" : p.max_employees.toLocaleString()} employees
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                    {parseModules(p.included_modules).slice(0, 4).join(" · ")}
                  </p>
                </button>
              ))}
            </div>
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
              <Label htmlFor="adminEmail">Admin email</Label>
              <Input id="adminEmail" type="email" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="senthil@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
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
