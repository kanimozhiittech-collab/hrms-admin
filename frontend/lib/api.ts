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
  updateEmployee: (id: string, data: any) => request<any>(`/api/employees/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  uploadEmployeeDocument: (id: string, docType: string, file: File) => {
    const form = new FormData();
    form.append("doc_type", docType);
    form.append("file", file);
    return request<any>(`/api/employees/${id}/documents`, { method: "POST", body: form });
  },

  // ── Files ──
  listFiles: () => request<any[]>("/api/files"),
  uploadFile: (name: string, description: string, folder: string, file: File) => {
    const form = new FormData();
    form.append("name", name);
    form.append("description", description);
    form.append("folder", folder);
    form.append("file", file);
    return request<any>("/api/files", { method: "POST", body: form });
  },
  deleteFile: (id: string) => request<void>(`/api/files/${id}`, { method: "DELETE" }),

  // ── HR Letters ──
  listLetters: () => request<any[]>("/api/letters"),
  createLetter: (data: any) => request<any>("/api/letters", { method: "POST", body: JSON.stringify(data) }),
  updateLetterStatus: (id: string, status: string) =>
    request<any>(`/api/letters/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),

  // ── Tasks ──
  listHrTasks: () => request<any[]>("/api/hr-tasks"),
  createHrTask: (data: any) => request<any>("/api/hr-tasks", { method: "POST", body: JSON.stringify(data) }),
  updateHrTaskStatus: (id: string, status: string) =>
    request<any>(`/api/hr-tasks/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  deleteHrTask: (id: string) => request<void>(`/api/hr-tasks/${id}`, { method: "DELETE" }),

  // ── General / Exit Details ──
  listExitDetails: () => request<any[]>("/api/exit-details"),
  createExitDetail: (data: any) => request<any>("/api/exit-details", { method: "POST", body: JSON.stringify(data) }),
  updateExitStatus: (id: string, status: string) =>
    request<any>(`/api/exit-details/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),

  getCompany: () => request<any>("/api/company"),
  updateCompany: (data: any) => request<any>("/api/company", { method: "PUT", body: JSON.stringify(data) }),
  uploadCompanyLogo: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<any>("/api/company/logo", { method: "POST", body: form });
  },

  listUsers: () => request<any[]>("/api/users"),
  createUser: (data: any) => request<any>("/api/users", { method: "POST", body: JSON.stringify(data) }),
  updateUserRole: (id: string, role: string) => request<any>(`/api/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) }),
  updateUserProfile: (id: string, data: { email: string; employee_id: string | null }) =>
    request<any>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  toggleUserActive: (id: string) => request<any>(`/api/users/${id}/toggle`, { method: "PUT" }),

  departments: () => request<any[]>("/api/meta/departments"),
  createDepartment: (data: any) => request<any>("/api/meta/departments", { method: "POST", body: JSON.stringify(data) }),
  updateDepartment: (id: string, data: any) => request<any>(`/api/meta/departments/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDepartment: (id: string) => request<void>(`/api/meta/departments/${id}`, { method: "DELETE" }),
  departmentEmployeeCount: (id: string) => request<{ employee_count: number }>(`/api/meta/departments/${id}/employee-count`),
  reassignDepartmentEmployees: (id: string, toDepartmentId: string | null) =>
    request<void>(`/api/meta/departments/${id}/reassign`, { method: "PUT", body: JSON.stringify({ to_department_id: toDepartmentId }) }),

  designations: () => request<any[]>("/api/meta/designations"),
  createDesignation: (data: any) => request<any>("/api/meta/designations", { method: "POST", body: JSON.stringify(data) }),
  updateDesignation: (id: string, data: any) => request<any>(`/api/meta/designations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDesignation: (id: string) => request<void>(`/api/meta/designations/${id}`, { method: "DELETE" }),
  designationEmployeeCount: (id: string) => request<{ employee_count: number }>(`/api/meta/designations/${id}/employee-count`),
  reassignDesignationEmployees: (id: string, toDesignationId: string | null) =>
    request<void>(`/api/meta/designations/${id}/reassign`, { method: "PUT", body: JSON.stringify({ to_designation_id: toDesignationId }) }),

  locations: () => request<any[]>("/api/meta/locations"),
  createLocation: (data: any) => request<any>("/api/meta/locations", { method: "POST", body: JSON.stringify(data) }),
  updateLocation: (id: string, data: any) => request<any>(`/api/meta/locations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteLocation: (id: string) => request<void>(`/api/meta/locations/${id}`, { method: "DELETE" }),

  shifts: () => request<any[]>("/api/meta/shifts"),
  createShift: (data: any) => request<any>("/api/meta/shifts", { method: "POST", body: JSON.stringify(data) }),
  updateShift: (id: string, data: any) => request<any>(`/api/meta/shifts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteShift: (id: string) => request<void>(`/api/meta/shifts/${id}`, { method: "DELETE" }),

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
  employeeLeaveBalance: (employeeId: string, year?: number) =>
    request<any[]>(`/api/leave/balance/${employeeId}${year ? `?year=${year}` : ""}`),
  adjustLeaveBalance: (employeeId: string, leaveTypeId: string, allocated: number, year?: number) =>
    request<any>(`/api/leave/balance/${employeeId}/${leaveTypeId}`, {
      method: "PUT", body: JSON.stringify({ allocated, year }),
    }),
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
