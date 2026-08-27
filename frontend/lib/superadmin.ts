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
  gst_number?: string | null;
  pan_number?: string | null;
  address?: string | null;
  locations?: string | null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    // HTTP/2 (which Vercel serves over) has no reason phrase, so statusText
    // is always "" there — without this fallback, a non-JSON error response
    // leaves msg as an empty string, and the resulting toast shows blank.
    let msg = res.statusText || `Request failed (${res.status})`;
    try {
      const j = await res.json();
      // FastAPI's own validation errors (422) come back as detail: [{loc, msg}, ...]
      // rather than a plain string — join those into something readable.
      msg = Array.isArray(j.detail)
        ? j.detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ")
        : j.detail || msg;
    } catch {}
    if (!msg) msg = `Request failed (${res.status})`;
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
