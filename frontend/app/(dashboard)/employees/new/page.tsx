"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EmployeeForm } from "../EmployeeForm";

function NewEmployeePageInner() {
  const searchParams = useSearchParams();
  const linkUserId = searchParams.get("link_user_id") || undefined;
  const defaultEmail = searchParams.get("email") || undefined;
  return <EmployeeForm mode="create" linkUserId={linkUserId} defaultEmail={defaultEmail} />;
}

export default function NewEmployeePage() {
  return (
    <Suspense fallback={null}>
      <NewEmployeePageInner />
    </Suspense>
  );
}
