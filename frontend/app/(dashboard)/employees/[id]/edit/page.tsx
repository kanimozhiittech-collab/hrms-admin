"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { api } from "@/lib/api";
import { EmployeeForm, employeeToFormValues, type EmployeeFormValues } from "../../EmployeeForm";

export default function EditEmployeePage() {
  const params = useParams<{ id: string }>();
  const employeeId = params.id;
  const [initialValues, setInitialValues] = useState<EmployeeFormValues | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!employeeId) return;
    api.getEmployee(employeeId)
      .then(emp => setInitialValues(employeeToFormValues(emp)))
      .catch(e => setError(e.message || "Unable to load employee"));
  }, [employeeId]);

  if (error) {
    return (
      <>
        <Topbar title="Edit Employee" />
        <div className="p-6 text-sm text-red-600">{error}</div>
      </>
    );
  }

  if (!initialValues) {
    return (
      <>
        <Topbar title="Edit Employee" />
        <div className="p-6 text-sm text-slate-500">Loading…</div>
      </>
    );
  }

  return <EmployeeForm mode="edit" employeeId={employeeId} initialValues={initialValues} />;
}
