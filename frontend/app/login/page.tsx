"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { tokenStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@peoplepulse.io");
  const [password, setPassword] = useState("Admin@123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const r = await api.login(email, password);
      tokenStore.set(r.access_token);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-brand-700 to-brand-950 text-white p-12">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-white grid place-items-center p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo" className="h-full w-full object-contain"/>
          </div>
          <span className="text-xl font-semibold">HRMS</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">The modern HR platform<br/>for growing teams.</h1>
          <p className="mt-4 text-brand-100 max-w-md">Manage employees, attendance, payroll and more — all from one beautiful workspace.</p>
        </div>
        <div className="text-sm text-brand-200">© {new Date().getFullYear()} HRMS</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
            <p className="text-sm text-slate-500 mt-1">Use your work email to continue.</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(visible => !visible)}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-inset"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
          <p className="text-xs text-slate-500 text-center">
            Demo creds prefilled. <span className="font-medium">admin@peoplepulse.io / Admin@123</span>
          </p>
        </form>
      </div>
    </div>
  );
}
