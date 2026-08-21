"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Topbar } from "@/components/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { Plus, Trash2, Upload, Save, X } from "lucide-react";

/* ---------- Schema ---------- */
const schema = z.object({
  // Personal
  emp_code: z.string().optional().or(z.literal("")),
  prefix: z.string().optional().or(z.literal("")),
  first_name: z.string().min(1, "Required"),
  middle_name: z.string().optional().or(z.literal("")),
  last_name: z.string().min(1, "Required"),
  display_name: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  blood_group: z.string().optional().or(z.literal("")),
  marital_status: z.string().optional().or(z.literal("")),
  nationality: z.string().optional().or(z.literal("")),
  photo_url: z.string().optional().or(z.literal("")),
  // Contact
  work_email: z.string().email("Invalid email"),
  personal_email: z.string().email().optional().or(z.literal("")),
  mobile: z.string().optional().or(z.literal("")),
  alt_phone: z.string().optional().or(z.literal("")),
  // Job
  department_id: z.string().optional().or(z.literal("")),
  designation_id: z.string().optional().or(z.literal("")),
  employee_type: z.string(),
  date_of_joining: z.string().optional().or(z.literal("")),
  probation_end_date: z.string().optional().or(z.literal("")),
  confirmation_date: z.string().optional().or(z.literal("")),
  reporting_manager_id: z.string().optional().or(z.literal("")),
  work_location_id: z.string().optional().or(z.literal("")),
  shift_id: z.string().optional().or(z.literal("")),
  source_of_hire: z.string().optional().or(z.literal("")),
  tags: z.string().optional().or(z.literal("")),
  status: z.string(),
  exit_date: z.string().optional().or(z.literal("")),
  // Comp
  ctc: z.coerce.number().optional().or(z.literal("")),
  pay_frequency: z.string().optional().or(z.literal("")),
  // Bank
  bank_name: z.string().optional().or(z.literal("")),
  bank_account_no: z.string().optional().or(z.literal("")),
  bank_ifsc: z.string().optional().or(z.literal("")),
  bank_branch: z.string().optional().or(z.literal("")),
  bank_account_type: z.string().optional().or(z.literal("")),
  // Statutory
  pan_number: z.string().optional().or(z.literal("")),
  aadhaar_number: z.string().optional().or(z.literal("")),
  uan_number: z.string().optional().or(z.literal("")),
  pf_number: z.string().optional().or(z.literal("")),
  esi_number: z.string().optional().or(z.literal("")),
  passport_number: z.string().optional().or(z.literal("")),
  passport_expiry: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  // Nested
  addresses: z.array(z.object({
    address_type: z.enum(["Present","Permanent"]),
    line1: z.string().optional().or(z.literal("")),
    line2: z.string().optional().or(z.literal("")),
    city: z.string().optional().or(z.literal("")),
    state: z.string().optional().or(z.literal("")),
    country: z.string().optional().or(z.literal("")),
    pincode: z.string().optional().or(z.literal("")),
  })),
  education: z.array(z.object({
    id: z.string().optional().or(z.literal("")),
    institute: z.string().optional().or(z.literal("")),
    degree: z.string().optional().or(z.literal("")),
    specialization: z.string().optional().or(z.literal("")),
    year_from: z.coerce.number().optional().or(z.literal("")),
    year_to: z.coerce.number().optional().or(z.literal("")),
    grade: z.string().optional().or(z.literal("")),
    file_name: z.string().optional().or(z.literal("")),
    file_url: z.string().optional().or(z.literal("")),
  })),
  experience: z.array(z.object({
    id: z.string().optional().or(z.literal("")),
    company_name: z.string().optional().or(z.literal("")),
    designation: z.string().optional().or(z.literal("")),
    from_date: z.string().optional().or(z.literal("")),
    to_date: z.string().optional().or(z.literal("")),
    description: z.string().optional().or(z.literal("")),
    file_name: z.string().optional().or(z.literal("")),
    file_url: z.string().optional().or(z.literal("")),
  })),
  dependents: z.array(z.object({
    name: z.string().min(1),
    relationship_type: z.string().optional().or(z.literal("")),
    date_of_birth: z.string().optional().or(z.literal("")),
    gender: z.string().optional().or(z.literal("")),
    is_dependent: z.boolean().default(true),
  })),
  emergency_contacts: z.array(z.object({
    name: z.string().min(1),
    relationship_type: z.string().optional().or(z.literal("")),
    mobile: z.string().optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
  })),
});

export type EmployeeFormValues = z.infer<typeof schema>;

export const EMPLOYEE_FORM_DEFAULTS: EmployeeFormValues = {
  emp_code: "", first_name: "", last_name: "", work_email: "",
  employee_type: "Permanent", status: "Active", pay_frequency: "Monthly",
  addresses: [
    { address_type: "Present", line1:"", line2:"", city:"", state:"", country:"India", pincode:"" },
    { address_type: "Permanent", line1:"", line2:"", city:"", state:"", country:"India", pincode:"" },
  ],
  education: [{ institute:"", degree:"", specialization:"", grade:"" } as any],
  experience: [],
  dependents: [],
  emergency_contacts: [],
} as any;

/** Convert an EmployeeOut record (nulls, nested arrays) into form-safe defaultValues (no nulls). */
export function employeeToFormValues(e: any): EmployeeFormValues {
  const scalarKeys = [
    "emp_code","prefix","first_name","middle_name","last_name","display_name","gender",
    "date_of_birth","blood_group","marital_status","nationality","photo_url",
    "work_email","personal_email","mobile","alt_phone",
    "department_id","designation_id","employee_type","date_of_joining","probation_end_date",
    "confirmation_date","reporting_manager_id","work_location_id","shift_id","source_of_hire",
    "tags","status","exit_date","ctc","pay_frequency",
    "bank_name","bank_account_no","bank_ifsc","bank_branch","bank_account_type",
    "pan_number","aadhaar_number","uan_number","pf_number","esi_number",
    "passport_number","passport_expiry","notes",
  ];
  const out: any = {};
  for (const k of scalarKeys) out[k] = e[k] ?? "";
  out.addresses = (e.addresses?.length ? e.addresses : EMPLOYEE_FORM_DEFAULTS.addresses).map((a: any) => ({
    address_type: a.address_type || "Present", line1: a.line1 ?? "", line2: a.line2 ?? "",
    city: a.city ?? "", state: a.state ?? "", country: a.country ?? "", pincode: a.pincode ?? "",
  }));
  out.education = (e.education || []).map((x: any) => ({
    id: x.id ?? "", institute: x.institute ?? "", degree: x.degree ?? "", specialization: x.specialization ?? "",
    year_from: x.year_from ?? "", year_to: x.year_to ?? "", grade: x.grade ?? "",
    file_name: x.file_name ?? "", file_url: x.file_url ?? "",
  }));
  out.experience = (e.experience || []).map((x: any) => ({
    id: x.id ?? "", company_name: x.company_name ?? "", designation: x.designation ?? "",
    from_date: x.from_date ?? "", to_date: x.to_date ?? "", description: x.description ?? "",
    file_name: x.file_name ?? "", file_url: x.file_url ?? "",
  }));
  out.dependents = (e.dependents || []).map((x: any) => ({
    name: x.name ?? "", relationship_type: x.relationship_type ?? "",
    date_of_birth: x.date_of_birth ?? "", gender: x.gender ?? "", is_dependent: x.is_dependent ?? true,
  }));
  out.emergency_contacts = (e.emergency_contacts || []).map((x: any) => ({
    name: x.name ?? "", relationship_type: x.relationship_type ?? "", mobile: x.mobile ?? "", address: x.address ?? "",
  }));
  return out;
}

/* ---------- Field helpers ---------- */
function Field({ label, error, children }: any) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>{children}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

function TextField({ name, label, type = "text", placeholder, disabled }: any) {
  const { register, formState: { errors } } = useFormContext();
  const err = (errors as any)[name]?.message;
  return <Field label={label} error={err}><Input type={type} placeholder={placeholder} disabled={disabled} {...register(name)}/></Field>;
}

function SelectField({ name, label, children }: any) {
  const { register, formState: { errors } } = useFormContext();
  const err = (errors as any)[name]?.message;
  return <Field label={label} error={err}><Select {...register(name)}>{children}</Select></Field>;
}

/** Small inline upload control used next to PAN/Aadhaar/Passport — the file is
 * queued and uploaded (via the generic employee-documents endpoint) right after
 * the employee record itself is saved. */
function StatutoryDocUpload({ docType, file, existing, onSelect }: {
  docType: string; file?: File; existing?: { file_url: string; file_name: string };
  onSelect: (f: File) => void;
}) {
  const inputId = `statutory-doc-${docType}`;
  return (
    <div className="mt-1 text-xs">
      <input id={inputId} type="file" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); }}/>
      <label htmlFor={inputId} className="inline-flex items-center gap-1 text-brand-700 cursor-pointer hover:underline">
        <Upload className="h-3 w-3"/>
        {file ? file.name : existing ? "Replace document" : `Upload ${docType} document`}
      </label>
      {!file && existing && (
        <a href={`${process.env.NEXT_PUBLIC_API_URL || ""}${existing.file_url}`} target="_blank" rel="noreferrer" className="ml-2 text-slate-400 hover:text-slate-700 hover:underline">View current</a>
      )}
    </div>
  );
}

/** Per-row certificate/letter upload used in Education and Experience — same
 * deferred-until-save pattern as the photo/statutory uploads above. */
function RowFileUpload({ id, label, file, existingUrl, existingName, onSelect }: {
  id: string; label: string; file?: File; existingUrl?: string; existingName?: string;
  onSelect: (f: File) => void;
}) {
  return (
    <div className="text-xs">
      <input id={id} type="file" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); }}/>
      <label htmlFor={id} className="inline-flex items-center gap-1 text-brand-700 cursor-pointer hover:underline">
        <Upload className="h-3 w-3"/>
        {file ? file.name : existingUrl ? "Replace" : label}
      </label>
      {!file && existingUrl && (
        <a href={`${process.env.NEXT_PUBLIC_API_URL || ""}${existingUrl}`} target="_blank" rel="noreferrer" className="ml-2 text-slate-400 hover:text-slate-700 hover:underline">
          {existingName || "View"}
        </a>
      )}
    </div>
  );
}

/* ---------- Shared form used by both Add Employee and Edit Employee ---------- */
export function EmployeeForm({
  mode, employeeId, initialValues, linkUserId, defaultEmail,
}: {
  mode: "create" | "edit";
  employeeId?: string;
  initialValues?: EmployeeFormValues;
  /** When creating from Manage Accounts' "Create New Employee Profile" flow — the
   * login account to link to the newly created employee once it's saved. */
  linkUserId?: string;
  defaultEmail?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("personal");
  const [meta, setMeta] = useState<{depts: any[]; desigs: any[]; locs: any[]; shifts: any[]; managers: any[]}>({depts:[],desigs:[],locs:[],shifts:[],managers:[]});
  const [docType, setDocType] = useState("Aadhaar");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [statutoryFiles, setStatutoryFiles] = useState<Record<string, File>>({});
  const [eduFiles, setEduFiles] = useState<Record<number, File>>({});
  const [expFiles, setExpFiles] = useState<Record<number, File>>({});
  const [sameAsPresent, setSameAsPresent] = useState(false);

  useEffect(() => {
    Promise.all([api.departments(), api.designations(), api.locations(), api.shifts(), api.listEmployees({ page_size: 100 })])
      .then(([depts, desigs, locs, shifts, empRes]) => setMeta({ depts, desigs, locs, shifts, managers: empRes.items || [] }));
  }, []);

  const methods = useForm<EmployeeFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: (initialValues || (defaultEmail ? { ...EMPLOYEE_FORM_DEFAULTS, work_email: defaultEmail } : EMPLOYEE_FORM_DEFAULTS)) as any,
  });

  const eduFA = useFieldArray({ control: methods.control, name: "education" });
  const expFA = useFieldArray({ control: methods.control, name: "experience" });

  /** Removing a row shifts every later row's index down by one — re-key the
   * pending-file map so an already-selected file stays attached to its row. */
  function reindexAfterRemove(files: Record<number, File>, removedIndex: number): Record<number, File> {
    const next: Record<number, File> = {};
    for (const [k, v] of Object.entries(files)) {
      const idx = Number(k);
      if (idx === removedIndex) continue;
      next[idx > removedIndex ? idx - 1 : idx] = v;
    }
    return next;
  }
  function removeEdu(i: number) { eduFA.remove(i); setEduFiles(f => reindexAfterRemove(f, i)); }
  function removeExp(i: number) { expFA.remove(i); setExpFiles(f => reindexAfterRemove(f, i)); }
  const depFA = useFieldArray({ control: methods.control, name: "dependents" });
  const emgFA = useFieldArray({ control: methods.control, name: "emergency_contacts" });

  async function uploadPendingFiles(res: any) {
    if (docFile) {
      await api.uploadEmployeeDocument(res.id, docType, docFile);
      toast.success(`${docFile.name} uploaded`);
    }
    if (photoFile) await api.uploadEmployeePhoto(res.id, photoFile);
    for (const [type, file] of Object.entries(statutoryFiles)) {
      await api.uploadEmployeeDocument(res.id, type, file);
    }
    for (const [idxStr, file] of Object.entries(eduFiles)) {
      const row = res.education?.[Number(idxStr)];
      if (row?.id) await api.uploadEducationFile(res.id, row.id, file);
    }
    for (const [idxStr, file] of Object.entries(expFiles)) {
      const row = res.experience?.[Number(idxStr)];
      if (row?.id) await api.uploadExperienceFile(res.id, row.id, file);
    }
  }

  async function onSubmit(values: EmployeeFormValues, saveAndNew = false) {
    const clean: any = { ...values };
    Object.keys(clean).forEach(k => { if (clean[k] === "") clean[k] = null; });
    try {
      if (mode === "edit" && employeeId) {
        const res = await api.updateEmployee(employeeId, clean);
        await uploadPendingFiles(res);
        toast.success(`${res.first_name} ${res.last_name} updated`);
        router.push(`/employees/${res.id}`);
      } else {
        const res = await api.createEmployee(clean);
        await uploadPendingFiles(res);
        if (linkUserId) {
          await api.updateUserProfile(linkUserId, { email: res.work_email, employee_id: res.id });
          toast.success(`${res.first_name} ${res.last_name} created and linked to the login account`);
        } else {
          toast.success(`${res.first_name} ${res.last_name} created`);
        }
        if (saveAndNew && !linkUserId) {
          methods.reset();
          setDocFile(null);
          setPhotoFile(null);
          setStatutoryFiles({});
          setEduFiles({});
          setExpFiles({});
        } else {
          router.push(`/employees/${res.id}`);
        }
      }
    } catch (e: any) { toast.error(e.message); }
  }

  const tabs = [
    ["personal","Personal"],["contact","Contact"],["family","Family"],
    ["job","Job"],["comp","Compensation & Statutory (India)"],
    ["education","Education"],["experience","Past Experience"],["docs","Documents"],
  ];

  return (
    <>
      <Topbar title={mode === "edit" ? "Edit Employee" : "New Employee"}/>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(v => onSubmit(v, false))} className="p-4 lg:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{mode === "edit" ? "Edit Employee" : linkUserId ? "Create Employee Profile" : "Add Employee"}</h2>
              <p className="text-sm text-slate-500">
                {linkUserId
                  ? "This profile will be linked to the existing login account once saved."
                  : "Fill the form across tabs. Required fields are marked."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => router.back()}><X className="h-4 w-4"/>Cancel</Button>
              {mode === "create" && !linkUserId && (
                <Button type="button" variant="outline" onClick={methods.handleSubmit(v => onSubmit(v, true))}><Save className="h-4 w-4"/>Save & New</Button>
              )}
              <Button type="submit"><Save className="h-4 w-4"/>Save</Button>
            </div>
          </div>

          <Card>
            <CardContent>
              <Tabs value={tab} onValueChange={setTab} defaultValue="personal">
                <TabsList>
                  {tabs.map(([v,l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
                </TabsList>

                {/* PERSONAL */}
                <TabsContent value="personal">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-100 border border-slate-200 grid place-items-center shrink-0">
                      {photoFile ? (
                        <img src={URL.createObjectURL(photoFile)} alt="Photo preview" className="h-full w-full object-cover"/>
                      ) : methods.watch("photo_url") ? (
                        <img src={`${process.env.NEXT_PUBLIC_API_URL || ""}${methods.watch("photo_url")}`} alt="Photo" className="h-full w-full object-cover"/>
                      ) : (
                        <Upload className="h-6 w-6 text-slate-300"/>
                      )}
                    </div>
                    <div>
                      <input
                        id="employee-photo-file"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                      />
                      <label htmlFor="employee-photo-file" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 cursor-pointer hover:underline">
                        <Upload className="h-3.5 w-3.5"/>{photoFile ? photoFile.name : "Upload Photo"}
                      </label>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {photoFile ? "Uploaded when you save." : "JPG or PNG."}
                      </p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <TextField
                      name="emp_code"
                      label="Employee ID"
                      placeholder={mode === "create" ? "Auto-generated on save" : ""}
                      disabled={mode === "create"}
                    />
                    <SelectField name="prefix" label="Prefix">
                      <option value="">—</option><option>Mr</option><option>Ms</option><option>Mrs</option><option>Dr</option>
                    </SelectField>
                    <div/>
                    <TextField name="first_name" label="First Name *"/>
                    <TextField name="middle_name" label="Middle Name"/>
                    <TextField name="last_name" label="Last Name *"/>
                    <TextField name="display_name" label="Display Name"/>
                    <SelectField name="gender" label="Gender">
                      <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
                    </SelectField>
                    <TextField name="date_of_birth" label="Date of Birth" type="date"/>
                    <SelectField name="blood_group" label="Blood Group">
                      <option value="">—</option>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b=> <option key={b}>{b}</option>)}
                    </SelectField>
                    <SelectField name="marital_status" label="Marital Status">
                      <option value="">—</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
                    </SelectField>
                    <TextField name="nationality" label="Nationality" placeholder="Indian"/>
                  </div>
                </TabsContent>

                {/* CONTACT */}
                <TabsContent value="contact">
                  <div className="grid md:grid-cols-2 gap-4">
                    <TextField name="work_email" label="Work Email *" type="email"/>
                    <TextField name="personal_email" label="Personal Email" type="email"/>
                    <TextField name="mobile" label="Mobile" placeholder="+91 …"/>
                    <TextField name="alt_phone" label="Alternate Phone"/>
                  </div>
                  <div className="mt-6 grid md:grid-cols-2 gap-6">
                    {[0,1].map(i => (
                      <div key={i} className="space-y-3 p-4 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-900">{i===0?"Present Address":"Permanent Address"}</div>
                          {i === 1 && (
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={sameAsPresent}
                                onChange={(e) => {
                                  setSameAsPresent(e.target.checked);
                                  if (e.target.checked) {
                                    const present = methods.getValues("addresses.0");
                                    (["line1","line2","city","state","country","pincode"] as const).forEach(f =>
                                      methods.setValue(`addresses.1.${f}`, present[f])
                                    );
                                  }
                                }}
                              />
                              Same as Present Address
                            </label>
                          )}
                        </div>
                        <TextField name={`addresses.${i}.line1`} label="Address Line 1" disabled={i===1 && sameAsPresent}/>
                        <TextField name={`addresses.${i}.line2`} label="Address Line 2" disabled={i===1 && sameAsPresent}/>
                        <div className="grid grid-cols-2 gap-3">
                          <TextField name={`addresses.${i}.city`} label="City" disabled={i===1 && sameAsPresent}/>
                          <TextField name={`addresses.${i}.state`} label="State" disabled={i===1 && sameAsPresent}/>
                          <TextField name={`addresses.${i}.country`} label="Country" disabled={i===1 && sameAsPresent}/>
                          <TextField name={`addresses.${i}.pincode`} label="Pincode" disabled={i===1 && sameAsPresent}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* JOB */}
                <TabsContent value="job">
                  <div className="grid md:grid-cols-3 gap-4">
                    <SelectField name="department_id" label="Department">
                      <option value="">—</option>
                      {meta.depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </SelectField>
                    <SelectField name="designation_id" label="Designation">
                      <option value="">—</option>
                      {meta.desigs.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                    </SelectField>
                    <SelectField name="employee_type" label="Employee Type">
                      {["Permanent","Contract","Intern","Trainee","Consultant","Freelancer"].map(t=> <option key={t}>{t}</option>)}
                    </SelectField>
                    <TextField name="date_of_joining" label="Date of Joining" type="date"/>
                    <TextField name="probation_end_date" label="Probation End" type="date"/>
                    <TextField name="confirmation_date" label="Confirmation Date" type="date"/>
                    <SelectField name="reporting_manager_id" label="Reporting Manager">
                      <option value="">—</option>
                      {meta.managers.filter(m => m.id !== employeeId).map(m => <option key={m.id} value={m.id}>{m.emp_code} - {m.first_name} {m.last_name}</option>)}
                    </SelectField>
                    <SelectField name="work_location_id" label="Work Location">
                      <option value="">—</option>{meta.locs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </SelectField>
                    <SelectField name="shift_id" label="Shift">
                      <option value="">—</option>{meta.shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time}-{s.end_time})</option>)}
                    </SelectField>
                    <SelectField name="source_of_hire" label="Source of Hire">
                      <option value="">—</option>{["Referral","LinkedIn","Naukri","Indeed","Direct","Agency","Walk-in"].map(s=> <option key={s}>{s}</option>)}
                    </SelectField>
                    <TextField name="tags" label="Tags (comma-separated)"/>
                    <SelectField name="status" label="Status">
                      {["Active","On Leave","Inactive","Resigned","Terminated"].map(s=> <option key={s}>{s}</option>)}
                    </SelectField>
                    <TextField name="exit_date" label="Exit Date" type="date"/>
                  </div>
                </TabsContent>

                {/* COMP */}
                <TabsContent value="comp">
                  <div className="grid md:grid-cols-3 gap-4">
                    <TextField name="ctc" label="CTC (Annual)" type="number"/>
                    <SelectField name="pay_frequency" label="Pay Frequency">
                      {["Monthly","Weekly","Bi-Weekly","Hourly"].map(p=> <option key={p}>{p}</option>)}
                    </SelectField>
                  </div>
                  <div className="mt-6">
                    <div className="text-sm font-semibold text-slate-900 mb-3">Bank Details</div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <TextField name="bank_name" label="Bank Name"/>
                      <TextField name="bank_account_no" label="Account Number"/>
                      <TextField name="bank_ifsc" label="IFSC Code"/>
                      <TextField name="bank_branch" label="Branch"/>
                      <SelectField name="bank_account_type" label="Account Type">
                        <option value="">—</option><option>Savings</option><option>Current</option>
                      </SelectField>
                    </div>
                  </div>
                  <div className="mt-6">
                    <div className="text-sm font-semibold text-slate-900 mb-3">Statutory (India)</div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <TextField name="pan_number" label="PAN"/>
                        <StatutoryDocUpload docType="PAN" file={statutoryFiles.PAN}
                          existing={(initialValues as any)?.documents?.find?.((d: any) => d.doc_type === "PAN")}
                          onSelect={(f) => setStatutoryFiles(s => ({ ...s, PAN: f }))}/>
                      </div>
                      <div>
                        <TextField name="aadhaar_number" label="Aadhaar"/>
                        <StatutoryDocUpload docType="Aadhaar" file={statutoryFiles.Aadhaar}
                          existing={(initialValues as any)?.documents?.find?.((d: any) => d.doc_type === "Aadhaar")}
                          onSelect={(f) => setStatutoryFiles(s => ({ ...s, Aadhaar: f }))}/>
                      </div>
                      <TextField name="uan_number" label="UAN"/>
                      <TextField name="pf_number" label="PF Number"/>
                      <TextField name="esi_number" label="ESI Number"/>
                      <div>
                        <TextField name="passport_number" label="Passport Number"/>
                        <StatutoryDocUpload docType="Passport" file={statutoryFiles.Passport}
                          existing={(initialValues as any)?.documents?.find?.((d: any) => d.doc_type === "Passport")}
                          onSelect={(f) => setStatutoryFiles(s => ({ ...s, Passport: f }))}/>
                      </div>
                      <TextField name="passport_expiry" label="Passport Expiry" type="date"/>
                    </div>
                  </div>
                </TabsContent>

                {/* EDUCATION */}
                <TabsContent value="education">
                  <div className="space-y-3">
                    {eduFA.fields.map((f, i) => (
                      <div key={f.id} className="p-4 border border-slate-200 rounded-lg grid md:grid-cols-6 gap-3 relative">
                        <div className="md:col-span-2"><TextField name={`education.${i}.institute`} label="Institute"/></div>
                        <TextField name={`education.${i}.degree`} label="Degree"/>
                        <TextField name={`education.${i}.specialization`} label="Specialization"/>
                        <TextField name={`education.${i}.year_from`} label="From" type="number"/>
                        <TextField name={`education.${i}.year_to`} label="To" type="number"/>
                        <TextField name={`education.${i}.grade`} label="Grade"/>
                        <div className="md:col-span-6">
                          <RowFileUpload
                            id={`edu-file-${f.id}`}
                            label="Upload Certificate"
                            file={eduFiles[i]}
                            existingUrl={methods.watch(`education.${i}.file_url`)}
                            existingName={methods.watch(`education.${i}.file_name`)}
                            onSelect={(file) => setEduFiles(s => ({ ...s, [i]: file }))}
                          />
                        </div>
                        <button type="button" onClick={() => removeEdu(i)} className="absolute top-2 right-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => eduFA.append({ institute:"", degree:"", specialization:"", grade:"" } as any)}><Plus className="h-4 w-4"/>Add Education</Button>
                  </div>
                </TabsContent>

                {/* FAMILY + EXPERIENCE */}
                <TabsContent value="family">
                  <div className="text-sm font-semibold text-slate-900 mb-3">Dependents</div>
                  <div className="space-y-3">
                    {depFA.fields.map((f, i) => (
                      <div key={f.id} className="p-4 border border-slate-200 rounded-lg grid md:grid-cols-5 gap-3 relative">
                        <TextField name={`dependents.${i}.name`} label="Name *"/>
                        <SelectField name={`dependents.${i}.relationship_type`} label="Relationship">
                          <option value="">—</option>{["Spouse","Child","Father","Mother","Sibling","Other"].map(r=> <option key={r}>{r}</option>)}
                        </SelectField>
                        <TextField name={`dependents.${i}.date_of_birth`} label="Date of Birth" type="date"/>
                        <SelectField name={`dependents.${i}.gender`} label="Gender">
                          <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
                        </SelectField>
                        <button type="button" onClick={() => depFA.remove(i)} className="absolute top-2 right-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => depFA.append({ name:"", relationship_type:"", date_of_birth:"", gender:"", is_dependent: true } as any)}><Plus className="h-4 w-4"/>Add Dependent</Button>
                  </div>

                  <div className="text-sm font-semibold text-slate-900 mt-8 mb-3">Emergency Contacts</div>
                  <div className="space-y-3">
                    {emgFA.fields.map((f, i) => (
                      <div key={f.id} className="p-4 border border-slate-200 rounded-lg grid md:grid-cols-4 gap-3 relative">
                        <TextField name={`emergency_contacts.${i}.name`} label="Name *"/>
                        <TextField name={`emergency_contacts.${i}.relationship_type`} label="Relationship"/>
                        <TextField name={`emergency_contacts.${i}.mobile`} label="Mobile"/>
                        <TextField name={`emergency_contacts.${i}.address`} label="Address"/>
                        <button type="button" onClick={() => emgFA.remove(i)} className="absolute top-2 right-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => emgFA.append({ name:"", relationship_type:"", mobile:"", address:"" } as any)}><Plus className="h-4 w-4"/>Add Contact</Button>
                  </div>
                </TabsContent>

                {/* PAST EXPERIENCE */}
                <TabsContent value="experience">
                  <div className="space-y-3">
                    {expFA.fields.map((f, i) => (
                      <div key={f.id} className="p-4 border border-slate-200 rounded-lg grid md:grid-cols-4 gap-3 relative">
                        <TextField name={`experience.${i}.company_name`} label="Company"/>
                        <TextField name={`experience.${i}.designation`} label="Designation"/>
                        <TextField name={`experience.${i}.from_date`} label="From" type="date"/>
                        <TextField name={`experience.${i}.to_date`} label="To" type="date"/>
                        <div className="md:col-span-4">
                          <Label>Description</Label>
                          <Textarea {...methods.register(`experience.${i}.description`)}/>
                        </div>
                        <div className="md:col-span-4">
                          <RowFileUpload
                            id={`exp-file-${f.id}`}
                            label="Upload Relieving/Experience Letter"
                            file={expFiles[i]}
                            existingUrl={methods.watch(`experience.${i}.file_url`)}
                            existingName={methods.watch(`experience.${i}.file_name`)}
                            onSelect={(file) => setExpFiles(s => ({ ...s, [i]: file }))}
                          />
                        </div>
                        <button type="button" onClick={() => removeExp(i)} className="absolute top-2 right-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => expFA.append({ company_name:"", designation:"", from_date:"", to_date:"", description:"" } as any)}><Plus className="h-4 w-4"/>Add Experience</Button>
                  </div>
                </TabsContent>

                {/* DOCS */}
                <TabsContent value="docs">
                  <input
                    id="employee-document-file-form"
                    type="file"
                    className="sr-only"
                    onChange={(event) => {
                      const selected = event.target.files?.[0] ?? null;
                      setDocFile(selected);
                      if (selected) {
                        const lower = selected.name.toLowerCase();
                        if (lower.includes("aadhaar")) setDocType("Aadhaar");
                        else if (lower.includes("pan")) setDocType("PAN");
                        else if (lower.includes("passport")) setDocType("Passport");
                        else if (lower.includes("resume")) setDocType("Resume");
                        else if (lower.includes("offer")) setDocType("OfferLetter");
                        else if (lower.includes("certificate")) setDocType("Certificate");
                      }
                    }}
                  />
                  <label
                    htmlFor="employee-document-file-form"
                    className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-200 p-6 text-center transition hover:border-brand-400 hover:bg-brand-50/40"
                  >
                    <Upload className="h-10 w-10 mx-auto text-slate-400"/>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {docFile ? docFile.name : "Documents are uploaded after saving the employee."}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {docFile ? `${docType} selected. Save the employee to upload this document.` : "Click here to choose Aadhaar, PAN, Passport, Resume, Offer Letter, or Certificate."}
                    </p>
                  </label>
                  <div className="mt-4">
                    <Label>Notes</Label>
                    <Textarea rows={5} {...methods.register("notes")} placeholder="Any internal notes about this employee…"/>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </form>
      </FormProvider>
    </>
  );
}
