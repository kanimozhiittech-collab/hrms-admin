"use client";
import { tokenStore } from "./auth";

const BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const isFormData = init.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.detail || msg; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/api/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    }),
  me: () => request<any>("/api/auth/me"),

  dashboard: () => request<any>("/api/dashboard"),
  dashboardOverview: () => request<any>("/api/dashboard/overview"),
  checkIn: () => request<any>("/api/dashboard/check-in", { method: "POST" }),

  listEmployees: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") q.set(k, String(v)); });
    return request<any>(`/api/employees?${q.toString()}`);
  },
  createEmployee: (data: any) => request<any>("/api/employees", { method: "POST", body: JSON.stringify(data) }),
  getEmployee: (id: string) => request<any>(`/api/employees/${id}`),
  uploadEmployeeDocument: (id: string, docType: string, file: File) => {
    const form = new FormData();
    form.append("doc_type", docType);
    form.append("file", file);
    return request<any>(`/api/employees/${id}/documents`, { method: "POST", body: form });
  },

  departments: () => request<any[]>("/api/meta/departments"),
  designations: () => request<any[]>("/api/meta/designations"),
  locations: () => request<any[]>("/api/meta/locations"),
  shifts: () => request<any[]>("/api/meta/shifts"),

  // ── Attendance ──
  myAttendance: (month?: number, year?: number) => {
    const q = new URLSearchParams();
    if (month) q.set("month", String(month));
    if (year) q.set("year", String(year));
    return request<any[]>(`/api/attendance/my?${q.toString()}`);
  },
  myAttendanceSummary: (month?: number, year?: number) => {
    const q = new URLSearchParams();
    if (month) q.set("month", String(month));
    if (year) q.set("year", String(year));
    return request<any>(`/api/attendance/my/summary?${q.toString()}`);
  },
  teamAttendance: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") q.set(k, String(v)); });
    return request<any[]>(`/api/attendance?${q.toString()}`);
  },
  attendanceReportUrl: (month: number, year: number) =>
    `${BASE}/api/attendance/report?month=${month}&year=${year}`,
  createRegularization: (data: any) =>
    request<any>("/api/attendance/regularize", { method: "POST", body: JSON.stringify(data) }),
  listRegularizations: (scope = "my") =>
    request<any[]>(`/api/attendance/regularize?scope=${scope}`),
  approveRegularization: (id: string, comment?: string) =>
    request<any>(`/api/attendance/regularize/${id}/approve`, { method: "PUT", body: JSON.stringify({ comment }) }),
  rejectRegularization: (id: string, comment?: string) =>
    request<any>(`/api/attendance/regularize/${id}/reject`, { method: "PUT", body: JSON.stringify({ comment }) }),

  // ── Holidays ──
  holidays: (year?: number) => request<any[]>(`/api/meta/holidays${year ? `?year=${year}` : ""}`),
  createHoliday: (data: any) => request<any>("/api/meta/holidays", { method: "POST", body: JSON.stringify(data) }),
  deleteHoliday: (id: string) => request<void>(`/api/meta/holidays/${id}`, { method: "DELETE" }),

  // ── Leave ──
  leaveTypes: () => request<any[]>("/api/leave/types"),
  createLeaveType: (data: any) => request<any>("/api/leave/types", { method: "POST", body: JSON.stringify(data) }),
  updateLeaveType: (id: string, data: any) =>
    request<any>(`/api/leave/types/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  leaveBalance: (year?: number) => request<any[]>(`/api/leave/balance${year ? `?year=${year}` : ""}`),
  applyLeave: (data: any) => request<any>("/api/leave/requests", { method: "POST", body: JSON.stringify(data) }),
  myLeaveRequests: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") q.set(k, String(v)); });
    return request<any[]>(`/api/leave/requests?${q.toString()}`);
  },
  teamLeaveRequests: (status = "pending") =>
    request<any[]>(`/api/leave/requests/team?status=${status}`),
  approveLeave: (id: string, comment?: string) =>
    request<any>(`/api/leave/requests/${id}/approve`, { method: "PUT", body: JSON.stringify({ comment }) }),
  rejectLeave: (id: string, comment?: string) =>
    request<any>(`/api/leave/requests/${id}/reject`, { method: "PUT", body: JSON.stringify({ comment }) }),
  cancelLeave: (id: string) =>
    request<any>(`/api/leave/requests/${id}/cancel`, { method: "PUT" }),
  leaveCalendar: (month?: number, year?: number) => {
    const q = new URLSearchParams();
    if (month) q.set("month", String(month));
    if (year) q.set("year", String(year));
    return request<any[]>(`/api/leave/calendar?${q.toString()}`);
  },
};
