import Link from "next/link";
import { Building2, Users, Calendar, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Users, title: "Employee Directory", desc: "Manage every employee's profile, documents and role in one place." },
  { icon: ClipboardCheck, title: "Attendance", desc: "Check-ins, regularization and reports without spreadsheets." },
  { icon: Calendar, title: "Leave Management", desc: "Leave types, balances and approvals your team will actually use." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-brand-600 grid place-items-center text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold text-slate-900">HRMS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"><Button variant="ghost">Sign in</Button></Link>
          <Link href="/register"><Button>Register your company</Button></Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
          The modern HR platform<br />for growing teams.
        </h1>
        <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto">
          Employees, attendance, leave and more — all from one beautiful workspace.
          Get your company set up in minutes.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/register"><Button size="lg">Register your company</Button></Link>
          <Link href="/login"><Button size="lg" variant="outline">Sign in</Button></Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20 grid gap-6 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-slate-200 p-6 shadow-soft">
            <div className="h-10 w-10 rounded-lg bg-brand-50 grid place-items-center text-brand-600">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-100 py-6 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} HRMS
      </footer>
    </div>
  );
}
