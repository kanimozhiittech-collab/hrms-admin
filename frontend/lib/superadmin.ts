const BASE = process.env.NEXT_PUBLIC_SUPERADMIN_API_URL || "https://hrms-gamma-one.vercel.app/api/backend";

export interface Plan {
  id: number;
  plan_name: string;
  monthly_price: string;
  max_employees: number;
  included_modules: string | null;
  trial_period_days: number;
  status: string;
}

export interface CompanyRegisterInput {
  company_name: string;
  admin_name: string;
  admin_email: string;
  phone?: string | null;
  plan_id: number;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.detail || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export interface CompanyRegisterResult {
  id: number;
  admin_email: string;
  temp_password: string;
}

export const superadmin = {
  listPlans: () => request<Plan[]>("/plans"),
  registerCompany: (data: CompanyRegisterInput) =>
    request<CompanyRegisterResult>("/companies/register", { method: "POST", body: JSON.stringify(data) }),
};
