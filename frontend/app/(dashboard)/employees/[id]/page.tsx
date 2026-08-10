"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, FileText, Upload } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";

const DOC_TYPES = ["Aadhaar", "PAN", "Passport", "Resume", "OfferLetter", "Certificate", "Other"];

function value(v: any) {
  return v === null || v === undefined || v === "" ? "-" : String(v);
}

function Field({ label, value: fieldValue }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="break-words font-medium text-slate-900">{value(fieldValue)}</p>
    </div>
  );
}

function Section({
  title,
  fields,
}: {
  title: string;
  fields: Array<[string, any]>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-3">
          {fields.map(([label, fieldValue]) => (
            <Field key={label} label={label} value={fieldValue} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const employeeId = params.id;
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState("Aadhaar");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [meta, setMeta] = useState<{depts: any[]; desigs: any[]; locs: any[]; shifts: any[]; allEmployees: any[]}>(
    { depts: [], desigs: [], locs: [], shifts: [], allEmployees: [] }
  );
  const [managerId, setManagerId] = useState("");
  const [savingManager, setSavingManager] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const emp = await api.getEmployee(employeeId);
      setEmployee(emp);
      setManagerId(emp.reporting_manager_id || "");
    } catch (error: any) {
      toast.error(error.message || "Unable to load employee");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (employeeId) load();
  }, [employeeId]);

  useEffect(() => {
    Promise.all([api.departments(), api.designations(), api.locations(), api.shifts(), api.listEmployees({ page_size: 100 })])
      .then(([depts, desigs, locs, shifts, empRes]) => setMeta({ depts, desigs, locs, shifts, allEmployees: empRes.items || [] }));
  }, []);

  function nameOf(list: any[], id: string | null, field = "name") {
    if (!id) return null;
    const found = list.find(x => x.id === id);
    return found ? found[field] : null;
  }

  const manager = employee?.reporting_manager_id
    ? meta.allEmployees.find(m => m.id === employee.reporting_manager_id)
    : null;
  const directReports = meta.allEmployees.filter(m => m.id !== employeeId && m.reporting_manager_id === employeeId);

  async function saveManager() {
    if (!employee) return;
    setSavingManager(true);
    try {
      const { id, documents, created_at, updated_at, ...body } = employee;
      await api.updateEmployee(employeeId, { ...body, reporting_manager_id: managerId || null });
      toast.success("Reporting manager updated");
      await load();
    } catch (error: any) {
      toast.error(error.message || "Unable to update reporting manager");
    } finally {
      setSavingManager(false);
    }
  }

  async function uploadDocument() {
    if (!file) {
      toast.error("Choose a file first");
      return;
    }
    setUploading(true);
    try {
      await api.uploadEmployeeDocument(employeeId, docType, file);
      toast.success("Document uploaded");
      setFile(null);
      const input = document.getElementById("employee-document-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await load();
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Topbar title="Employee Details" />
      <div className="space-y-4 p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/employees" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" />
              Back to employees
            </Link>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {loading ? "Loading..." : `${employee?.first_name ?? ""} ${employee?.last_name ?? ""}`}
            </h2>
            {employee && <p className="text-sm text-slate-500">{employee.emp_code} · {employee.work_email}</p>}
          </div>
        </div>

        {employee && (
          <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
            <div className="space-y-4">
              <Section
                title="Personal"
                fields={[
                  ["Employee ID", employee.emp_code],
                  ["Prefix", employee.prefix],
                  ["First Name", employee.first_name],
                  ["Middle Name", employee.middle_name],
                  ["Last Name", employee.last_name],
                  ["Display Name", employee.display_name],
                  ["Gender", employee.gender],
                  ["Date of Birth", employee.date_of_birth],
                  ["Blood Group", employee.blood_group],
                  ["Marital Status", employee.marital_status],
                  ["Nationality", employee.nationality],
                  ["Photo URL", employee.photo_url],
                ]}
              />

              <Section
                title="Contact"
                fields={[
                  ["Work Email", employee.work_email],
                  ["Personal Email", employee.personal_email],
                  ["Mobile", employee.mobile],
                  ["Alternate Phone", employee.alt_phone],
                ]}
              />

              <Section
                title="Job"
                fields={[
                  ["Department", nameOf(meta.depts, employee.department_id)],
                  ["Designation", nameOf(meta.desigs, employee.designation_id, "title")],
                  ["Employee Type", employee.employee_type],
                  ["Date of Joining", employee.date_of_joining],
                  ["Probation End Date", employee.probation_end_date],
                  ["Confirmation Date", employee.confirmation_date],
                  ["Work Location", nameOf(meta.locs, employee.work_location_id)],
                  ["Shift", nameOf(meta.shifts, employee.shift_id)],
                  ["Source of Hire", employee.source_of_hire],
                  ["Tags", employee.tags],
                  ["Status", employee.status],
                  ["Exit Date", employee.exit_date],
                ]}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Reporting Manager &amp; Team</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-1.5">
                      <Label>Reporting Manager</Label>
                      <Select value={managerId} onChange={(event) => setManagerId(event.target.value)}>
                        <option value="">— None —</option>
                        {meta.allEmployees.filter(m => m.id !== employeeId).map(m => (
                          <option key={m.id} value={m.id}>{m.emp_code} - {m.first_name} {m.last_name}</option>
                        ))}
                      </Select>
                    </div>
                    <Button
                      type="button"
                      onClick={saveManager}
                      disabled={savingManager || managerId === (employee.reporting_manager_id || "")}
                    >
                      {savingManager ? "Saving..." : "Save"}
                    </Button>
                  </div>
                  {manager && (
                    <p className="text-xs text-slate-500">
                      Currently reports to <span className="font-medium text-slate-700">{manager.first_name} {manager.last_name}</span>.
                    </p>
                  )}

                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-500">Direct Reports ({directReports.length})</p>
                    {directReports.length ? (
                      <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
                        {directReports.map(r => (
                          <Link
                            key={r.id}
                            href={`/employees/${r.id}`}
                            className="flex items-center justify-between p-3 text-sm hover:bg-slate-50"
                          >
                            <span className="font-medium text-slate-900">{r.first_name} {r.last_name}</span>
                            <span className="text-xs text-slate-500">{r.designation || r.emp_code}</span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <EmptyBlock text="No one reports to this employee yet." />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Section
                title="Compensation"
                fields={[
                  ["CTC", employee.ctc],
                  ["Pay Frequency", employee.pay_frequency],
                ]}
              />

              <Section
                title="Bank"
                fields={[
                  ["Bank Name", employee.bank_name],
                  ["Account Number", employee.bank_account_no],
                  ["IFSC", employee.bank_ifsc],
                  ["Branch", employee.bank_branch],
                  ["Account Type", employee.bank_account_type],
                ]}
              />

              <Section
                title="Statutory"
                fields={[
                  ["PAN", employee.pan_number],
                  ["Aadhaar", employee.aadhaar_number],
                  ["UAN", employee.uan_number],
                  ["PF Number", employee.pf_number],
                  ["ESI Number", employee.esi_number],
                  ["Passport Number", employee.passport_number],
                  ["Passport Expiry", employee.passport_expiry],
                ]}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Addresses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {employee.addresses?.length ? employee.addresses.map((address: any, index: number) => (
                    <div key={index} className="rounded-md border border-slate-200 p-4">
                      <div className="mb-3 text-sm font-semibold text-slate-900">{address.address_type || `Address ${index + 1}`}</div>
                      <div className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-3">
                        <Field label="Line 1" value={address.line1} />
                        <Field label="Line 2" value={address.line2} />
                        <Field label="City" value={address.city} />
                        <Field label="State" value={address.state} />
                        <Field label="Country" value={address.country} />
                        <Field label="Pincode" value={address.pincode} />
                      </div>
                    </div>
                  )) : <EmptyBlock text="No addresses added." />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Education</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {employee.education?.length ? employee.education.map((item: any, index: number) => (
                    <div key={index} className="rounded-md border border-slate-200 p-4">
                      <div className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-3">
                        <Field label="Institute" value={item.institute} />
                        <Field label="Degree" value={item.degree} />
                        <Field label="Specialization" value={item.specialization} />
                        <Field label="From Year" value={item.year_from} />
                        <Field label="To Year" value={item.year_to} />
                        <Field label="Grade" value={item.grade} />
                      </div>
                    </div>
                  )) : <EmptyBlock text="No education records added." />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Experience</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {employee.experience?.length ? employee.experience.map((item: any, index: number) => (
                    <div key={index} className="rounded-md border border-slate-200 p-4">
                      <div className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-3">
                        <Field label="Company" value={item.company_name} />
                        <Field label="Designation" value={item.designation} />
                        <Field label="From Date" value={item.from_date} />
                        <Field label="To Date" value={item.to_date} />
                        <div className="md:col-span-2 xl:col-span-3">
                          <Field label="Description" value={item.description} />
                        </div>
                      </div>
                    </div>
                  )) : <EmptyBlock text="No experience records added." />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dependents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {employee.dependents?.length ? employee.dependents.map((item: any, index: number) => (
                    <div key={index} className="rounded-md border border-slate-200 p-4">
                      <div className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-3">
                        <Field label="Name" value={item.name} />
                        <Field label="Relationship" value={item.relationship_type} />
                        <Field label="Date of Birth" value={item.date_of_birth} />
                        <Field label="Gender" value={item.gender} />
                        <Field label="Is Dependent" value={item.is_dependent ? "Yes" : "No"} />
                      </div>
                    </div>
                  )) : <EmptyBlock text="No dependents added." />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contacts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {employee.emergency_contacts?.length ? employee.emergency_contacts.map((item: any, index: number) => (
                    <div key={index} className="rounded-md border border-slate-200 p-4">
                      <div className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-3">
                        <Field label="Name" value={item.name} />
                        <Field label="Relationship" value={item.relationship_type} />
                        <Field label="Mobile" value={item.mobile} />
                        <Field label="Address" value={item.address} />
                      </div>
                    </div>
                  )) : <EmptyBlock text="No emergency contacts added." />}
                </CardContent>
              </Card>

              <Section
                title="Notes"
                fields={[
                  ["Notes", employee.notes],
                  ["Created At", employee.created_at],
                  ["Updated At", employee.updated_at],
                ]}
              />
            </div>

            <div className="space-y-4">
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle>Upload Document</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Document Type</Label>
                    <Select value={docType} onChange={(event) => setDocType(event.target.value)}>
                      {DOC_TYPES.map((type) => <option key={type}>{type}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>File</Label>
                    <input
                      id="employee-document-file"
                      type="file"
                      className="sr-only"
                      onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    />
                    <label
                      htmlFor="employee-document-file"
                      className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-200 p-6 text-center transition hover:border-brand-400 hover:bg-brand-50/40"
                    >
                      <Upload className="h-8 w-8 text-slate-400" />
                      <span className="mt-2 text-sm font-medium text-slate-700">
                        {file ? file.name : "Click to choose a document"}
                      </span>
                      <span className="mt-1 text-xs text-slate-500">PDF, image, or document file</span>
                    </label>
                  </div>
                  <Button type="button" onClick={uploadDocument} disabled={uploading} className="w-full">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload Document"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {employee.documents?.length ? (
                  <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
                    {employee.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded bg-slate-100 text-slate-600">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{doc.file_name}</p>
                            <p className="text-xs text-slate-500">{doc.doc_type}</p>
                          </div>
                        </div>
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${doc.file_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-brand-700 hover:underline"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    No documents uploaded yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
